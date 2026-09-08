<script setup>
/**
 * Lecteur — la page affichée sur les téléviseurs.
 *
 * Priorités, dans l'ordre : ne jamais s'arrêter, rester à jour, démarrer vite.
 *
 * Adresses acceptées :
 *   /visionner/<slug>       ou  /visionner/?slug=<slug>   diaporama d'un écran
 *   /visionner/slide/<id>   ou  /visionner/?id=<id>       un slide isolé
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";

import { ecrans as apiEcrans, slides as apiSlides, liens as apiLiens } from "@/core/api.js";
import { eligibleSlides, dureeDuCycle } from "@/core/playlist.js";
import { isInTimeRange } from "@/core/schedule.js";
import { creerLiaison } from "@/core/realtime.js";

import SlideRender from "@/components/slides/SlideRender.vue";
import EcranAttente from "@/components/slides/EcranAttente.vue";

const RECALCUL_MS = 60000; // une plage horaire peut s'ouvrir en plein cycle
const RAFRAICHISSEMENT_MS = 600000; // rechargement des contenus
const RECHARGEMENT_QUOTIDIEN_H = 4; // heure creuse

const ecran = shallowRef(null);
const slides = shallowRef([]);
const liens = shallowRef([]);
const cycle = shallowRef([]);
const courant = shallowRef(null);
const slideSeul = shallowRef(null);
const messageAttente = ref("Aucun contenu à diffuser pour le moment.");

const index = ref(0);
/** Slides écartés du cycle parce que leur rendu a échoué. */
const enErreur = ref(new Set());

let minuteur = null;
const minuteries = [];
let liaison = null;

/* -------------------------------------------------------------------------- */

const barreLaterale = computed(() => {
  if (!ecran.value?.show_side) return null;
  if (!isInTimeRange(ecran.value.side_times, new Date())) return null;
  return ecran.value.side_url || "about:blank";
});

function cible() {
  const params = new URLSearchParams(location.search);
  const parId = params.get("id");
  if (parId) return { slideId: Number(parId) };

  const cheminSlide = location.pathname.match(/\/visionner\/slide\/(\d+)/);
  if (cheminSlide) return { slideId: Number(cheminSlide[1]) };

  const parSlug = params.get("slug");
  if (parSlug) return { slug: parSlug };

  const chemin = location.pathname.match(/\/visionner\/([^/?#]+)/);
  if (chemin) return { slug: decodeURIComponent(chemin[1]) };

  return {};
}

/* ---- Diaporama ----------------------------------------------------------- */

function recalculerCycle() {
  if (!ecran.value) return { change: false };
  const disponibles = slides.value.filter((s) => !enErreur.value.has(s.id));
  const suivant = eligibleSlides(ecran.value, disponibles, liens.value, new Date());
  const inchange =
    suivant.length === cycle.value.length && suivant.every((s, i) => s.id === cycle.value[i]?.id);
  cycle.value = suivant;
  if (!inchange && index.value >= suivant.length) index.value = 0;
  return { change: !inchange };
}

function avancer(pas = 1) {
  clearTimeout(minuteur);

  if (cycle.value.length === 0) {
    courant.value = null;
    minuteur = setTimeout(() => {
      recalculerCycle();
      avancer(0);
    }, RECALCUL_MS);
    return;
  }

  if (pas !== 0) {
    index.value = (index.value + pas + cycle.value.length) % cycle.value.length;
    // Fin de tour : on recalcule avant de repartir.
    if (index.value === 0 && pas > 0) recalculerCycle();
  }
  if (index.value >= cycle.value.length) index.value = 0;

  const slide = cycle.value[index.value];
  if (!slide) return;

  courant.value = slide;
  document.title = `${slide.name} — ${ecran.value?.name ?? ""}`;

  const duree = Math.max(1, Number(slide.duration) || 1) * 1000;
  minuteur = setTimeout(() => avancer(1), duree);
}

/** Un slide dont le rendu échoue est écarté, et le diaporama continue. */
function surErreurDeRendu({ slide }) {
  if (!slide) return;
  enErreur.value = new Set([...enErreur.value, slide.id]);
  recalculerCycle();
  avancer(0);
}

/* ---- Playlist audio ------------------------------------------------------ */

/** Mélange de Fisher-Yates : un tri à comparateur aléatoire est biaisé. */
function melanger(tableau) {
  const out = [...tableau];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function demarrerPlaylist() {
  if (!ecran.value?.playlist_on || !ecran.value.playlist) return;

  const morceaux = melanger(
    ecran.value.playlist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
  if (!morceaux.length) return;

  const lecteur = document.createElement("audio");
  lecteur.style.display = "none";
  lecteur.volume = Math.min(1, Math.max(0, Number(ecran.value.playlist_volume ?? 50) / 100));
  document.body.append(lecteur);

  let i = 0;
  const suivant = () => {
    lecteur.src = morceaux[i % morceaux.length];
    i++;
    lecteur.play().catch(() => {
      // Lecture auto refusée : on retentera au premier geste de l'utilisateur.
      document.addEventListener("click", () => lecteur.play().catch(() => {}), { once: true });
    });
  };
  lecteur.addEventListener("ended", suivant);
  lecteur.addEventListener("error", () => setTimeout(suivant, 2000));
  suivant();
}

/* ---- Clavier et pilotage à distance -------------------------------------- */

function auClavier(e) {
  if (e.code === "ArrowRight") avancer(1);
  else if (e.code === "ArrowLeft") avancer(-1);
}

function signalDeVie() {
  liaison?.envoyer({
    name: "pong",
    id: ecran.value?.id,
    slug: ecran.value?.slug,
    slideCourant: courant.value?.id ?? null,
    nbEligibles: cycle.value.length,
    dureeCycle: dureeDuCycle(cycle.value),
  });
}

function brancherLiaison() {
  liaison = creerLiaison({
    slug: ecran.value?.slug,
    onEtat: ({ etat }) => document.body.setAttribute("data-liaison", etat),
    onMessage: (msg) => {
      if (msg.id !== undefined && Number(msg.id) !== ecran.value?.id) return;
      switch (msg.name) {
        case "refresh-ecran":
          // Un ordre de rechargement recharge la page, une seule fois.
          location.reload();
          break;
        case "avancer-ecran":
          avancer(1);
          break;
        case "reculer-ecran":
          avancer(-1);
          break;
        case "afficher-slide": {
          const slide = slides.value.find((s) => s.id === Number(msg.slideId));
          if (slide) {
            clearTimeout(minuteur);
            courant.value = slide;
            minuteur = setTimeout(() => avancer(1), (slide.duration || 10) * 1000);
          }
          break;
        }
        case "ping":
          signalDeVie();
          break;
        default:
          break;
      }
    },
  });

  minuteries.push(setInterval(signalDeVie, 30000));
}

/** Rechargement quotidien en heure creuse, pour récupérer les mises à jour. */
function planifierRechargementQuotidien() {
  const maintenant = new Date();
  const heure = new Date(maintenant);
  heure.setHours(RECHARGEMENT_QUOTIDIEN_H, Math.floor(Math.random() * 30), 0, 0);
  if (heure <= maintenant) heure.setDate(heure.getDate() + 1);
  minuteries.push(setTimeout(() => location.reload(), heure - maintenant));
}

/* ---- Démarrage ----------------------------------------------------------- */

onMounted(async () => {
  const { slug, slideId } = cible();

  try {
    if (slideId) {
      const slide = await apiSlides.get(slideId);
      if (!slide) throw new Error("Slide introuvable.");
      document.title = slide.name;
      slideSeul.value = slide;
      return;
    }

    if (!slug) throw new Error("Aucun écran demandé (paramètre « slug » manquant).");

    const [e, s, l] = await Promise.all([apiEcrans.get(slug), apiSlides.list(), apiLiens.list()]);
    if (!e) throw new Error(`Écran « ${slug} » introuvable.`);

    ecran.value = e;
    slides.value = s;
    liens.value = l;
    document.title = e.name || "Écran";

    recalculerCycle();
    avancer(0);

    demarrerPlaylist();
    document.addEventListener("keyup", auClavier);
    brancherLiaison();
    planifierRechargementQuotidien();

    // Réévaluation périodique : plages horaires, priorités, dates.
    minuteries.push(
      setInterval(() => {
        // Force le recalcul de la barre latérale, qui dépend de l'heure.
        ecran.value = { ...ecran.value };
        const { change } = recalculerCycle();
        if (change && courant.value && !cycle.value.some((x) => x.id === courant.value.id)) {
          avancer(0);
        }
      }, RECALCUL_MS)
    );

    // Rechargement des données : les contenus modifiés dans l'administration
    // arrivent sans intervention.
    minuteries.push(
      setInterval(async () => {
        try {
          const [s2, l2, e2] = await Promise.all([
            apiSlides.list(),
            apiLiens.list(),
            apiEcrans.get(slug),
          ]);
          slides.value = s2;
          liens.value = l2;
          if (e2) ecran.value = e2;
          enErreur.value = new Set();
          recalculerCycle();
        } catch (err) {
          console.warn("[lecteur] rafraîchissement des données impossible", err);
        }
      }, RAFRAICHISSEMENT_MS)
    );
  } catch (e) {
    console.error("[lecteur]", e);
    messageAttente.value = e.message;
    // On retente : l'erreur peut être un simple incident réseau au démarrage.
    minuteries.push(setTimeout(() => location.reload(), 60000));
  }
});

onBeforeUnmount(() => {
  clearTimeout(minuteur);
  for (const m of minuteries) {
    clearTimeout(m);
    clearInterval(m);
  }
  document.removeEventListener("keyup", auClavier);
  liaison?.fermer();
});
</script>

<template>
  <iframe v-if="barreLaterale" class="side" :src="barreLaterale" frameborder="0"></iframe>

  <div class="slides">
    <!-- Un slide isolé : ni défilement, ni transition. -->
    <SlideRender v-if="slideSeul" :slide="slideSeul" />

    <template v-else>
      <Transition name="fondu">
        <SlideRender
          v-if="courant"
          :key="courant.id"
          :slide="courant"
          progression
          @erreur="surErreurDeRendu"
        />
        <EcranAttente v-else :message="messageAttente" />
      </Transition>
    </template>
  </div>
</template>

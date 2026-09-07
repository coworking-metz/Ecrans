/**
 * Lecteur — la page affichée sur les téléviseurs.
 *
 * Priorités, dans l'ordre : ne jamais s'arrêter, rester à jour, démarrer vite.
 * Ce point d'entrée ne charge ni Bulma, ni l'éditeur de texte, ni les vues
 * d'administration.
 *
 * Adresses acceptées :
 *   /visionner/<slug>        ou  /visionner/?slug=<slug>   -> diaporama d'un écran
 *   /visionner/slide/<id>    ou  /visionner/?id=<id>       -> un slide isolé
 */

import "./render/slide.css";
import "./styles/player.css";

import { ecrans as apiEcrans, slides as apiSlides, liens as apiLiens } from "./core/api.js";
import { eligibleSlides, dureeDuCycle } from "./core/playlist.js";
import { isInTimeRange } from "./core/schedule.js";
import { renderSlide, renderAttente } from "./render/index.js";
import { creerLiaison } from "./core/realtime.js";

const RECALCUL_MS = 60000; // une plage horaire peut s'ouvrir en plein cycle
const RECHARGEMENT_QUOTIDIEN_H = 4; // heure creuse

const etat = {
  ecran: null,
  slides: [],
  liens: [],
  cycle: [],
  index: 0,
  courant: null,
  renduCourant: null,
  minuteur: null,
  /** Slides écartés du cycle courant parce que leur rendu a échoué. */
  enErreur: new Set(),
};

const racine = document.getElementById("lecteur");
const conteneurSlides = document.createElement("div");
conteneurSlides.className = "slides";
let cadreLateral = null;

/* -------------------------------------------------------------------------- */
/*  Lecture de l'adresse                                                       */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Diaporama                                                                  */
/* -------------------------------------------------------------------------- */

function recalculerCycle() {
  const disponibles = etat.slides.filter((s) => !etat.enErreur.has(s.id));
  const cycle = eligibleSlides(etat.ecran, disponibles, etat.liens, new Date());
  const inchange =
    cycle.length === etat.cycle.length && cycle.every((s, i) => s.id === etat.cycle[i]?.id);
  etat.cycle = cycle;
  if (!inchange && etat.index >= cycle.length) etat.index = 0;
  return { cycle, change: !inchange };
}

function afficher(slide) {
  etat.renduCourant?.arreter?.();

  const precedent = conteneurSlides.firstElementChild;
  const rendu = slide
    ? renderSlide(slide, { progression: true })
    : renderAttente("Aucun contenu à diffuser pour le moment.");

  if (slide && rendu.erreur) {
    // Le slide est écarté du cycle et le diaporama continue : en v1, une erreur
    // de rendu pouvait figer l'écran jusqu'au prochain rechargement manuel.
    console.error("[lecteur] slide %s écarté du cycle", slide.id);
    etat.enErreur.add(slide.id);
    recalculerCycle();
    return avancer(0);
  }

  rendu.element.classList.add("entre");
  conteneurSlides.append(rendu.element);
  requestAnimationFrame(() => rendu.element.classList.remove("entre"));

  if (precedent) {
    precedent.classList.add("sort");
    setTimeout(() => precedent.remove(), 600);
  }

  etat.courant = slide;
  etat.renduCourant = rendu;
  rendu.demarrer?.();

  document.title = slide ? `${slide.name} — ${etat.ecran?.name ?? ""}` : etat.ecran?.name ?? "Écran";
}

function avancer(pas = 1) {
  clearTimeout(etat.minuteur);

  if (etat.cycle.length === 0) {
    afficher(null);
    etat.minuteur = setTimeout(() => {
      recalculerCycle();
      avancer(0);
    }, RECALCUL_MS);
    return;
  }

  if (pas !== 0) {
    etat.index = (etat.index + pas + etat.cycle.length) % etat.cycle.length;
    // Fin de tour : on recalcule avant de repartir.
    if (etat.index === 0 && pas > 0) recalculerCycle();
  }
  if (etat.index >= etat.cycle.length) etat.index = 0;

  const slide = etat.cycle[etat.index];
  if (!slide) return;
  afficher(slide);

  const duree = Math.max(1, Number(slide.duration) || 1) * 1000;
  etat.minuteur = setTimeout(() => avancer(1), duree);
}

/* -------------------------------------------------------------------------- */
/*  Barre latérale                                                             */
/* -------------------------------------------------------------------------- */

function majBarreLaterale() {
  const visible = !!etat.ecran?.show_side && isInTimeRange(etat.ecran.side_times, new Date());

  if (visible && !cadreLateral) {
    cadreLateral = document.createElement("iframe");
    cadreLateral.className = "side";
    cadreLateral.src = etat.ecran.side_url || "about:blank";
    cadreLateral.setAttribute("frameborder", "0");
    racine.prepend(cadreLateral);
  } else if (!visible && cadreLateral) {
    cadreLateral.remove();
    cadreLateral = null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Playlist audio                                                             */
/* -------------------------------------------------------------------------- */

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
  if (!etat.ecran?.playlist_on || !etat.ecran.playlist) return;

  const morceaux = melanger(
    etat.ecran.playlist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
  );
  if (!morceaux.length) return;

  const lecteur = document.createElement("audio");
  lecteur.style.display = "none";
  lecteur.volume = Math.min(1, Math.max(0, Number(etat.ecran.playlist_volume ?? 50) / 100));
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

/* -------------------------------------------------------------------------- */
/*  Clavier et pilotage à distance                                             */
/* -------------------------------------------------------------------------- */

function brancherClavier() {
  document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowRight") avancer(1);
    else if (e.code === "ArrowLeft") avancer(-1);
  });
}

function brancherLiaison() {
  const liaison = creerLiaison({
    slug: etat.ecran?.slug,
    onEtat: ({ etat: e }) => document.body.setAttribute("data-liaison", e),
    onMessage: (message) => {
      if (message.id !== undefined && Number(message.id) !== etat.ecran?.id) return;
      switch (message.name) {
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
          const slide = etat.slides.find((s) => s.id === Number(message.slideId));
          if (slide) {
            clearTimeout(etat.minuteur);
            afficher(slide);
            etat.minuteur = setTimeout(() => avancer(1), (slide.duration || 10) * 1000);
          }
          break;
        }
        case "ping":
          liaison.envoyer({
            name: "pong",
            id: etat.ecran?.id,
            slug: etat.ecran?.slug,
            slideCourant: etat.courant?.id ?? null,
            nbEligibles: etat.cycle.length,
            dureeCycle: dureeDuCycle(etat.cycle),
          });
          break;
        default:
          break;
      }
    },
  });

  // Signal de vie régulier : alimente l'indicateur de liaison côté administration.
  setInterval(() => {
    liaison.envoyer({
      name: "pong",
      id: etat.ecran?.id,
      slug: etat.ecran?.slug,
      slideCourant: etat.courant?.id ?? null,
      nbEligibles: etat.cycle.length,
    });
  }, 30000);
}

/** Rechargement quotidien en heure creuse, pour récupérer les mises à jour. */
function planifierRechargementQuotidien() {
  const maintenant = new Date();
  const cible = new Date(maintenant);
  cible.setHours(RECHARGEMENT_QUOTIDIEN_H, Math.floor(Math.random() * 30), 0, 0);
  if (cible <= maintenant) cible.setDate(cible.getDate() + 1);
  setTimeout(() => location.reload(), cible - maintenant);
}

/* -------------------------------------------------------------------------- */
/*  Démarrage                                                                  */
/* -------------------------------------------------------------------------- */

async function demarrer() {
  racine.append(conteneurSlides);
  const { slug, slideId } = cible();

  try {
    /* --- Un slide isolé ------------------------------------------------- */
    if (slideId) {
      const slide = await apiSlides.get(slideId);
      if (!slide) throw new Error("Slide introuvable.");
      document.title = slide.name;
      const rendu = renderSlide(slide);
      conteneurSlides.append(rendu.element);
      rendu.demarrer?.();
      return;
    }

    /* --- Le diaporama d'un écran ---------------------------------------- */
    if (!slug) throw new Error("Aucun écran demandé (paramètre `slug` manquant).");

    const [ecran, tousSlides, tousLiens] = await Promise.all([
      apiEcrans.get(slug),
      apiSlides.list(),
      apiLiens.list(),
    ]);
    if (!ecran) throw new Error(`Écran « ${slug} » introuvable.`);

    etat.ecran = ecran;
    etat.slides = tousSlides;
    etat.liens = tousLiens;
    document.title = ecran.name || "Écran";

    majBarreLaterale();
    recalculerCycle();
    avancer(0);

    demarrerPlaylist();
    brancherClavier();
    brancherLiaison();
    planifierRechargementQuotidien();

    // Réévaluation périodique : plages horaires, priorités, dates.
    setInterval(() => {
      majBarreLaterale();
      const { change } = recalculerCycle();
      // Si le slide courant n'est plus éligible, on passe au suivant sans attendre.
      if (change && etat.courant && !etat.cycle.some((s) => s.id === etat.courant.id)) {
        avancer(0);
      }
    }, RECALCUL_MS);

    // Rechargement complet des données toutes les 10 minutes : les contenus
    // modifiés dans l'administration arrivent sans intervention.
    setInterval(async () => {
      try {
        const [s, l, e] = await Promise.all([
          apiSlides.list(),
          apiLiens.list(),
          apiEcrans.get(slug),
        ]);
        etat.slides = s;
        etat.liens = l;
        if (e) etat.ecran = e;
        etat.enErreur.clear();
        majBarreLaterale();
        recalculerCycle();
      } catch (err) {
        console.warn("[lecteur] rafraîchissement des données impossible", err);
      }
    }, 600000);
  } catch (e) {
    console.error("[lecteur]", e);
    const rendu = renderAttente(e.message);
    conteneurSlides.append(rendu.element);
    // On retente : l'erreur peut être un simple incident réseau au démarrage.
    setTimeout(() => location.reload(), 60000);
  }
}

demarrer();

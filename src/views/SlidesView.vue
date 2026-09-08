<script setup>
/**
 * Liste des slides — la vue où se joue la refonte de la gestion actif/inactif.
 *
 * Trois usages de la même vue :
 *   /slides              tous les slides
 *   /ecran/:id/slides    les slides d'un écran, dans l'ordre de passage
 *   /slides/corbeille    la corbeille
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useDonneesStore } from "@/stores/donnees.js";
import { slides as apiSlides, liens as apiLiens } from "@/core/api.js";
import { computeSlideState, computeSlideStateGlobal, compterEtats } from "@/core/state.js";
import { depuisChampDateHeure } from "@/core/dates.js";
import { urlLecteur } from "@/core/media.js";

import CompteursEtats from "@/components/etat/CompteursEtats.vue";
import SlideLigne from "@/components/slides/SlideLigne.vue";
import ModaleBase from "@/components/ui/ModaleBase.vue";
import { message, erreur } from "@/composables/messages.js";
import { useLiaison } from "@/composables/liaison.js";

const route = useRoute();
const router = useRouter();
const donnees = useDonneesStore();
const { piloter, COMMANDES } = useLiaison();

const ecranId = computed(() => (route.params.id ? Number(route.params.id) : null));
const corbeille = computed(() => !!route.meta.corbeille);

const filtreEtat = ref(null);
/** null = tous les écrans, "aucun" = slides sans écran, sinon un identifiant. */
const filtreEcran = ref(null);
const recherche = ref("");
const tri = ref(ecranId.value ? "ordre" : "modification");
const selection = ref(new Set());

// Changer de route réutilise le composant : on repart d'une vue propre.
watch(
  () => route.fullPath,
  () => {
    filtreEtat.value = null;
    filtreEcran.value = null;
    recherche.value = "";
    tri.value = ecranId.value ? "ordre" : "modification";
    selection.value = new Set();
  }
);

/* ---- Périmètre ----------------------------------------------------------- */

const ecran = computed(() => (ecranId.value ? donnees.ecranParId(ecranId.value) : null));

/** Écran de référence pour le calcul des états : celui de la page, ou du filtre. */
const contexte = computed(
  () =>
    ecran.value ||
    (typeof filtreEcran.value === "number" ? donnees.ecranParId(filtreEcran.value) : null)
);

const slidesDuPerimetre = computed(() => {
  let liste = donnees.slides.filter((s) => !!s.trash === corbeille.value);

  if (ecranId.value) {
    const ids = new Set(
      donnees.liens.filter((l) => l.ecran_id === ecranId.value).map((l) => l.slide_id)
    );
    liste = liste.filter((s) => ids.has(s.id));
  }

  // Le filtre par écran est un périmètre, pas un simple masquage : les
  // compteurs et les états calculés portent dessus.
  if (filtreEcran.value === "aucun") {
    const rattaches = new Set(donnees.liens.map((l) => l.slide_id));
    liste = liste.filter((s) => !rattaches.has(s.id));
  } else if (filtreEcran.value) {
    const ids = new Set(
      donnees.liens.filter((l) => l.ecran_id === filtreEcran.value).map((l) => l.slide_id)
    );
    liste = liste.filter((s) => ids.has(s.id));
  }

  return liste;
});

/* ---- États --------------------------------------------------------------- */

const avecEtat = computed(() => {
  const index = donnees.slidesParEcran;
  const maintenant = donnees.maintenant;

  return slidesDuPerimetre.value.map((slide) => {
    const ecransDu = donnees.ecransDuSlide(slide.id);
    const etat = contexte.value
      ? computeSlideState(slide, {
          now: maintenant,
          ecrans: ecransDu,
          ecran: contexte.value,
          lien: donnees.lienDe(slide.id, contexte.value.id),
          slidesDeLEcran: index[contexte.value.id] || [],
        })
      : computeSlideStateGlobal(slide, {
          now: maintenant,
          ecrans: ecransDu,
          liens: donnees.liens,
          slidesParEcran: index,
        });
    return { slide, etat, ecrans: ecransDu };
  });
});

const compteurs = computed(() => compterEtats(avecEtat.value.map((x) => x.etat)));

/* ---- Filtres et tri ------------------------------------------------------ */

const visibles = computed(() => {
  let liste = avecEtat.value;

  if (filtreEtat.value) liste = liste.filter((x) => x.etat.etat === filtreEtat.value);

  if (recherche.value) {
    const q = recherche.value.toLowerCase();
    liste = liste.filter((x) => x.slide.name?.toLowerCase().includes(q));
  }

  const copie = [...liste];
  if (tri.value === "ordre" && contexte.value) {
    const ordre = contexte.value.slideSort || [];
    copie.sort((a, b) => {
      const ia = ordre.indexOf(a.slide.id);
      const ib = ordre.indexOf(b.slide.id);
      return (ia === -1 ? 1e9 + a.slide.id : ia) - (ib === -1 ? 1e9 + b.slide.id : ib);
    });
  } else if (tri.value === "nom") {
    copie.sort((a, b) => (a.slide.name || "").localeCompare(b.slide.name || ""));
  } else if (tri.value === "duree") {
    copie.sort((a, b) => b.slide.duration - a.slide.duration);
  } else {
    copie.sort((a, b) => new Date(b.slide.updated_at || 0) - new Date(a.slide.updated_at || 0));
  }
  return copie;
});

const titre = computed(() => {
  if (corbeille.value) return "Corbeille des slides";
  if (ecran.value) return `Slides de « ${ecran.value.name} »`;
  return "Tous les slides";
});

const deplacable = computed(() => !!contexte.value && tri.value === "ordre" && !corbeille.value);

function surFiltreEcran(valeur) {
  filtreEcran.value = valeur === "" ? null : valeur === "aucun" ? "aucun" : Number(valeur);
  // Le tri « ordre de diffusion » n'a de sens que dans un écran.
  if (!filtreEcran.value && !ecranId.value && tri.value === "ordre") tri.value = "modification";
  selection.value = new Set();
}

/* ---- Sélection ----------------------------------------------------------- */

function basculerSelection(id, coche) {
  const suivante = new Set(selection.value);
  if (coche) suivante.add(id);
  else suivante.delete(id);
  selection.value = suivante;
}

const idsSelectionnes = computed(() => [...selection.value]);

/* ---- Actions ------------------------------------------------------------- */

async function appliquerActif(ids, actif, cible = null) {
  // Mémorise l'état précédent pour proposer une annulation.
  const avant = ids.map((id) => ({
    id,
    actif: cible
      ? donnees.lienDe(id, cible.id)?.active !== false
      : donnees.slideParId(id)?.active !== false,
  }));

  try {
    if (cible) await apiLiens.setActiveSurEcran(ids, cible.id, actif);
    else await apiSlides.setActive(ids, actif);
    await donnees.recharger();
    selection.value = new Set();

    message(
      `${ids.length} slide(s) ${actif ? "activé(s)" : "désactivé(s)"}${
        cible ? ` sur « ${cible.name} »` : ""
      }.`,
      {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              for (const valeur of [true, false]) {
                const cibles = avant.filter((a) => a.actif === valeur).map((a) => a.id);
                if (!cibles.length) continue;
                if (cible) await apiLiens.setActiveSurEcran(cibles, cible.id, valeur);
                else await apiSlides.setActive(cibles, valeur);
              }
              await donnees.recharger();
              message("Annulé.");
            } catch (e) {
              erreur(e);
            }
          },
        },
      }
    );
  } catch (e) {
    erreur(e);
  }
}

async function mettreCorbeille(ids, dedans) {
  try {
    await apiSlides.setTrash(ids, dedans);
    await donnees.recharger();
    selection.value = new Set();
    message(
      dedans ? `${ids.length} slide(s) mis à la corbeille.` : `${ids.length} slide(s) restauré(s).`,
      {
        action: {
          label: "Annuler",
          onClick: async () => {
            await apiSlides.setTrash(ids, !dedans);
            await donnees.recharger();
          },
        },
      }
    );
  } catch (e) {
    erreur(e);
  }
}

async function supprimerDefinitivement(ids) {
  if (
    !window.confirm(
      `Supprimer définitivement ${ids.length} slide(s) ? Cette action est irréversible.`
    )
  ) {
    return;
  }
  try {
    await apiSlides.remove(ids);
    await donnees.recharger();
    selection.value = new Set();
    message(`${ids.length} slide(s) supprimé(s) définitivement.`, { ton: "warning" });
  } catch (e) {
    erreur(e);
  }
}

async function dupliquer(slide) {
  try {
    const copie = await apiSlides.duplicate(slide.id);
    const ecransDu = donnees.ecransDuSlide(slide.id);
    if (ecransDu.length) {
      await apiLiens.setEcransDuSlide(
        copie.id,
        ecransDu.map((e) => e.id)
      );
    }
    await donnees.recharger();
    message("Slide dupliqué (désactivé par défaut).");
    router.push(`/slide/${copie.id}`);
  } catch (e) {
    erreur(e);
  }
}

async function creerSlide() {
  try {
    const nb = await apiSlides.compterSlidesVides();
    const slide = await apiSlides.create(`Nouveau slide vide (${nb + 1})`);
    if (ecran.value) await apiLiens.ajouter([slide.id], ecran.value.id);
    await donnees.recharger();
    router.push(`/slide/${slide.id}`);
  } catch (e) {
    erreur(e);
  }
}

async function retirerDeLEcran(ids) {
  const cible = contexte.value;
  if (!cible) return;
  try {
    await apiLiens.retirer(ids, cible.id);
    await donnees.recharger();
    selection.value = new Set();
    message(`${ids.length} slide(s) retiré(s) de « ${cible.name} ».`, {
      action: {
        label: "Annuler",
        onClick: async () => {
          await apiLiens.ajouter(ids, cible.id);
          await donnees.recharger();
        },
      },
    });
  } catch (e) {
    erreur(e);
  }
}

/* ---- Intentions (menu de l'interrupteur) --------------------------------- */

const modaleDate = ref(null); // { champ: 'expiration'|'publication', ids: [], valeur: '' }

function ouvrirModaleDate(champ, ids) {
  modaleDate.value = { champ, ids, valeur: "" };
}

async function validerModaleDate() {
  const { champ, ids, valeur } = modaleDate.value;
  const iso = depuisChampDateHeure(valeur);
  modaleDate.value = null;
  try {
    if (champ === "expiration") {
      await apiSlides.setExpiration(ids, iso);
    } else {
      for (const id of ids) {
        const slide = donnees.slideParId(id);
        if (slide) await apiSlides.save({ ...slide, publication: iso });
      }
    }
    await donnees.recharger();
    selection.value = new Set();
    message("Date enregistrée.");
  } catch (e) {
    erreur(e);
  }
}

/** Suspension temporaire : publication repoussée, sans nouveau champ en base. */
async function suspendre(slide, reprise) {
  const avant = slide.publication;
  try {
    await apiSlides.save({ ...slide, publication: reprise.toISOString(), active: true });
    await donnees.recharger();
    message(`« ${slide.name} » suspendu — reprise le ${reprise.toLocaleString("fr-FR")}.`, {
      action: {
        label: "Annuler",
        onClick: async () => {
          await apiSlides.save({ ...slide, publication: avant });
          await donnees.recharger();
        },
      },
    });
  } catch (e) {
    erreur(e);
  }
}

function surIntention(slide, intention) {
  switch (intention) {
    case "expiration":
      return ouvrirModaleDate("expiration", [slide.id]);
    case "publication":
      return ouvrirModaleDate("publication", [slide.id]);
    case "suspendre-1h":
      return suspendre(slide, new Date(Date.now() + 3600e3));
    case "suspendre-demain": {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return suspendre(slide, d);
    }
    case "suspendre-lundi": {
      const d = new Date();
      d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
      d.setHours(8, 0, 0, 0);
      return suspendre(slide, d);
    }
    case "dupliquer":
      return dupliquer(slide);
    case "corbeille":
      return mettreCorbeille([slide.id], true);
    default:
      return undefined;
  }
}

function surCorrection(slide, correction) {
  switch (correction.action) {
    case "activer":
      return appliquerActif([slide.id], true);
    case "activer-ecran":
      return appliquerActif([slide.id], true, contexte.value);
    case "restaurer":
      return mettreCorbeille([slide.id], false);
    case "voir-slide":
      return router.push(`/slide/${correction.id}`);
    default:
      return router.push(`/slide/${slide.id}`);
  }
}

/* ---- Rattachement en lot -------------------------------------------------- */

const modaleRattachement = ref(null); // { ids: [], choisis: [] }

async function validerRattachement() {
  const { ids, choisis } = modaleRattachement.value;
  modaleRattachement.value = null;
  try {
    for (const cible of choisis) await apiLiens.ajouter(ids, Number(cible));
    await donnees.recharger();
    selection.value = new Set();
    message("Rattachement effectué.");
  } catch (e) {
    erreur(e);
  }
}

/* ---- Réordonnancement ----------------------------------------------------- */

async function reordonner({ source, cible }) {
  const ecranCible = contexte.value;
  if (!ecranCible) return;

  // On repart de l'ordre AFFICHÉ, pour que le résultat soit celui que
  // l'utilisateur voit — et non celui d'une liste partiellement filtrée.
  const affiches = visibles.value.map((x) => x.slide.id);
  const ordre = affiches.filter((id) => id !== source);
  ordre.splice(ordre.indexOf(cible), 0, source);

  // Les slides de l'écran non affichés gardent leur position relative, à la suite.
  const tous = donnees.liens
    .filter((l) => l.ecran_id === ecranCible.id)
    .map((l) => l.slide_id);
  const complet = [...ordre, ...tous.filter((id) => !ordre.includes(id))];

  try {
    await donnees.enregistrerOrdre(ecranCible.id, complet);
    message("Ordre enregistré.");
  } catch (e) {
    erreur(e);
  }
}
</script>

<template>
  <div v-if="ecranId && !ecran" class="notification is-warning">Écran introuvable.</div>

  <div v-else>
    <h1 class="title is-4">
      {{ titre }}
      <span class="has-text-grey ml-2">({{ slidesDuPerimetre.length }})</span>
    </h1>

    <!-- Actions générales -->
    <div class="buttons are-small mb-2">
      <template v-if="corbeille">
        <RouterLink class="button is-small" to="/slides">
          <span class="icon is-small"><i class="fas fa-arrow-left"></i></span>
          <span>Retour aux slides</span>
        </RouterLink>
      </template>

      <template v-else>
        <button class="button is-small is-success" type="button" @click="creerSlide">
          <span class="icon is-small"><i class="fas fa-plus"></i></span>
          <span>Créer un slide</span>
        </button>

        <a
          v-if="ecran"
          class="button is-small is-link"
          :href="urlLecteur({ slug: ecran.slug })"
          target="_blank"
          rel="noreferrer"
        >
          <span class="icon is-small"><i class="fas fa-tv"></i></span>
          <span>Visionner « {{ ecran.name }} »</span>
        </a>

        <button
          v-if="ecran"
          class="button is-small"
          type="button"
          @click="piloter(COMMANDES.recharger(ecran.id), 'Rechargement demandé.')"
        >
          <span class="icon is-small"><i class="fas fa-sync"></i></span>
          <span>Recharger l'écran</span>
        </button>

        <button
          v-if="ecran"
          class="button is-small"
          type="button"
          @click="piloter(COMMANDES.avancer(ecran.id), 'Slide suivant demandé.')"
        >
          <span class="icon is-small"><i class="fas fa-arrow-right"></i></span>
          <span>Avancer</span>
        </button>

        <RouterLink v-if="ecran" class="button is-small" :to="`/ecran/${ecran.id}/frise`">
          <span class="icon is-small"><i class="fas fa-chart-gantt"></i></span>
          <span>Frise de la journée</span>
        </RouterLink>

        <RouterLink class="button is-small" to="/slides/corbeille">
          <span class="icon is-small"><i class="fas fa-trash"></i></span>
          <span>Corbeille</span>
        </RouterLink>
      </template>
    </div>

    <CompteursEtats :compteurs="compteurs" :actif="filtreEtat" @filtrer="filtreEtat = $event" />

    <!-- Recherche, filtre par écran, tri -->
    <div class="field is-grouped filtres mt-2">
      <p class="control has-icons-left is-expanded">
        <input
          v-model="recherche"
          class="input is-small"
          type="search"
          placeholder="Rechercher un slide…"
        />
        <span class="icon is-small is-left"><i class="fas fa-magnifying-glass"></i></span>
      </p>

      <p v-if="!ecranId" class="control has-icons-left">
        <span class="select is-small" :class="{ 'is-link': filtreEcran }">
          <select
            title="Filtrer par écran"
            :value="filtreEcran === null ? '' : String(filtreEcran)"
            @change="surFiltreEcran($event.target.value)"
          >
            <option value="">Tous les écrans</option>
            <option v-for="e in donnees.ecrans" :key="e.id" :value="String(e.id)">
              {{ e.name || `Écran ${e.id}` }}
            </option>
            <option v-if="donnees.nbSansEcran" value="aucun">
              ⚠ Sans écran ({{ donnees.nbSansEcran }})
            </option>
          </select>
        </span>
        <span class="icon is-small is-left"><i class="fas fa-tv"></i></span>
      </p>

      <p class="control">
        <span class="select is-small">
          <select v-model="tri">
            <option v-if="contexte" value="ordre">Ordre de diffusion</option>
            <option value="modification">Modifié récemment</option>
            <option value="nom">Nom</option>
            <option value="duree">Durée</option>
          </select>
        </span>
      </p>
    </div>

    <!-- Actions en lot -->
    <div v-if="selection.size" class="notification is-link is-light barre-selection">
      <strong>{{ selection.size }} slide(s) sélectionné(s)</strong>
      <div class="buttons are-small">
        <template v-if="corbeille">
          <button
            class="button is-small"
            type="button"
            @click="mettreCorbeille(idsSelectionnes, false)"
          >
            Restaurer
          </button>
          <button
            class="button is-small is-danger"
            type="button"
            @click="supprimerDefinitivement(idsSelectionnes)"
          >
            Supprimer définitivement
          </button>
        </template>

        <template v-else>
          <button
            class="button is-small is-success"
            type="button"
            @click="appliquerActif(idsSelectionnes, true)"
          >
            Activer
          </button>
          <button
            class="button is-small"
            type="button"
            @click="appliquerActif(idsSelectionnes, false)"
          >
            Désactiver
          </button>
          <button
            class="button is-small"
            type="button"
            @click="ouvrirModaleDate('expiration', idsSelectionnes)"
          >
            Définir une expiration
          </button>
          <button
            v-if="contexte"
            class="button is-small"
            type="button"
            @click="retirerDeLEcran(idsSelectionnes)"
          >
            Retirer de « {{ contexte.name }} »
          </button>
          <button
            class="button is-small"
            type="button"
            @click="modaleRattachement = { ids: idsSelectionnes, choisis: [] }"
          >
            Rattacher à un écran…
          </button>
          <button
            class="button is-small is-danger is-light"
            type="button"
            @click="mettreCorbeille(idsSelectionnes, true)"
          >
            Mettre à la corbeille
          </button>
        </template>

        <button class="button is-small is-white" type="button" @click="selection = new Set()">
          Tout désélectionner
        </button>
      </div>
    </div>

    <!-- Liste -->
    <p v-if="visibles.length === 0" class="notification is-light mt-4">
      Aucun slide ne correspond.
    </p>

    <div v-else class="slides-liste mt-3">
      <SlideLigne
        v-for="entree in visibles"
        :key="entree.slide.id"
        :slide="entree.slide"
        :etat="entree.etat"
        :ecrans="entree.ecrans"
        :contexte="contexte"
        :corbeille="corbeille"
        :deplacable="deplacable"
        :selectionne="selection.has(entree.slide.id)"
        @selection="basculerSelection(entree.slide.id, $event)"
        @basculer="appliquerActif([entree.slide.id], $event.actif, $event.ecran)"
        @intention="surIntention(entree.slide, $event)"
        @corriger="surCorrection(entree.slide, $event)"
        @dupliquer="dupliquer(entree.slide)"
        @corbeille="mettreCorbeille([entree.slide.id], true)"
        @restaurer="mettreCorbeille([entree.slide.id], false)"
        @reordonner="reordonner"
      />
    </div>

    <!-- Modale de date -->
    <ModaleBase
      v-if="modaleDate"
      :titre="
        modaleDate.champ === 'expiration'
          ? `Date d'expiration pour ${modaleDate.ids.length} slide(s)`
          : `Date de publication pour ${modaleDate.ids.length} slide(s)`
      "
      @fermer="modaleDate = null"
    >
      <p class="mb-3">
        {{
          modaleDate.champ === "expiration"
            ? "Le slide ne sera plus diffusé après cette date."
            : "Le slide ne sera pas diffusé avant cette date."
        }}
      </p>
      <input v-model="modaleDate.valeur" class="input" type="datetime-local" />

      <template #pied>
        <button class="button is-light" type="button" @click="modaleDate = null">Annuler</button>
        <button class="button is-primary" type="button" @click="validerModaleDate">
          Enregistrer
        </button>
      </template>
    </ModaleBase>

    <!-- Modale de rattachement -->
    <ModaleBase
      v-if="modaleRattachement"
      :titre="`Rattacher ${modaleRattachement.ids.length} slide(s) à…`"
      @fermer="modaleRattachement = null"
    >
      <div class="select is-multiple is-fullwidth">
        <select
          v-model="modaleRattachement.choisis"
          multiple
          :size="Math.min(8, Math.max(3, donnees.ecrans.length))"
        >
          <option v-for="e in donnees.ecrans" :key="e.id" :value="String(e.id)">
            {{ e.name }}
          </option>
        </select>
      </div>

      <template #pied>
        <button class="button is-light" type="button" @click="modaleRattachement = null">
          Annuler
        </button>
        <button class="button is-primary" type="button" @click="validerRattachement">
          Rattacher
        </button>
      </template>
    </ModaleBase>
  </div>
</template>

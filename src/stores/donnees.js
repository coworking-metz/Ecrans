/**
 * Écrans, slides et liens — la source de vérité de l'administration.
 *
 * Le store ne contient aucune règle métier : il charge, il conserve, il
 * réécrit. Les règles vivent dans `core/`, qui ne dépend ni de Pinia ni de Vue
 * et sert aussi bien au lecteur qu'à l'administration.
 */

import { defineStore } from "pinia";
import {
  ecrans as apiEcrans,
  slides as apiSlides,
  liens as apiLiens,
  supporteActiveParEcran,
} from "@/core/api.js";

export const useDonneesStore = defineStore("donnees", {
  state: () => ({
    ecrans: [],
    slides: [],
    liens: [],

    chargement: true,
    erreur: null,

    /** Rafraîchi périodiquement : fait recalculer les états sans action utilisateur. */
    maintenant: new Date(),

    /** La colonne `active` existe-t-elle sur les liens ? (interrupteur par écran) */
    activeParEcran: false,

    /** Signaux de vie des lecteurs : { [ecranId]: { vuA, slideCourant, nbEligibles } } */
    lecteurs: {},
  }),

  getters: {
    ecranParId: (state) => (id) => state.ecrans.find((e) => e.id === Number(id)) || null,
    ecranParSlug: (state) => (slug) => state.ecrans.find((e) => e.slug === slug) || null,
    slideParId: (state) => (id) => state.slides.find((s) => s.id === Number(id)) || null,

    /** Écrans auxquels un slide est rattaché. */
    ecransDuSlide: (state) => (slideId) => {
      const ids = state.liens.filter((l) => l.slide_id === Number(slideId)).map((l) => l.ecran_id);
      return state.ecrans.filter((e) => ids.includes(e.id));
    },

    lienDe: (state) => (slideId, ecranId) =>
      state.liens.find(
        (l) => l.slide_id === Number(slideId) && l.ecran_id === Number(ecranId)
      ) || null,

    /** Index { ecranId: [slides] }, nécessaire au calcul de l'éviction par priorité. */
    slidesParEcran: (state) => {
      const index = {};
      for (const ecran of state.ecrans) index[ecran.id] = [];
      for (const lien of state.liens) {
        const slide = state.slides.find((s) => s.id === lien.slide_id);
        if (slide && index[lien.ecran_id]) index[lien.ecran_id].push(slide);
      }
      return index;
    },

    /** Nombre de slides rattachés à aucun écran, hors corbeille. */
    nbSansEcran: (state) => {
      const rattaches = new Set(state.liens.map((l) => l.slide_id));
      return state.slides.filter((s) => !s.trash && !rattaches.has(s.id)).length;
    },
  },

  actions: {
    /** Premier chargement : tout, en parallèle. */
    async charger() {
      this.chargement = true;
      this.erreur = null;
      try {
        const [ecrans, slides, liens, activeParEcran] = await Promise.all([
          apiEcrans.list(),
          apiSlides.list(),
          apiLiens.list(),
          supporteActiveParEcran(),
        ]);
        this.ecrans = ecrans;
        this.slides = slides;
        this.liens = liens;
        this.activeParEcran = activeParEcran;
      } catch (e) {
        this.erreur = e;
        throw e;
      } finally {
        this.chargement = false;
      }
    },

    /** Rechargement après une écriture. */
    async recharger() {
      const [ecrans, slides, liens] = await Promise.all([
        apiEcrans.list(),
        apiSlides.list(),
        apiLiens.list(),
      ]);
      this.ecrans = ecrans;
      this.slides = slides;
      this.liens = liens;
    },

    /** Horloge : sans elle, les états affichés se figeraient. */
    demarrerHorloge(intervalleMs = 30000) {
      if (this._horloge) return;
      this._horloge = setInterval(() => {
        this.maintenant = new Date();
      }, intervalleMs);
    },

    arreterHorloge() {
      clearInterval(this._horloge);
      this._horloge = null;
    },

    /** Signal de vie reçu d'un lecteur. */
    noterLecteur(ecranId, infos) {
      this.lecteurs = {
        ...this.lecteurs,
        [ecranId]: { vuA: Date.now(), ...infos },
      };
    },

    /** Ordre de passage des slides sur un écran, mis à jour localement aussi. */
    async enregistrerOrdre(ecranId, slideIds) {
      await apiEcrans.setOrder(ecranId, slideIds);
      const ecran = this.ecranParId(ecranId);
      if (ecran) ecran.slideSort = slideIds.map(Number);
    },
  },
});

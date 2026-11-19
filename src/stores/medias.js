/** Bibliothèque de médias : liste, dépôt, suppression. */

import { defineStore } from "pinia";
import { medias as apiMedias, FORMATS_ACCEPTES, FORMATS_MINIATURE } from "@/core/api.js";
import { fabriquerMiniature } from "@/core/media.js";

export const useMediasStore = defineStore("medias", {
  state: () => ({
    medias: [],
    chargement: false,
    envoiEnCours: false,
  }),

  getters: {
    parUrl: (state) => (url) => state.medias.find((m) => m.url === url) || null,
    rechercher: (state) => (terme) => {
      const q = (terme || "").trim().toLowerCase();
      return q ? state.medias.filter((m) => m.index.includes(q)) : state.medias;
    },
  },

  actions: {
    async charger() {
      this.chargement = true;
      try {
        this.medias = await apiMedias.list();
      } finally {
        this.chargement = false;
      }
    },

    /**
     * Dépose des fichiers et génère leurs miniatures.
     * @returns {{deposes: string[], refuses: string[], erreurs: Error[]}}
     */
    async deposer(fichiers) {
      const refuses = fichiers.filter((f) => !FORMATS_ACCEPTES.includes(f.type)).map((f) => f.name);
      const acceptes = fichiers.filter((f) => FORMATS_ACCEPTES.includes(f.type));
      const deposes = [];
      const erreurs = [];

      this.envoiEnCours = true;
      try {
        for (const fichier of acceptes) {
          try {
            await apiMedias.upload(`medias/${fichier.name}`, fichier, { upsert: true });
            if (FORMATS_MINIATURE.includes(fichier.type)) {
              try {
                const miniature = await fabriquerMiniature(fichier);
                await apiMedias.upload(`thumbnails/${fichier.name}`, miniature, { upsert: true });
              } catch (e) {
                // Une miniature manquante n'est pas bloquante : l'original s'affiche.
                console.warn("[médias] miniature non générée pour", fichier.name, e);
              }
            }
            deposes.push(fichier.name);
          } catch (e) {
            erreurs.push(e);
          }
        }
        if (deposes.length) await this.charger();
      } finally {
        this.envoiEnCours = false;
      }

      return { deposes, refuses, erreurs };
    },

    async supprimer(nom) {
      await apiMedias.remove([nom]);
      await this.charger();
    },
  },
});

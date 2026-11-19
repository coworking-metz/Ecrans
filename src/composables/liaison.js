/** Liaison temps réel avec les lecteurs, côté administration. */

import { onBeforeUnmount, ref } from "vue";
import { creerLiaison, COMMANDES } from "@/core/realtime.js";
import { useDonneesStore } from "@/stores/donnees.js";
import { message } from "@/composables/messages.js";

let liaison = null;
const etatLiaison = ref("connexion");

/**
 * Ouvre la liaison une fois pour l'application, et interroge les lecteurs
 * régulièrement pour alimenter l'indicateur « en ligne ».
 */
export function ouvrirLiaison() {
  if (liaison) return liaison;
  const donnees = useDonneesStore();

  liaison = creerLiaison({
    onEtat: ({ etat }) => {
      etatLiaison.value = etat;
    },
    onMessage: (msg) => {
      if (msg.name === "pong" && msg.id) {
        donnees.noterLecteur(msg.id, {
          slideCourant: msg.slideCourant ?? null,
          nbEligibles: msg.nbEligibles ?? null,
        });
      }
    },
  });

  setInterval(() => {
    for (const ecran of donnees.ecrans) liaison?.envoyer({ name: "ping", id: ecran.id });
  }, 45000);

  return liaison;
}

export function useLiaison() {
  return {
    etatLiaison,

    /** Envoie une commande, et signale si la liaison est coupée. */
    piloter(commande, texte) {
      if (liaison?.envoyer(commande)) message(texte);
      else message("Liaison temps réel indisponible.", { ton: "warning" });
    },

    COMMANDES,
  };
}

/** Ferme la liaison quand le composant qui l'a ouverte disparaît (tests, HMR). */
export function fermerLiaisonAuDemontage() {
  onBeforeUnmount(() => {
    liaison?.fermer();
    liaison = null;
  });
}

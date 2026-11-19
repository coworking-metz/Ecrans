/**
 * Liaison temps réel entre l'administration et les lecteurs.
 *
 * Protocole inchangé : messages `{ action: "ecran", name, id, ... }`, reçus
 * soit directement, soit encapsulés dans `{ payload: {...} }`.
 *
 * CORRECTIF v1 : la fermeture du canal provoquait un rechargement complet de la
 * page toutes les 3 secondes tant que le service était indisponible, et une
 * commande de rechargement reçue deux fois déclenchait un rechargement immédiat
 * au lieu du rechargement différé prévu. On distingue désormais :
 *   - perte de liaison  -> on retente la connexion, avec attente progressive ;
 *   - ordre de recharger -> on recharge la page, une seule fois.
 */

import config from "./config.js";

const ATTENTE_MIN = 1000;
const ATTENTE_MAX = 30000;

export function creerLiaison({ slug = null, onMessage = () => {}, onEtat = () => {} } = {}) {
  let socket = null;
  let attente = ATTENTE_MIN;
  let minuteurReconnexion = null;
  let minuteurPing = null;
  let ferme = false;
  let connectee = false;

  function majEtat(etat, detail = {}) {
    connectee = etat === "connectee";
    onEtat({ etat, ...detail });
  }

  function planifierReconnexion() {
    if (ferme) return;
    clearTimeout(minuteurReconnexion);
    minuteurReconnexion = setTimeout(connecter, attente);
    // Attente progressive : 1s, 2s, 4s… plafonnée. Évite la tempête de reconnexions.
    attente = Math.min(attente * 2, ATTENTE_MAX);
  }

  function connecter() {
    if (ferme) return;
    try {
      socket?.close();
    } catch {
      /* le socket était déjà fermé */
    }

    majEtat("connexion");
    socket = new WebSocket(config.wsUrl);

    socket.onopen = () => {
      attente = ATTENTE_MIN;
      majEtat("connectee");
      envoyer({ name: "hello", slug });
      clearInterval(minuteurPing);
      minuteurPing = setInterval(() => envoyer({ name: "ping", slug }), 30000);
    };

    socket.onmessage = (evenement) => {
      let donnees;
      try {
        donnees = JSON.parse(evenement.data);
      } catch {
        return; // message non structuré : ignoré
      }
      const message = donnees.payload || donnees;
      if (message && message.name) onMessage(message);
    };

    socket.onerror = () => majEtat("erreur");

    socket.onclose = () => {
      clearInterval(minuteurPing);
      if (ferme) return;
      majEtat("deconnectee");
      planifierReconnexion();
    };
  }

  function envoyer(charge = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ action: "ecran", ...charge }));
    return true;
  }

  connecter();

  return {
    envoyer,
    estConnectee: () => connectee,
    fermer() {
      ferme = true;
      clearTimeout(minuteurReconnexion);
      clearInterval(minuteurPing);
      try {
        socket?.close();
      } catch {
        /* rien à faire */
      }
    },
  };
}

/** Commandes reconnues par les lecteurs. */
export const COMMANDES = {
  recharger: (id) => ({ name: "refresh-ecran", id }),
  avancer: (id) => ({ name: "avancer-ecran", id }),
  reculer: (id) => ({ name: "reculer-ecran", id }),
  afficherSlide: (id, slideId) => ({ name: "afficher-slide", id, slideId }),
  ping: (id) => ({ name: "ping", id }),
};

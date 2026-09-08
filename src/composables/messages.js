/**
 * Messages éphémères, avec action optionnelle (« Annuler »).
 *
 * État partagé hors composant : n'importe quelle vue peut signaler quelque
 * chose sans que le composant d'affichage soit son parent.
 */

import { reactive, readonly } from "vue";

const etat = reactive({ messages: [] });
let compteur = 0;

export function useMessages() {
  return {
    messages: readonly(etat).messages,
    message,
    erreur,
    retirer,
  };
}

/**
 * @param {string} texte
 * @param {object} [options]
 * @param {"success"|"info"|"warning"|"danger"} [options.ton]
 * @param {{label: string, onClick: Function}} [options.action]
 * @param {number} [options.duree] millisecondes ; 0 pour ne pas masquer
 */
export function message(texte, { ton = "success", action = null, duree = 6000 } = {}) {
  const id = ++compteur;
  etat.messages.push({ id, texte, ton, action });
  if (duree) setTimeout(() => retirer(id), duree);
  return id;
}

export function erreur(e) {
  console.error(e);
  return message(e?.message || String(e), { ton: "danger", duree: 12000 });
}

export function retirer(id) {
  const i = etat.messages.findIndex((m) => m.id === id);
  if (i !== -1) etat.messages.splice(i, 1);
}

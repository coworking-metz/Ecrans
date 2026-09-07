/**
 * Constitution du diaporama d'un écran.
 *
 * Ce module est LA référence : le lecteur et l'administration l'utilisent tous
 * les deux. En v1, la règle d'éligibilité était réécrite à deux endroits, ce qui
 * faisait diverger l'aperçu de la diffusion réelle.
 */

import { isInTimeRange, hasPriority, isAlways } from "./schedule.js";

function toDate(valeur) {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Slides rattachés à un écran, dans l'ordre défini pour cet écran. */
export function slidesDeLEcran(ecran, slides, liens) {
  const ids = new Set(
    liens.filter((l) => l.ecran_id === ecran.id).map((l) => l.slide_id)
  );
  const rattaches = slides.filter((s) => ids.has(s.id) && !s.trash);
  return trierSelonOrdre(rattaches, ecran.slideSort);
}

/**
 * Trie selon la liste d'identifiants de l'écran ; les slides absents de cette
 * liste sont placés à la suite, dans leur ordre d'origine.
 */
export function trierSelonOrdre(slides, ordre) {
  if (!Array.isArray(ordre) || ordre.length === 0) return [...slides];
  const parId = new Map(slides.map((s) => [s.id, s]));
  const tries = [];
  for (const id of ordre) {
    const s = parId.get(Number(id));
    if (s && !tries.includes(s)) tries.push(s);
  }
  const restants = slides.filter((s) => !tries.includes(s));
  return [...tries, ...restants];
}

/**
 * Les slides réellement diffusés sur un écran à un instant donné.
 *
 * Applique, dans l'ordre, les six conditions :
 *   1. pas dans la corbeille
 *   2. rattaché à cet écran
 *   3. activé (globalement, et sur cet écran si le lien porte un interrupteur)
 *   4. dans sa fenêtre publication → expiration
 *   5. dans une de ses plages horaires
 *   6. non écarté par un slide prioritaire
 */
export function eligibleSlides(ecran, slides, liens, now = new Date()) {
  const liensEcran = liens.filter((l) => l.ecran_id === ecran.id);
  const lienParSlide = new Map(liensEcran.map((l) => [l.slide_id, l]));

  const rattaches = trierSelonOrdre(
    slides.filter((s) => lienParSlide.has(s.id)),
    ecran.slideSort
  );

  const candidats = rattaches.filter((slide) => {
    if (slide.trash) return false;
    if (slide.active === false) return false;

    // Interrupteur par écran (évolution de schéma facultative : si la colonne
    // n'existe pas, `active` est indéfini et le lien est considéré actif).
    const lien = lienParSlide.get(slide.id);
    if (lien && lien.active === false) return false;

    const pub = toDate(slide.publication);
    const exp = toDate(slide.expiration);
    if (pub && pub > now) return false;
    if (exp && exp < now) return false;

    return isInTimeRange(slide.display_times, now);
  });

  // Éviction : dès qu'un slide prioritaire est éligible, seuls les prioritaires
  // et les permanents restent.
  const auMoinsUnPrioritaire = candidats.some((s) => hasPriority(s.display_times));
  if (!auMoinsUnPrioritaire) return candidats;

  return candidats.filter((s) => hasPriority(s.display_times) || isAlways(s.display_times));
}

/** Durée totale d'un tour de diaporama, en secondes. */
export function dureeDuCycle(slides) {
  return slides.reduce((total, s) => total + (Number(s.duration) || 0), 0);
}

/**
 * État applicatif observable.
 *
 * Volontairement minimal : un objet de données, des abonnements, une
 * notification groupée en fin de micro-tâche. Pas de DOM virtuel, pas de
 * dépendance — les vues se re-rendent elles-mêmes.
 */

const abonnes = new Set();
let enAttente = false;

export const store = {
  ecrans: [],
  slides: [],
  liens: [],
  medias: [],
  /** Rafraîchi chaque minute : fait recalculer les états sans action utilisateur. */
  maintenant: new Date(),
  chargement: true,
  erreur: null,
  /** Support de l'interrupteur par écran, détecté au démarrage. */
  activeParEcran: false,
  /**
   * Signaux de vie des lecteurs, par identifiant d'écran :
   * { [ecranId]: { vuA, slideCourant, nbEligibles } }
   */
  lecteurs: {},
};

export function subscribe(fn) {
  abonnes.add(fn);
  return () => abonnes.delete(fn);
}

export function notify() {
  if (enAttente) return;
  enAttente = true;
  queueMicrotask(() => {
    enAttente = false;
    for (const fn of abonnes) {
      try {
        fn(store);
      } catch (e) {
        console.error("[store] abonné en erreur", e);
      }
    }
  });
}

export function setState(patch) {
  Object.assign(store, patch);
  notify();
}

/* ---- Sélecteurs ---------------------------------------------------------- */

export function ecranParId(id) {
  return store.ecrans.find((e) => e.id === Number(id)) || null;
}

export function ecranParSlug(slug) {
  return store.ecrans.find((e) => e.slug === slug) || null;
}

export function slideParId(id) {
  return store.slides.find((s) => s.id === Number(id)) || null;
}

/** Écrans auxquels un slide est rattaché. */
export function ecransDuSlide(slideId) {
  const ids = store.liens.filter((l) => l.slide_id === Number(slideId)).map((l) => l.ecran_id);
  return store.ecrans.filter((e) => ids.includes(e.id));
}

export function lienDe(slideId, ecranId) {
  return (
    store.liens.find((l) => l.slide_id === Number(slideId) && l.ecran_id === Number(ecranId)) || null
  );
}

/** Index { ecranId: [slides] }, nécessaire au calcul de l'éviction par priorité. */
export function slidesParEcran() {
  const index = {};
  for (const ecran of store.ecrans) index[ecran.id] = [];
  for (const lien of store.liens) {
    const slide = store.slides.find((s) => s.id === lien.slide_id);
    if (slide && index[lien.ecran_id]) index[lien.ecran_id].push(slide);
  }
  return index;
}

/* ---- Horloge ------------------------------------------------------------- */

let horloge = null;
export function demarrerHorloge(intervalleMs = 30000) {
  if (horloge) return;
  horloge = setInterval(() => setState({ maintenant: new Date() }), intervalleMs);
}

export default store;

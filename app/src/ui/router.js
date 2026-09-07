/** Routage par l'historique du navigateur, sans dépendance. */

const routes = [];
let conteneur = null;
let vueCourante = null;

/**
 * @param {string} motif  ex. "/ecran/:id/slides"
 * @param {Function} vue  (params, conteneur) => void | Function (démontage)
 * @param {string} [titre]
 */
export function route(motif, vue, titre) {
  const noms = [];
  const regex = new RegExp(
    "^" +
      motif
        .replace(/\//g, "\\/")
        .replace(/:(\w+)/g, (_, nom) => {
          noms.push(nom);
          return "([^\\/]+)";
        }) +
      "\\/?$"
  );
  routes.push({ regex, noms, vue, titre, motif });
}

export function naviguer(chemin, { remplacer = false } = {}) {
  if (remplacer) history.replaceState({}, "", chemin);
  else history.pushState({}, "", chemin);
  resoudre();
}

/** Lien interne qui n'entraîne pas de rechargement de page. */
export function lien(chemin, contenu, props = {}) {
  const a = document.createElement("a");
  a.href = chemin;
  Object.assign(a, props);
  if (props.class) a.className = props.class;
  if (props.title) a.title = props.title;
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    naviguer(chemin);
  });
  if (contenu !== undefined && contenu !== null) {
    for (const enfant of [contenu].flat()) {
      if (enfant === null || enfant === undefined || enfant === false) continue;
      a.append(enfant.nodeType ? enfant : document.createTextNode(String(enfant)));
    }
  }
  return a;
}

export function cheminCourant() {
  return location.pathname;
}

export function resoudre() {
  const chemin = location.pathname;
  for (const r of routes) {
    const correspondance = chemin.match(r.regex);
    if (!correspondance) continue;

    const params = {};
    r.noms.forEach((nom, i) => (params[nom] = decodeURIComponent(correspondance[i + 1])));

    if (typeof vueCourante === "function") {
      try {
        vueCourante();
      } catch (e) {
        console.error("[routeur] démontage en erreur", e);
      }
    }
    conteneur.replaceChildren();
    document.title = r.titre ? `${r.titre} — Écrans` : "Écrans";
    vueCourante = r.vue(params, conteneur) || null;
    document.querySelectorAll("[data-route]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.route === chemin);
    });
    window.scrollTo(0, 0);
    return;
  }
  conteneur.replaceChildren();
  const p = document.createElement("p");
  p.className = "notification is-warning";
  p.textContent = `Page introuvable : ${chemin}`;
  conteneur.append(p);
}

export function demarrerRouteur(cible) {
  conteneur = cible;
  window.addEventListener("popstate", resoudre);
  resoudre();
}

/**
 * Fabrique d'éléments.
 *
 * Pas de DOM virtuel : chaque vue construit ses éléments et se re-rend
 * entièrement quand ses données changent. Sur des listes de quelques dizaines
 * de lignes, c'est plus simple à suivre qu'une réconciliation, et assez rapide.
 */

/**
 * @param {string} balise  ex. "div.box.mb-4" ou "button.button.is-small"
 * @param {object} [props] attributs, propriétés, `on*` pour les événements
 * @param {...any} enfants chaînes, nœuds, tableaux, null (ignoré)
 */
export function h(balise, props = {}, ...enfants) {
  const [nom, ...classes] = balise.split(".");
  const noeud = document.createElement(nom || "div");
  if (classes.length) noeud.className = classes.join(" ");

  if (props && (props.nodeType || Array.isArray(props) || typeof props === "string")) {
    enfants.unshift(props);
    props = {};
  }

  // `value` est appliqué APRÈS les enfants : sur un <select>, le poser avant que
  // les <option> existent ne sélectionne rien.
  let valeurDifferee;

  for (const [cle, valeur] of Object.entries(props || {})) {
    if (valeur === null || valeur === undefined || valeur === false) continue;

    if (cle === "value") {
      valeurDifferee = valeur;
    } else if (cle.startsWith("on") && typeof valeur === "function") {
      noeud.addEventListener(cle.slice(2).toLowerCase(), valeur);
    } else if (cle === "class") {
      noeud.className = [noeud.className, valeur].filter(Boolean).join(" ");
    } else if (cle === "dataset") {
      Object.assign(noeud.dataset, valeur);
    } else if (cle === "style" && typeof valeur === "object") {
      Object.assign(noeud.style, valeur);
    } else if (cle === "html") {
      noeud.innerHTML = valeur;
    } else if (cle in noeud && cle !== "list" && cle !== "form") {
      noeud[cle] = valeur;
    } else {
      noeud.setAttribute(cle, valeur === true ? "" : valeur);
    }
  }

  ajouter(noeud, enfants);
  if (valeurDifferee !== undefined) noeud.value = valeurDifferee;
  return noeud;
}

function ajouter(parent, enfants) {
  for (const enfant of enfants.flat(Infinity)) {
    if (enfant === null || enfant === undefined || enfant === false || enfant === true) continue;
    parent.append(enfant.nodeType ? enfant : document.createTextNode(String(enfant)));
  }
}

/** Icône Font Awesome, telle qu'utilisée par Bulma. */
export function icone(nom, classe = "is-small") {
  return h(`span.icon.${classe}`, {}, h(`i.fas.${nom}`));
}

/** Bouton Bulma avec icône optionnelle. */
export function bouton(libelle, { icone: ic, classe = "", onClick, title, disabled } = {}) {
  return h(
    `button.button.${classe}`.replace(/\.$/, ""),
    { type: "button", onClick, title, disabled },
    ic ? icone(ic) : null,
    libelle ? h("span", {}, libelle) : null
  );
}

/** Remplace le contenu d'un conteneur. */
export function rendre(conteneur, ...enfants) {
  conteneur.replaceChildren();
  ajouter(conteneur, enfants);
  return conteneur;
}

/** Champ de formulaire Bulma : label, contrôle, aide. */
export function champ(label, controle, aide) {
  return h(
    "div.field",
    {},
    label ? h("label.label", {}, label) : null,
    h("div.control", {}, controle),
    aide ? h("p.help", {}, aide) : null
  );
}

/* -------------------------------------------------------------------------- */
/*  Retours utilisateur                                                        */
/* -------------------------------------------------------------------------- */

let zoneMessages = null;

function zone() {
  if (!zoneMessages) {
    zoneMessages = h("div#messages");
    document.body.append(zoneMessages);
  }
  return zoneMessages;
}

/**
 * Message éphémère en bas de l'écran.
 * @param {object} [action] { label, onClick } — sert notamment à « Annuler ».
 */
export function message(texte, { ton = "success", action = null, duree = 6000 } = {}) {
  const boite = h(
    `div.notification.is-${ton}`,
    {},
    h("button.delete", { type: "button", onClick: () => boite.remove() }),
    h("span", {}, texte),
    action
      ? h(
          "button.button.is-small.is-white.ml-3",
          {
            type: "button",
            onClick: () => {
              boite.remove();
              action.onClick();
            },
          },
          action.label
        )
      : null
  );
  zone().append(boite);
  if (duree) setTimeout(() => boite.remove(), duree);
  return boite;
}

export function erreur(e) {
  console.error(e);
  return message(e?.message || String(e), { ton: "danger", duree: 12000 });
}

/** Confirmation avant une action destructrice. */
export function confirmer(texte) {
  return window.confirm(texte);
}

/* -------------------------------------------------------------------------- */
/*  Modale                                                                     */
/* -------------------------------------------------------------------------- */

export function modale(titre, contenu, { boutons = [], large = false } = {}) {
  const fermer = () => racine.remove();

  const racine = h(
    "div.modal.is-active",
    {},
    h("div.modal-background", { onClick: fermer }),
    h(
      "div.modal-card",
      { style: large ? { maxWidth: "70rem", width: "90vw" } : {} },
      h(
        "header.modal-card-head",
        {},
        h("p.modal-card-title", {}, titre),
        h("button.delete", { type: "button", "aria-label": "fermer", onClick: fermer })
      ),
      h("section.modal-card-body", {}, contenu),
      boutons.length
        ? h(
            "footer.modal-card-foot",
            {},
            boutons.map((b) =>
              h(
                `button.button.${b.classe || ""}`.replace(/\.$/, ""),
                {
                  type: "button",
                  onClick: () => {
                    const resultat = b.onClick?.(fermer);
                    if (resultat !== false && b.ferme !== false) fermer();
                  },
                },
                b.label
              )
            )
          )
        : null
    )
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") fermer();
    },
    { once: true }
  );

  document.body.append(racine);
  return { element: racine, fermer };
}

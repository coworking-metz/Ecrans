/**
 * Affichage de l'état de diffusion : pastille, message, et panneau « Pourquoi ? ».
 *
 * C'est la réponse à la question que la v1 ne permettait pas de poser :
 * « ce slide passe-t-il en ce moment, et sinon pourquoi ? »
 */

import { h, modale, icone } from "../dom.js";
import { ORDRE_ETATS, ETATS } from "../../core/state.js";
import { describeSchedule } from "../../core/schedule.js";
import { formatEcheance } from "../../core/dates.js";

/** Pastille compacte, cliquable, qui ouvre le panneau d'explication. */
export function pastilleEtat(etat, slide, { compact = false, onAction } = {}) {
  const bouton = h(
    `button.tag.etat-pastille.is-${etat.ton}${compact ? ".is-small" : ""}`,
    {
      type: "button",
      title: etat.message,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        ouvrirPourquoi(etat, slide, { onAction });
      },
    },
    h("span.etat-point", {}, etat.pastille),
    h("span", {}, etat.label)
  );
  return bouton;
}

/** Ligne « état + message », pour la fiche d'un slide. */
export function bandeauEtat(etat, slide, { onAction } = {}) {
  return h(
    `div.notification.is-light.is-${etat.ton}.etat-bandeau`,
    {},
    h(
      "div",
      {},
      h("strong", {}, `${etat.pastille} ${etat.label}`),
      h("p.mb-0", {}, etat.message)
    ),
    h(
      "button.button.is-small",
      { type: "button", onClick: () => ouvrirPourquoi(etat, slide, { onAction }) },
      icone("fa-circle-question"),
      h("span", {}, "Pourquoi ?")
    )
  );
}

/** Panneau détaillant les six conditions, avec raccourcis de correction. */
export function ouvrirPourquoi(etat, slide, { onAction } = {}) {
  const lignes = etat.raisons.map((raison) =>
    h(
      "li.pourquoi-ligne",
      { class: raison.ok ? "est-ok" : "est-ko" },
      h("span.pourquoi-marque", {}, raison.ok ? "✅" : "❌"),
      h(
        "div",
        {},
        h("div.pourquoi-label", {}, raison.label),
        raison.detail ? h("div.pourquoi-detail", {}, raison.detail) : null,
        raison.correction && onAction
          ? h(
              "button.button.is-small.is-link.is-light.mt-1",
              {
                type: "button",
                onClick: () => onAction(raison.correction),
              },
              raison.correction.label
            )
          : null
      )
    )
  );

  const detailEcrans = etat.parEcran?.length > 1
    ? h(
        "div.mt-4",
        {},
        h("p.heading", {}, "Écran par écran"),
        h(
          "ul.pourquoi-ecrans",
          {},
          etat.parEcran.map((p) =>
            h(
              "li",
              {},
              h(`span.tag.is-${p.etat.ton}.mr-2`, {}, `${p.etat.pastille} ${p.etat.label}`),
              h("strong", {}, p.ecran.name),
              h("span.has-text-grey", {}, ` — ${p.etat.message}`)
            )
          )
        )
      )
    : null;

  modale(
    `Ce slide passe-t-il en ce moment ?`,
    h(
      "div",
      {},
      h(
        `div.notification.is-${etat.ton}.is-light`,
        {},
        h("strong", {}, `${etat.pastille} ${etat.label}`),
        h("p.mb-0", {}, etat.message)
      ),
      h("ul.pourquoi", {}, lignes),
      h(
        "div.mt-4.content.is-small",
        {},
        h("p.heading", {}, "Horaires paramétrés"),
        h("p", {}, describeSchedule(slide.display_times)),
        etat.jusqua
          ? h("p", {}, `Prochain changement d'état : ${formatEcheance(etat.jusqua)}.`)
          : null
      ),
      detailEcrans
    ),
    { boutons: [{ label: "Fermer", classe: "is-primary" }] }
  );
}

/**
 * Bandeau de compteurs cliquables, qui sert aussi de filtre.
 * @param {object} compteurs   { diffusion: 12, ... }
 * @param {string|null} actif  code d'état filtré
 * @param {Function} onFiltre  (code|null) => void
 */
export function compteursEtats(compteurs, actif, onFiltre) {
  const total = Object.values(compteurs).reduce((a, b) => a + b, 0);

  const puce = (code) => {
    const nb = compteurs[code] || 0;
    if (!nb) return null;
    const definition = ETATS[code];
    const selectionne = actif === code;
    return h(
      `button.button.is-small.compteur${selectionne ? ".is-selected" : ""}`,
      {
        type: "button",
        title: definition.label,
        onClick: () => onFiltre(selectionne ? null : code),
      },
      h("span.compteur-point", {}, definition.pastille),
      h("strong", {}, String(nb)),
      h("span.compteur-label", {}, definition.label)
    );
  };

  return h(
    "div.compteurs",
    {},
    h(
      `button.button.is-small.compteur${!actif ? ".is-selected" : ""}`,
      { type: "button", onClick: () => onFiltre(null) },
      h("strong", {}, String(total)),
      h("span.compteur-label", {}, "au total")
    ),
    ORDRE_ETATS.map(puce)
  );
}

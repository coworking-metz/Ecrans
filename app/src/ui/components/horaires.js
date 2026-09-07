/**
 * Éditeur de plages horaires.
 *
 * En v1, ce paramétrage se saisissait en JSON brut, et les options `priority` et
 * `always` — pourtant décisives pour la diffusion — n'apparaissaient nulle part
 * dans l'interface. Ici : un formulaire assisté, un résumé en français, un
 * verdict immédiat, et un mode expert conservé pour les cas particuliers.
 */

import { h, bouton, icone, message } from "../dom.js";
import {
  JOURS,
  parseSchedule,
  serializeSchedule,
  describeRule,
  isInTimeRange,
  nextChange,
} from "../../core/schedule.js";
import { formatEcheance } from "../../core/dates.js";

const RACCOURCIS = [
  {
    label: "Heures d'ouverture",
    regle: {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      start: "08:30",
      end: "19:00",
    },
  },
  { label: "Le midi", regle: { start: "11:30", end: "14:00" } },
  { label: "Le week-end", regle: { days: ["saturday", "sunday"], start: "09:00", end: "20:00" } },
  {
    label: "Une semaine sur deux",
    regle: { weekNumberIs: "even", start: "09:00", end: "18:00" },
  },
];

/**
 * @param {object} options
 * @param {string} options.valeur          contenu de `display_times`
 * @param {Function} options.onChange      (nouvelleValeur) => void
 * @param {boolean} [options.avecPriorite] expose `priority` et `always`
 */
export function editeurHoraires({ valeur, onChange, avecPriorite = true }) {
  const etat = {
    rules: [],
    expert: false,
    brut: valeur || "",
  };

  const analyse = parseSchedule(valeur);
  etat.rules = analyse.rules.map((r) => ({ ...r }));
  // Un JSON illisible ou porteur de clés inconnues ouvre directement en mode
  // expert : on ne réécrit jamais en silence un paramétrage qu'on ne comprend pas.
  if (analyse.erreur || contientClesInconnues(analyse.rules)) etat.expert = true;

  const racine = h("div.editeur-horaires");

  function emettre() {
    const nouvelle = etat.expert ? etat.brut : serializeSchedule(etat.rules);
    onChange(nouvelle);
    rendre();
  }

  function majRegle(index, patch) {
    etat.rules[index] = { ...etat.rules[index], ...patch };
    // On ne conserve pas les clés vides : le JSON reste lisible.
    for (const [cle, v] of Object.entries(etat.rules[index])) {
      if (v === "" || v === null || v === undefined || v === false) delete etat.rules[index][cle];
      if (Array.isArray(v) && v.length === 0) delete etat.rules[index][cle];
    }
    emettre();
  }

  /* ---- Rendu d'une règle ------------------------------------------------ */

  function carteRegle(regle, index) {
    const jours = Array.isArray(regle.days) ? regle.days : [];
    const tousLesJours = jours.length === 0;

    const caseJour = (jour) =>
      h(
        "label.checkbox.jour",
        { class: tousLesJours || jours.includes(jour.cle) ? "est-coche" : "" },
        h("input", {
          type: "checkbox",
          checked: tousLesJours || jours.includes(jour.cle),
          onChange: (e) => {
            const base = tousLesJours ? JOURS.map((j) => j.cle) : [...jours];
            const suivant = e.target.checked
              ? [...new Set([...base, jour.cle])]
              : base.filter((c) => c !== jour.cle);
            majRegle(index, { days: suivant.length === 7 ? [] : suivant });
          },
        }),
        h("span", {}, jour.court),
        h("span.jour-nom", {}, jour.nom)
      );

    const semaine = regle.weekNumberIs ?? "";
    const modeSemaine =
      semaine === "" ? "toutes" : semaine === "even" || semaine === "odd" ? semaine : "numero";

    const radioSemaine = (valeurRadio, libelle) =>
      h(
        "label.radio",
        {},
        h("input", {
          type: "radio",
          name: `semaine-${index}`,
          checked: modeSemaine === valeurRadio,
          onChange: () => {
            if (valeurRadio === "toutes") majRegle(index, { weekNumberIs: "" });
            else if (valeurRadio === "numero") majRegle(index, { weekNumberIs: "1" });
            else majRegle(index, { weekNumberIs: valeurRadio });
          },
        }),
        ` ${libelle}`
      );

    return h(
      "div.box.regle",
      {},
      h(
        "div.regle-entete",
        {},
        h("span.heading.mb-0", {}, `Règle ${index + 1}`),
        h(
          "button.delete",
          {
            type: "button",
            title: "Supprimer cette règle",
            onClick: () => {
              etat.rules.splice(index, 1);
              emettre();
            },
          }
        )
      ),

      h(
        "div.field",
        {},
        h("label.label.is-small", {}, "Jours"),
        h(
          "div.jours",
          {},
          JOURS.map(caseJour),
          h(
            "div.jours-raccourcis",
            {},
            bouton("Tous", {
              classe: "is-small is-light",
              onClick: () => majRegle(index, { days: [] }),
            }),
            bouton("Semaine", {
              classe: "is-small is-light",
              onClick: () =>
                majRegle(index, {
                  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
                }),
            })
          )
        )
      ),

      h(
        "div.field.is-grouped.horaires-bornes",
        {},
        h(
          "div.field",
          {},
          h("label.label.is-small", {}, "De"),
          h("input.input.is-small", {
            type: "time",
            value: regle.start || "",
            onChange: (e) => majRegle(index, { start: e.target.value }),
          })
        ),
        h(
          "div.field",
          {},
          h("label.label.is-small", {}, "à"),
          h("input.input.is-small", {
            type: "time",
            value: regle.end || "",
            onChange: (e) => majRegle(index, { end: e.target.value }),
          })
        )
      ),

      h(
        "div.field",
        {},
        h("label.label.is-small", {}, "Semaines"),
        h(
          "div.control.semaines",
          {},
          radioSemaine("toutes", "Toutes"),
          radioSemaine("even", "Paires"),
          radioSemaine("odd", "Impaires"),
          radioSemaine("numero", "Numéro"),
          modeSemaine === "numero"
            ? h("input.input.is-small.numero-semaine", {
                type: "number",
                min: 1,
                max: 53,
                value: semaine,
                onChange: (e) => majRegle(index, { weekNumberIs: e.target.value }),
              })
            : null
        )
      ),

      avecPriorite
        ? h(
            "div.field.options-diffusion",
            {},
            h(
              "label.checkbox",
              {},
              h("input", {
                type: "checkbox",
                checked: !!regle.priority,
                onChange: (e) => majRegle(index, { priority: e.target.checked }),
              }),
              " Slide prioritaire",
              h(
                "span.help.is-inline",
                {},
                " — pendant cette plage, il écarte tous les slides non permanents de l'écran."
              )
            ),
            h(
              "label.checkbox",
              {},
              h("input", {
                type: "checkbox",
                checked: !!regle.always,
                onChange: (e) => majRegle(index, { always: e.target.checked }),
              }),
              " Diffusion permanente",
              h("span.help.is-inline", {}, " — il résiste aux slides prioritaires.")
            )
          )
        : null,

      h("p.regle-resume", {}, describeRule(regle))
    );
  }

  /* ---- Rendu global ----------------------------------------------------- */

  function rendre() {
    const brutCourant = etat.expert ? etat.brut : serializeSchedule(etat.rules);
    const analyseCourante = parseSchedule(brutCourant);
    const maintenant = new Date();
    const passe = isInTimeRange(brutCourant, maintenant);
    const bascule = nextChange(brutCourant, maintenant);

    const verdict = analyseCourante.erreur
      ? h(
          "p.notification.is-danger.is-light.py-2",
          {},
          `⛔ ${analyseCourante.erreur} — tant que le paramétrage est illisible, le slide est diffusé en permanence.`
        )
      : analyseCourante.vide
      ? h("p.notification.is-info.is-light.py-2", {}, "🟢 Aucune restriction : diffusion permanente.")
      : h(
          `p.notification.is-${passe ? "success" : "warning"}.is-light.py-2`,
          {},
          passe
            ? `🟢 Ce slide passe en ce moment${bascule ? `, jusqu'${formatEcheance(bascule)}` : ""}.`
            : `🟡 Ce slide ne passe pas en ce moment${
                bascule ? ` — reprise ${formatEcheance(bascule)}` : " et aucune reprise n'est prévue"
              }.`
        );

    racine.replaceChildren(
      h(
        "div.horaires-entete",
        {},
        h("label.label.mb-0", {}, "Horaires d'affichage"),
        h(
          "div.buttons.are-small.mb-0",
          {},
          h(
            "button.button.is-small",
            {
              type: "button",
              class: etat.expert ? "" : "is-link is-light",
              onClick: () => {
                if (!etat.expert) return;
                const analyse = parseSchedule(etat.brut);
                if (analyse.erreur) {
                  message(
                    "Le JSON doit être valide avant de revenir au mode assisté.",
                    { ton: "warning" }
                  );
                  return;
                }
                if (contientClesInconnues(analyse.rules)) {
                  message(
                    "Ce paramétrage contient des options que le mode assisté ne sait pas afficher : il resterait incomplet. Modification en mode expert uniquement.",
                    { ton: "warning", duree: 10000 }
                  );
                  return;
                }
                etat.rules = analyse.rules.map((r) => ({ ...r }));
                etat.expert = false;
                emettre();
              },
            },
            "Assisté"
          ),
          h(
            "button.button.is-small",
            {
              type: "button",
              class: etat.expert ? "is-link is-light" : "",
              onClick: () => {
                if (etat.expert) return;
                etat.brut = serializeSchedule(etat.rules);
                etat.expert = true;
                emettre();
              },
            },
            "Expert (JSON)"
          )
        )
      ),

      etat.expert
        ? h(
            "div",
            {},
            h("textarea.textarea.is-small.is-family-monospace", {
              rows: 12,
              spellcheck: false,
              value: etat.brut,
              placeholder: EXEMPLE,
              onInput: (e) => {
                etat.brut = e.target.value;
                onChange(etat.brut);
              },
              onBlur: () => rendre(),
            }),
            h("p.help", {}, "Un tableau de règles. Les règles sont alternatives : le slide passe si au moins l'une d'elles est satisfaite.")
          )
        : h(
            "div",
            {},
            etat.rules.length === 0
              ? h(
                  "p.notification.is-light.py-2",
                  {},
                  "Aucune restriction : ce slide est diffusable en permanence."
                )
              : etat.rules.map(carteRegle),
            h(
              "div.buttons.are-small.mt-2",
              {},
              bouton("Ajouter une règle", {
                icone: "fa-plus",
                classe: "is-small",
                onClick: () => {
                  etat.rules.push({ start: "09:00", end: "18:00" });
                  emettre();
                },
              }),
              RACCOURCIS.map((r) =>
                bouton(r.label, {
                  classe: "is-small is-light",
                  onClick: () => {
                    etat.rules.push({ ...r.regle });
                    emettre();
                  },
                })
              )
            )
          ),

      verdict
    );
  }

  rendre();
  return racine;
}

/** Clés que le mode assisté sait représenter. */
const CLES_CONNUES = new Set(["days", "start", "end", "weekNumberIs", "priority", "always"]);

function contientClesInconnues(rules) {
  return rules.some((r) => Object.keys(r).some((c) => !CLES_CONNUES.has(c)));
}

const EXEMPLE = `[
  {
    "days": ["monday", "wednesday", "friday"],
    "start": "09:00",
    "end": "12:30",
    "weekNumberIs": "odd"
  }
]`;

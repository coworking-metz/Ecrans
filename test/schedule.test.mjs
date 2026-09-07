import test from "node:test";
import assert from "node:assert/strict";

import {
  isInTimeRange,
  hasPriority,
  isAlways,
  getIsoWeek,
  nextChange,
  parseSchedule,
  describeSchedule,
  segmentsDuJour,
} from "../src/core/schedule.js";

/** Un instant local précis, pour des tests reproductibles. */
const le = (iso) => new Date(iso);

/* -------------------------------------------------------------------------- */
/*  Correctif 1 : les règles sont ALTERNATIVES                                 */
/* -------------------------------------------------------------------------- */

test("règles alternatives : la 2e règle est évaluée même si la 1re ne s'applique pas", () => {
  // C'est exactement le cas que la v1 ratait : elle sortait de la boucle sur la
  // règle « monday » et n'évaluait jamais la règle « thursday ».
  const horaires = JSON.stringify([
    { days: ["monday"], start: "09:00", end: "12:00" },
    { days: ["thursday"], start: "14:00", end: "18:00" },
  ]);

  // Jeudi 12 mars 2026, 15:00 -> doit passer.
  assert.equal(isInTimeRange(horaires, le("2026-03-12T15:00:00")), true);
  // Lundi 9 mars 2026, 10:00 -> doit passer aussi.
  assert.equal(isInTimeRange(horaires, le("2026-03-09T10:00:00")), true);
  // Mercredi 11 mars 2026, 15:00 -> ne doit pas passer.
  assert.equal(isInTimeRange(horaires, le("2026-03-11T15:00:00")), false);
});

test("règles alternatives sur la parité de semaine", () => {
  const horaires = JSON.stringify([
    { weekNumberIs: "even", start: "08:00", end: "10:00" },
    { weekNumberIs: "odd", start: "18:00", end: "20:00" },
  ]);
  // Semaine 11 de 2026 (impaire), mardi 10 mars, 19:00 : la 1re règle ne
  // s'applique pas, la 2e doit quand même être évaluée.
  assert.equal(getIsoWeek(le("2026-03-10T19:00:00")) % 2, 1);
  assert.equal(isInTimeRange(horaires, le("2026-03-10T19:00:00")), true);
});

/* -------------------------------------------------------------------------- */
/*  Correctif 2 : numéro de semaine ISO 8601                                   */
/* -------------------------------------------------------------------------- */

test("numéro de semaine ISO 8601", () => {
  // Références connues de la norme.
  assert.equal(getIsoWeek(le("2026-01-01T12:00:00")), 1); // jeudi -> semaine 1
  assert.equal(getIsoWeek(le("2026-01-05T12:00:00")), 2); // lundi suivant
  assert.equal(getIsoWeek(le("2025-12-29T12:00:00")), 1); // appartient à 2026
  assert.equal(getIsoWeek(le("2024-12-30T12:00:00")), 1); // appartient à 2025
  assert.equal(getIsoWeek(le("2021-01-04T12:00:00")), 1);
  assert.equal(getIsoWeek(le("2020-12-31T12:00:00")), 53); // 2020 a 53 semaines
});

test("l'ancienne formule de semaine divergeait en début d'année", () => {
  const ancienne = (date) => {
    const oneJan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(((date - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  };
  const d = le("2026-01-01T12:00:00");
  // Ancienne : 1 également ici, mais la parité diverge plus loin dans l'année.
  const divergences = [];
  for (let i = 0; i < 365; i++) {
    const jour = new Date(2026, 0, 1 + i);
    if (ancienne(jour) % 2 !== getIsoWeek(jour) % 2) divergences.push(jour.toDateString());
  }
  assert.ok(
    divergences.length > 0,
    "on documente que la parité des semaines change avec le correctif"
  );
  assert.ok(ancienne(d) >= 1);
});

/* -------------------------------------------------------------------------- */
/*  Analyse et tolérance                                                       */
/* -------------------------------------------------------------------------- */

test("valeurs vides et chaîne littérale \"null\" = diffusion permanente", () => {
  for (const valeur of [null, undefined, "", "   ", "null", "[]"]) {
    assert.equal(parseSchedule(valeur).vide, true, `pour ${JSON.stringify(valeur)}`);
    assert.equal(isInTimeRange(valeur, le("2026-03-12T03:00:00")), true);
  }
});

test("un JSON illisible ne fait pas disparaître le slide", () => {
  const analyse = parseSchedule("[{oups}]");
  assert.ok(analyse.erreur);
  assert.equal(isInTimeRange("[{oups}]", new Date()), true);
});

test("une règle sans horaire ne restreint pas la diffusion", () => {
  const horaires = JSON.stringify([{ priority: true }]);
  assert.equal(isInTimeRange(horaires, le("2026-03-12T03:00:00")), true);
  assert.equal(hasPriority(horaires), true);
  assert.equal(isAlways(horaires), false);
});

test("bornes de plage inclusives", () => {
  const horaires = JSON.stringify([{ start: "09:00", end: "18:00" }]);
  assert.equal(isInTimeRange(horaires, le("2026-03-12T09:00:00")), true);
  assert.equal(isInTimeRange(horaires, le("2026-03-12T18:00:00")), true);
  assert.equal(isInTimeRange(horaires, le("2026-03-12T18:01:00")), false);
  assert.equal(isInTimeRange(horaires, le("2026-03-12T08:59:00")), false);
});

/* -------------------------------------------------------------------------- */
/*  Prochaine bascule                                                          */
/* -------------------------------------------------------------------------- */

test("nextChange trouve la fin de la plage en cours", () => {
  const horaires = JSON.stringify([{ start: "09:00", end: "18:00" }]);
  const bascule = nextChange(horaires, le("2026-03-12T10:00:00"));
  assert.equal(bascule.getHours(), 18);
  assert.equal(bascule.getMinutes(), 1);
});

test("nextChange trouve la prochaine ouverture", () => {
  const horaires = JSON.stringify([{ days: ["monday"], start: "09:00", end: "12:00" }]);
  // Samedi -> prochaine ouverture lundi 09:00.
  const bascule = nextChange(horaires, le("2026-03-14T15:00:00"));
  assert.equal(bascule.getDay(), 1);
  assert.equal(bascule.getHours(), 9);
});

test("nextChange renvoie null si aucune plage", () => {
  assert.equal(nextChange("", new Date()), null);
});

/* -------------------------------------------------------------------------- */
/*  Description et frise                                                       */
/* -------------------------------------------------------------------------- */

test("description en français", () => {
  assert.equal(describeSchedule(""), "Diffusion permanente");
  assert.equal(
    describeSchedule(
      JSON.stringify([
        { days: ["monday", "tuesday", "wednesday", "thursday", "friday"], start: "09:00", end: "18:00" },
      ])
    ),
    "du lundi au vendredi, de 09:00 à 18:00"
  );
  assert.match(
    describeSchedule(JSON.stringify([{ start: "09:00", end: "18:00", priority: true }])),
    /prioritaire/
  );
});

test("segments du jour pour la frise", () => {
  const horaires = JSON.stringify([
    { days: ["thursday"], start: "09:00", end: "12:00" },
    { days: ["thursday"], start: "14:00", end: "18:00" },
  ]);
  const segments = segmentsDuJour(horaires, le("2026-03-12T00:00:00"));
  assert.equal(segments.length, 2);
  assert.deepEqual(
    segments.map((s) => [s.debut, s.fin]),
    [
      [540, 720],
      [840, 1080],
    ]
  );
  // Un vendredi : aucun segment.
  assert.equal(segmentsDuJour(horaires, le("2026-03-13T00:00:00")).length, 0);
});

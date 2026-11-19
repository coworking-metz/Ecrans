/**
 * État de diffusion d'un slide.
 *
 * C'est la règle la plus lourde de conséquences de l'application : elle décide
 * de ce qui s'affiche sur les téléviseurs, et elle est partagée par le lecteur
 * et par l'administration. Elle ne dépend ni de Vue ni du DOM, donc elle se
 * teste directement.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { computeSlideState, compterEtats, slidePrioritaireEnCours } from "../src/core/state.js";
import { eligibleSlides } from "../src/core/playlist.js";

const MAINTENANT = new Date("2026-03-12T15:00:00"); // un jeudi
const ECRAN = { id: 1, name: "Accueil", slideSort: [] };

function slide(patch = {}) {
  return {
    id: 1,
    name: "Un slide",
    type: "default",
    duration: 10,
    active: true,
    trash: false,
    publication: null,
    expiration: null,
    display_times: "",
    meta: {},
    ...patch,
  };
}

const contexte = (patch = {}) => ({
  now: MAINTENANT,
  ecrans: [ECRAN],
  ecran: ECRAN,
  slidesDeLEcran: [],
  ...patch,
});

/* -------------------------------------------------------------------------- */

test("un slide sans contrainte est en diffusion", () => {
  const etat = computeSlideState(slide(), contexte());
  assert.equal(etat.etat, "diffusion");
});

test("la corbeille prime sur tout le reste", () => {
  const etat = computeSlideState(slide({ trash: true, active: false }), contexte());
  assert.equal(etat.etat, "corbeille");
});

test("un slide désactivé annonce la portée de la coupure", () => {
  const deuxEcrans = [ECRAN, { id: 2, name: "Cafétéria" }];
  const etat = computeSlideState(slide({ active: false }), contexte({ ecrans: deuxEcrans }));
  assert.equal(etat.etat, "desactive");
  assert.match(etat.message, /2 écrans/);
});

test("un slide rattaché à aucun écran est signalé comme orphelin", () => {
  const etat = computeSlideState(slide(), contexte({ ecrans: [], ecran: null }));
  assert.equal(etat.etat, "orphelin");
});

test("les dates de publication et d'expiration", () => {
  const programme = computeSlideState(
    slide({ publication: "2026-03-20T08:00:00" }),
    contexte()
  );
  assert.equal(programme.etat, "programme");
  assert.ok(programme.jusqua, "l'échéance doit être connue");

  const expire = computeSlideState(slide({ expiration: "2026-03-01T08:00:00" }), contexte());
  assert.equal(expire.etat, "expire");
});

test("hors plage horaire, l'état annonce la reprise", () => {
  const horaires = JSON.stringify([{ days: ["monday"], start: "09:00", end: "12:00" }]);
  const etat = computeSlideState(slide({ display_times: horaires }), contexte());
  assert.equal(etat.etat, "hors_plage");
  assert.match(etat.message, /reprendra/);
  assert.equal(etat.jusqua.getDay(), 1, "la reprise tombe un lundi");
});

test("un slide prioritaire écarte les autres, sauf les permanents", () => {
  const prioritaire = slide({
    id: 10,
    name: "Fermeture exceptionnelle",
    display_times: JSON.stringify([{ start: "14:00", end: "18:00", priority: true }]),
  });
  const ordinaire = slide({ id: 11 });
  const permanent = slide({
    id: 12,
    display_times: JSON.stringify([{ start: "00:00", end: "23:59", always: true }]),
  });
  const tous = [prioritaire, ordinaire, permanent];

  assert.equal(slidePrioritaireEnCours(tous, MAINTENANT)?.id, 10);

  const etatOrdinaire = computeSlideState(ordinaire, contexte({ slidesDeLEcran: tous }));
  assert.equal(etatOrdinaire.etat, "ecarte");
  assert.match(etatOrdinaire.message, /Fermeture exceptionnelle/);

  assert.equal(
    computeSlideState(permanent, contexte({ slidesDeLEcran: tous })).etat,
    "diffusion"
  );
  assert.equal(
    computeSlideState(prioritaire, contexte({ slidesDeLEcran: tous })).etat,
    "diffusion"
  );
});

test("l'explication couvre chaque condition, avec son verdict", () => {
  const etat = computeSlideState(slide(), contexte());
  assert.ok(etat.raisons.length >= 6, "les six conditions doivent être listées");
  assert.ok(etat.raisons.every((r) => typeof r.ok === "boolean" && r.label));
});

test("un paramétrage horaire illisible est signalé, sans masquer le slide", () => {
  const etat = computeSlideState(slide({ display_times: "[{oups}]" }), contexte());
  assert.equal(etat.etat, "erreur");
  assert.match(etat.message, /permanence/);
});

test("compterEtats regroupe par code", () => {
  const compteurs = compterEtats([{ etat: "diffusion" }, { etat: "diffusion" }, { etat: "expire" }]);
  assert.equal(compteurs.diffusion, 2);
  assert.equal(compteurs.expire, 1);
  assert.equal(compteurs.corbeille, 0);
});

/* -------------------------------------------------------------------------- */

test("le diaporama applique les mêmes règles que l'état", () => {
  // C'est le point important : le lecteur et l'administration ne doivent jamais
  // diverger. Ce que `computeSlideState` annonce « en diffusion » est
  // exactement ce que `eligibleSlides` retient.
  const slides = [
    slide({ id: 1 }),
    slide({ id: 2, active: false }),
    slide({ id: 3, expiration: "2026-01-01T00:00:00" }),
    slide({ id: 4, display_times: JSON.stringify([{ days: ["monday"], start: "09:00", end: "12:00" }]) }),
  ];
  const liens = slides.map((s) => ({ ecran_id: ECRAN.id, slide_id: s.id }));

  const retenus = eligibleSlides(ECRAN, slides, liens, MAINTENANT).map((s) => s.id);
  assert.deepEqual(retenus, [1]);

  for (const s of slides) {
    const etat = computeSlideState(s, contexte({ slidesDeLEcran: slides }));
    assert.equal(
      etat.etat === "diffusion",
      retenus.includes(s.id),
      `slide ${s.id} : l'état « ${etat.etat} » contredit le diaporama`
    );
  }
});

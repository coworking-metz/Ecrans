/**
 * Montage du LECTEUR depuis le bundle de production.
 *
 * C'est la page qui tourne sans surveillance sur les téléviseurs : si elle ne
 * monte pas, les écrans du lieu restent noirs.
 *
 * Exige un `npm run build` préalable.
 */

import { describe, expect, test, beforeAll } from "vitest";
import {
  bundleConstruit,
  importerBundle,
  patienter,
  preparerEnvironnement,
  PLANTAGE,
} from "./bundle-outils.js";

describe.skipIf(!bundleConstruit)("bundle — lecteur", () => {
  let erreurs;

  beforeAll(() => {
    erreurs = preparerEnvironnement();
  });

  test("le lecteur monte", async () => {
    document.body.innerHTML = '<div id="lecteur"></div>';

    await importerBundle("visionner.js");
    await patienter(300);

    const lecteur = document.getElementById("lecteur");
    expect(lecteur.innerHTML.length, "le lecteur doit rendre").toBeGreaterThan(0);

    // Sans écran demandé ni réseau, il affiche son écran d'attente plutôt que
    // de rester vide.
    expect(lecteur.querySelector(".rendu"), "un rendu doit être présent").toBeTruthy();

    expect(erreurs.join("\n")).not.toMatch(PLANTAGE);
  });
});

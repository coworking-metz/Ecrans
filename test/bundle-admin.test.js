/**
 * Montage de l'ADMINISTRATION, depuis le bundle de production, avec le code
 * d'accès déjà mémorisé.
 *
 * C'est exactement ce que voit un utilisateur en production, et c'est la
 * branche qui était tombée : les tests sur les sources passaient, parce que le
 * compilateur de templates n'optimise qu'en production, et les tests du bundle
 * ne couvraient que l'écran de connexion.
 *
 * Exige un `npm run build` préalable.
 */

import { describe, expect, test, beforeAll } from "vitest";
import {
  bundleConstruit,
  codeDacces,
  importerBundle,
  patienter,
  preparerEnvironnement,
  PLANTAGE,
} from "./bundle-outils.js";

describe.skipIf(!bundleConstruit)("bundle — administration", () => {
  let erreurs;

  beforeAll(() => {
    erreurs = preparerEnvironnement();
  });

  test("l'administration monte, code d'accès mémorisé", async () => {
    const code = codeDacces();
    expect(code, "VITE_APP_PASSWORD doit être lisible pour ce test").toBeTruthy();
    localStorage.setItem("auth", code);
    document.body.innerHTML = '<div id="app"></div>';

    await importerBundle("index.js");
    await patienter(300);

    const app = document.getElementById("app");
    expect(app.innerHTML.length, "l'application doit rendre").toBeGreaterThan(0);
    expect(app.querySelector("nav.navbar"), "la navigation doit être rendue").toBeTruthy();

    // Le réseau est coupé : l'application doit le dire, pas planter.
    expect(app.textContent).toContain("Chargement impossible");

    expect(erreurs.join("\n")).not.toMatch(PLANTAGE);
  });
});

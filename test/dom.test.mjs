/**
 * Analyse du sélecteur de `h()`.
 *
 * Un défaut ici est silencieux et coûteux : `h("div#vue")` créait un élément
 * sans identifiant, et le conteneur de vue restait introuvable au démarrage.
 */

import test from "node:test";
import assert from "node:assert/strict";

// Stub minimal : `h` ne touche au document que pour créer les éléments.
globalThis.document = {
  createElement(nom) {
    return {
      tagName: nom.toUpperCase(),
      id: "",
      className: "",
      style: {},
      dataset: {},
      enfants: [],
      append(...n) {
        this.enfants.push(...n);
      },
      addEventListener() {},
      setAttribute(cle, valeur) {
        this[`attr:${cle}`] = valeur;
      },
    };
  },
  createTextNode(t) {
    return { nodeType: 3, texte: String(t) };
  },
};

const { h, rendre } = await import("../src/ui/dom.js");

test("balise seule", () => {
  const n = h("section");
  assert.equal(n.tagName, "SECTION");
  assert.equal(n.id, "");
  assert.equal(n.className, "");
});

test("classes", () => {
  const n = h("div.box.mb-4");
  assert.equal(n.tagName, "DIV");
  assert.equal(n.className, "box mb-4");
});

test("identifiant", () => {
  const n = h("div#vue");
  assert.equal(n.tagName, "DIV");
  assert.equal(n.id, "vue");
});

test("identifiant et classes", () => {
  const n = h("div#messages.notification.is-danger");
  assert.equal(n.id, "messages");
  assert.equal(n.className, "notification is-danger");
});

test("un segment peut contenir plusieurs classes séparées par des espaces", () => {
  // Forme produite par `bouton({ classe: "is-small is-light" })`.
  const n = h("button.button.is-small is-light");
  assert.equal(n.className, "button is-small is-light");
});

test("les tableaux d'éléments sont aplatis, pas transformés en texte", () => {
  // `replaceChildren` (natif) convertit un tableau en une chaîne :
  // « [object HTMLElement],[object HTMLElement],… ». `rendre` doit aplatir.
  const conteneur = {
    enfants: [],
    replaceChildren() {
      this.enfants = [];
    },
    append(...n) {
      this.enfants.push(...n);
    },
  };

  const lignes = [{ nodeType: 1, nom: "a" }, { nodeType: 1, nom: "b" }];
  rendre(conteneur, { nodeType: 1, nom: "entete" }, lignes, null);

  assert.equal(conteneur.enfants.length, 3);
  assert.deepEqual(
    conteneur.enfants.map((e) => e.nom),
    ["entete", "a", "b"]
  );
  assert.ok(
    conteneur.enfants.every((e) => e.nodeType === 1),
    "aucun nœud texte ne doit être créé"
  );
});

test("h() aplatit aussi les tableaux d'enfants", () => {
  const n = h("div", {}, [{ nodeType: 1 }, { nodeType: 1 }], { nodeType: 1 });
  assert.equal(n.enfants.length, 3);
});

test("`value` est appliqué après les enfants", () => {
  // Sur un <select>, poser `value` avant que les <option> existent ne
  // sélectionne rien.
  const ordre = [];
  globalThis.document.createElement = (nom) => ({
    tagName: nom.toUpperCase(),
    id: "",
    className: "",
    style: {},
    dataset: {},
    set value(v) {
      ordre.push(`value=${v}`);
    },
    get value() {
      return "";
    },
    append() {
      ordre.push("enfant");
    },
    addEventListener() {},
    setAttribute() {},
  });

  h("select", { value: "b" }, { nodeType: 1 }, { nodeType: 1 });
  assert.deepEqual(ordre, ["enfant", "enfant", "value=b"]);
});

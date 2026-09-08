/**
 * Outillage commun aux tests du bundle de production.
 *
 * Chaque test de bundle vit dans son PROPRE fichier : vitest isole les modules
 * par fichier, et deux applications montées dans le même document se marchent
 * dessus — la seconde efface le DOM de la première, qui continue de tourner et
 * produit des erreurs trompeuses.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DIST = path.resolve(import.meta.dirname, "..", "dist");

export const bundleConstruit = fs.existsSync(path.join(DIST, "assets", "index.js"));

export function importerBundle(nom) {
  return import(pathToFileURL(path.join(DIST, "assets", nom)).href);
}

/** Le code d'accès tel qu'il est compilé dans le bundle. */
export function codeDacces() {
  const fichier = path.resolve(import.meta.dirname, "..", ".env");
  if (!fs.existsSync(fichier)) return null;
  const ligne = fs
    .readFileSync(fichier, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("VITE_APP_PASSWORD="));
  return ligne ? ligne.slice("VITE_APP_PASSWORD=".length).trim() : null;
}

/**
 * Coupe le réseau et capture ce que Vue écrit dans la console.
 * @returns {string[]} les messages d'erreur, alimentés au fil du test
 */
export function preparerEnvironnement() {
  const erreurs = [];

  // Serveur injoignable. Une réponse 503 plutôt qu'un rejet : c'est plus proche
  // de la réalité, et cela évite les rejets non capturés des utilitaires de
  // préchargement de Vite, qui feraient échouer la campagne de tests.
  globalThis.fetch = () =>
    Promise.resolve(new Response("", { status: 503, statusText: "Service Unavailable" }));
  globalThis.WebSocket = class {
    constructor() {
      this.readyState = 0;
    }
    close() {}
    send() {}
  };

  const original = console.error;
  console.error = (...args) => {
    erreurs.push(args.map(String).join(" "));
    original(...args);
  };

  return erreurs;
}

/** Aucune de ces erreurs ne doit apparaître : ce sont des plantages de rendu. */
export const PLANTAGE = /nextSibling|Cannot read|is null|is not a function|__vccOpts/;

export const patienter = (ms) => new Promise((r) => setTimeout(r, ms));

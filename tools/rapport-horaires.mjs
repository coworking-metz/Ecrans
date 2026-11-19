/**
 * Rapport de bascule v1 → v2 sur les plages horaires.
 *
 * Les deux correctifs de `core/schedule.js` changent l'évaluation :
 *   1. les règles deviennent alternatives (la v1 sortait de la boucle) ;
 *   2. le numéro de semaine suit la norme ISO 8601.
 *
 * Conséquence : des slides qui ne s'affichaient plus vont revenir en diffusion,
 * et quelques slides en parité de semaine vont changer de semaine.
 *
 * Ce script ne modifie RIEN. Il compare, sur huit semaines et par pas de quinze
 * minutes, ce que la v1 diffusait et ce que la v2 diffusera, et liste les slides
 * concernés — à relire avant la bascule.
 *
 * Il propose aussi une CONVERSION pour un cas particulier fréquent : une règle
 * ne portant qu'un `weekNumberIs`, sans horaire. En v1, grâce au `break`, elle
 * agissait comme un filtre global sur les règles suivantes — ce qui était sans
 * doute l'intention de l'auteur. En v2, une règle sans horaire ne contraint
 * rien : elle devient inerte, et le slide passerait toutes les semaines au lieu
 * d'une sur deux. La conversion reporte la parité dans les règles suivantes et
 * supprime la règle isolée, rendant l'intention explicite et modifiable dans
 * l'éditeur assisté.
 *
 *   node tools/rapport-horaires.mjs              rapport seul
 *   node tools/rapport-horaires.mjs --convertir  applique la conversion
 *   node tools/rapport-horaires.mjs --json       sortie exploitable
 */

import fs from "node:fs";
import path from "node:path";
import { isInTimeRange as evaluerV2 } from "../src/core/schedule.js";

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SORTIE_JSON = process.argv.includes("--json");
const CONVERTIR = process.argv.includes("--convertir");

/* ---- Configuration -------------------------------------------------------- */

function lireEnv() {
  const fichier = path.join(RACINE, ".env");
  if (!fs.existsSync(fichier)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(fichier, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = { ...lireEnv(), ...process.env };
const URL_BASE = (env.VITE_APP_SUPABASE_URL || "https://lvsbvjweppdlhmjuqqvt.supabase.co") + "/rest/v1";
const CLE = env.VITE_APP_SUPABASE_KEY;

if (!CLE) {
  console.error("VITE_APP_SUPABASE_KEY absente (.env ou variable d'environnement).");
  process.exit(1);
}

async function api(chemin, options = {}) {
  const r = await fetch(`${URL_BASE}/${chemin}`, {
    headers: {
      apikey: CLE,
      Authorization: `Bearer ${CLE}`,
      "Content-Type": "application/json",
    },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  if (r.status === 204) return null;
  const texte = await r.text();
  return texte ? JSON.parse(texte) : null;
}

/* ---- Conversion ----------------------------------------------------------- */

/** Une règle qui ne porte qu'une contrainte de semaine, sans horaire ni jours. */
function estFiltreIsole(regle) {
  const cles = Object.keys(regle);
  return (
    regle.weekNumberIs !== undefined &&
    !regle.start &&
    !regle.end &&
    !regle.days &&
    cles.every((c) => c === "weekNumberIs")
  );
}

/**
 * Reporte les filtres de semaine isolés dans les règles qui suivent, puis les
 * supprime. Renvoie null si le slide n'est pas concerné.
 */
function convertirRegles(brut) {
  let regles;
  try {
    regles = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!Array.isArray(regles) || !regles.some(estFiltreIsole)) return null;

  const sortie = [];
  let filtreActif = null;
  for (const regle of regles) {
    if (estFiltreIsole(regle)) {
      filtreActif = regle.weekNumberIs;
      continue; // la règle isolée disparaît
    }
    sortie.push(
      filtreActif !== null && regle.weekNumberIs === undefined
        ? { ...regle, weekNumberIs: filtreActif }
        : { ...regle }
    );
  }
  return sortie.length ? JSON.stringify(sortie, null, 2) : null;
}

/* ---- Réplique EXACTE de l'évaluation v1 ----------------------------------- */

function semaineV1(date) {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
}

function evaluerV1(brut, now) {
  if (brut === "null" || !brut) return true;
  let regles;
  try {
    regles = JSON.parse(brut);
  } catch {
    return true; // la v1 aurait levé une exception ; on neutralise la comparaison
  }
  if (!regles || !Array.isArray(regles)) return true;

  const jour = now.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
  const heure = now.getHours() * 100 + now.getMinutes();
  const semaine = semaineV1(now);
  const paire = semaine % 2 === 0;

  for (const regle of regles) {
    if (regle.weekNumberIs) {
      if (regle.weekNumberIs === "even" && !paire) break; // <- le `break` fautif
      if (regle.weekNumberIs === "odd" && paire) break;
      if (!isNaN(regle.weekNumberIs) && Number(regle.weekNumberIs) !== semaine) break;
    }
    if (regle.days && !regle.days.includes(jour)) break; // <- idem
    const debut = parseInt(String(regle.start ?? "").replace(":", ""), 10);
    const fin = parseInt(String(regle.end ?? "").replace(":", ""), 10);
    if (!debut && !fin) continue;
    if (heure >= debut && heure <= fin) return true;
  }
  return false;
}

/* ---- Échantillonnage ------------------------------------------------------ */

function* instants(semaines = 8) {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7)); // lundi de cette semaine
  const total = semaines * 7 * 24 * 4; // pas de 15 minutes
  for (let i = 0; i < total; i++) yield new Date(debut.getTime() + i * 15 * 60000);
}

/* ---- Rapport -------------------------------------------------------------- */

const [slides, liens, ecrans] = await Promise.all([
  api("slides?select=*&order=id"),
  api("liens_ecrans_slides?select=*"),
  api("ecrans?select=id,name"),
]);

const nomEcran = new Map(ecrans.map((e) => [e.id, e.name]));
const ecransDe = (id) =>
  liens.filter((l) => l.slide_id === id).map((l) => nomEcran.get(l.ecran_id) ?? `#${l.ecran_id}`);

const points = [...instants()];
const impactes = [];

for (const slide of slides) {
  const brut = slide.display_times;
  if (!brut || brut === "null") continue;

  let avant = 0;
  let apres = 0;
  let premierGain = null;
  let premierePerte = null;

  for (const instant of points) {
    const v1 = evaluerV1(brut, instant);
    const v2 = evaluerV2(brut, instant);
    if (v1) avant++;
    if (v2) apres++;
    if (!v1 && v2 && !premierGain) premierGain = instant;
    if (v1 && !v2 && !premierePerte) premierePerte = instant;
  }

  if (avant === apres && !premierGain && !premierePerte) continue;

  // La conversion rétablit-elle le comportement voulu ?
  const converti = convertirRegles(brut);
  let convertiIdentiqueAV1 = null;
  let heuresConverti = null;
  if (converti) {
    let ok = true;
    let compte = 0;
    for (const instant of points) {
      const v2c = evaluerV2(converti, instant);
      if (v2c) compte++;
      if (v2c !== evaluerV1(brut, instant)) ok = false;
    }
    convertiIdentiqueAV1 = ok;
    heuresConverti = +(compte / 4).toFixed(1);
  }

  impactes.push({
    id: slide.id,
    nom: slide.name,
    type: slide.type,
    actif: slide.active !== false,
    corbeille: !!slide.trash,
    ecrans: ecransDe(slide.id),
    display_times: brut,
    heuresAvant: +(avant / 4).toFixed(1),
    heuresApres: +(apres / 4).toFixed(1),
    sens: apres > avant ? "revient en diffusion" : apres < avant ? "diffuse moins" : "décalé",
    premierGain: premierGain?.toISOString() ?? null,
    premierePerte: premierePerte?.toISOString() ?? null,
    converti,
    heuresConverti,
    convertiIdentiqueAV1,
  });
}

/* ---- Application de la conversion ----------------------------------------- */

const aConvertir = impactes.filter((s) => s.converti);

if (CONVERTIR) {
  if (!aConvertir.length) {
    console.log("Aucun slide à convertir.");
  } else {
    for (const s of aConvertir) {
      await api(`slides?id=eq.${s.id}`, {
        method: "PATCH",
        body: { display_times: s.converti, updated_at: new Date().toISOString() },
      });
      console.log(`✅ #${s.id} « ${s.nom} » converti.`);
    }
    console.log(`\n${aConvertir.length} slide(s) converti(s).\n`);
  }
  process.exit(0);
}

const avecHoraires = slides.filter((s) => s.display_times && s.display_times !== "null").length;

if (SORTIE_JSON) {
  console.log(
    JSON.stringify(
      { totalSlides: slides.length, avecHoraires, impactes: impactes.length, details: impactes },
      null,
      2
    )
  );
} else {
  console.log(`\nRapport de bascule des plages horaires — ${new Date().toLocaleString("fr-FR")}`);
  console.log(`Fenêtre analysée : 8 semaines, pas de 15 minutes.\n`);
  console.log(`  ${slides.length} slides au total`);
  console.log(`  ${avecHoraires} avec des plages horaires`);
  console.log(`  ${impactes.length} dont l'évaluation change avec les correctifs\n`);

  if (impactes.length === 0) {
    console.log("✅ Aucun slide impacté : la bascule ne change rien à ce qui est diffusé.\n");
  } else {
    for (const s of impactes) {
      const etat = s.corbeille ? "corbeille" : s.actif ? "actif" : "inactif";
      console.log(`──────────────────────────────────────────────────────────────`);
      console.log(`#${s.id}  ${s.nom}   [${etat}, ${s.type}]`);
      console.log(`  Écrans        : ${s.ecrans.join(", ") || "aucun"}`);
      console.log(`  Diffusion     : ${s.heuresAvant} h  →  ${s.heuresApres} h sur 8 semaines  (${s.sens})`);
      if (s.premierGain) console.log(`  Revient dès   : ${new Date(s.premierGain).toLocaleString("fr-FR")}`);
      if (s.premierePerte) console.log(`  Ne passe plus : ${new Date(s.premierePerte).toLocaleString("fr-FR")}`);
      console.log(`  Horaires      : ${s.display_times.replace(/\s+/g, " ").slice(0, 160)}`);

      if (s.converti) {
        console.log(`  ⚠️  Filtre de semaine isolé : en v2 il devient inerte, le slide passerait`);
        console.log(`      toutes les semaines. À CONVERTIR.`);
        console.log(`      Après conversion : ${s.heuresConverti} h ${
          s.convertiIdentiqueAV1
            ? "— identique au comportement v1 ✅"
            : "— ⚠️ diffère encore du comportement v1, à vérifier à la main"
        }`);
        console.log(`      Nouveau paramétrage : ${s.converti.replace(/\s+/g, " ")}`);
      } else {
        console.log(`  ✅ Correctif conforme à l'intention : rien à convertir.`);
      }
    }
    console.log(`──────────────────────────────────────────────────────────────`);
    console.log(
      `\n👉 Slides sans conversion nécessaire : le paramétrage ne s'appliquait pas en entier\n` +
        `   à cause du défaut de la v1. Ils réapparaîtront tels que leur auteur les avait décrits.\n`
    );
    if (aConvertir.length) {
      console.log(
        `👉 ${aConvertir.length} slide(s) à convertir. Appliquer avec :\n` +
          `      node tools/rapport-horaires.mjs --convertir\n`
      );
    }
  }
}

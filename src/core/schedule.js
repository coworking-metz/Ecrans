/**
 * Plages horaires d'affichage (`display_times` d'un slide, `side_times` d'un écran).
 *
 * Format conservé de la v1 : une chaîne JSON contenant un tableau de règles.
 *
 *   [
 *     { "days": ["monday"], "start": "09:00", "end": "18:00",
 *       "weekNumberIs": "even", "priority": true, "always": false }
 *   ]
 *
 * DEUX CORRECTIFS par rapport à la v1 :
 *
 *  1. Les règles sont ALTERNATIVES. La v1 sortait de la boucle (`break`) dès
 *     qu'une règle ne correspondait pas au jour ou au numéro de semaine : les
 *     règles suivantes n'étaient alors jamais évaluées. Un slide « lundi 9h-12h
 *     OU jeudi 14h-18h » ne passait donc jamais le jeudi.
 *
 *  2. Le numéro de semaine suit la norme ISO 8601. La formule de la v1 donnait
 *     des résultats faux en début et en fin d'année, ce qui décalait la parité
 *     des semaines.
 */

export const JOURS = [
  { cle: "monday", court: "L", nom: "lundi" },
  { cle: "tuesday", court: "M", nom: "mardi" },
  { cle: "wednesday", court: "M", nom: "mercredi" },
  { cle: "thursday", court: "J", nom: "jeudi" },
  { cle: "friday", court: "V", nom: "vendredi" },
  { cle: "saturday", court: "S", nom: "samedi" },
  { cle: "sunday", court: "D", nom: "dimanche" },
];

const CLES_JOURS = JOURS.map((j) => j.cle);

/**
 * Numéro de semaine ISO 8601 : la semaine commence le lundi, et la semaine 1
 * est celle qui contient le premier jeudi de l'année.
 */
export function getIsoWeek(date) {
  // Copie normalisée à minuit UTC : neutralise fuseau et changements d'heure.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7; // lundi = 1 ... dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - jour); // on se place sur le jeudi de la semaine
  const premierJanvier = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - premierJanvier) / 86400000 + 1) / 7);
}

/** Clé du jour de la semaine, en anglais minuscule, comme stocké dans les règles. */
export function cleJour(date) {
  return CLES_JOURS[(date.getDay() + 6) % 7];
}

/** Heure courante au format numérique HHMM, comparable directement. */
function hhmm(date) {
  return date.getHours() * 100 + date.getMinutes();
}

/** "09:30" -> 930. Renvoie NaN si absent ou mal formé. */
function versHhmm(valeur) {
  if (typeof valeur !== "string") return NaN;
  const m = valeur.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  return Number(m[1]) * 100 + Number(m[2]);
}

/**
 * Analyse une valeur de `display_times`.
 * Tolère : null, undefined, chaîne vide, et la chaîne littérale "null"
 * (présente en base sur d'anciens enregistrements).
 *
 * @returns {{rules: Array, vide: boolean, erreur: string|null, brut: string}}
 */
export function parseSchedule(brut) {
  const vide = { rules: [], vide: true, erreur: null, brut: brut ?? "" };
  if (brut === null || brut === undefined) return vide;
  if (typeof brut !== "string") {
    return Array.isArray(brut)
      ? { rules: brut, vide: brut.length === 0, erreur: null, brut: JSON.stringify(brut) }
      : vide;
  }
  const texte = brut.trim();
  if (texte === "" || texte === "null" || texte === "[]") return vide;

  let valeur;
  try {
    valeur = JSON.parse(texte);
  } catch (e) {
    return { rules: [], vide: false, erreur: `JSON invalide : ${e.message}`, brut };
  }
  if (valeur === null) return vide;
  if (!Array.isArray(valeur)) {
    return { rules: [], vide: false, erreur: "Un tableau de règles est attendu.", brut };
  }
  return { rules: valeur, vide: valeur.length === 0, erreur: null, brut };
}

export function serializeSchedule(rules) {
  if (!rules || rules.length === 0) return "";
  return JSON.stringify(rules, null, 2);
}

/** Une règle sans heures ne contraint rien : elle est ignorée à l'évaluation. */
function regleSansHoraire(rule) {
  return Number.isNaN(versHhmm(rule.start)) && Number.isNaN(versHhmm(rule.end));
}

/** La règle est-elle applicable ce jour-là (jours + numéro de semaine) ? */
function regleApplicableCeJour(rule, date) {
  if (rule.weekNumberIs !== undefined && rule.weekNumberIs !== null && rule.weekNumberIs !== "") {
    const semaine = getIsoWeek(date);
    const paire = semaine % 2 === 0;
    const attendu = rule.weekNumberIs;
    if (attendu === "even" && !paire) return false;
    if (attendu === "odd" && paire) return false;
    if (attendu !== "even" && attendu !== "odd") {
      const n = Number(attendu);
      if (!Number.isNaN(n) && n !== semaine) return false;
    }
  }
  if (Array.isArray(rule.days) && rule.days.length > 0 && !rule.days.includes(cleJour(date))) {
    return false;
  }
  return true;
}

/**
 * L'instant `now` tombe-t-il dans au moins une plage ?
 * Pas de plage définie => diffusion permanente => true.
 */
export function isInTimeRange(brut, now = new Date()) {
  const { rules, vide, erreur } = parseSchedule(brut);
  // Un paramétrage illisible ne doit pas faire disparaître un slide en silence :
  // on le laisse passer et l'anomalie est signalée par ailleurs (état `erreur`).
  if (vide || erreur) return true;

  let contraignante = false;
  for (const rule of rules) {
    if (regleSansHoraire(rule)) continue; // n'apporte aucune contrainte horaire
    contraignante = true;
    if (!regleApplicableCeJour(rule, now)) continue; // <-- v1 faisait `break` ici
    const debut = versHhmm(rule.start);
    const fin = versHhmm(rule.end);
    const t = hhmm(now);
    const apresDebut = Number.isNaN(debut) || t >= debut;
    const avantFin = Number.isNaN(fin) || t <= fin;
    if (apresDebut && avantFin) return true;
  }
  // Uniquement des règles sans horaire (ex. { "priority": true }) :
  // elles qualifient le slide sans le restreindre dans le temps.
  return !contraignante;
}

/** Le slide évince-t-il les autres pendant ses plages ? */
export function hasPriority(brut) {
  return parseSchedule(brut).rules.some((r) => r.priority === true);
}

/** Le slide résiste-t-il à l'éviction par un slide prioritaire ? */
export function isAlways(brut) {
  return parseSchedule(brut).rules.some((r) => r.always === true);
}

/**
 * Prochain instant où le résultat de `isInTimeRange` change.
 *
 * On n'évalue pas minute par minute : seules les bornes de plages sont des
 * points de bascule possibles. On construit donc la liste des bornes sur
 * l'horizon, on la trie, et on évalue à chacune.
 *
 * @returns {Date|null} null si aucun changement sur l'horizon.
 */
export function nextChange(brut, from = new Date(), horizonJours = 60) {
  const { rules, vide, erreur } = parseSchedule(brut);
  if (vide || erreur) return null;
  if (rules.every(regleSansHoraire)) return null;

  const etatInitial = isInTimeRange(brut, from);
  const candidats = [];

  const jour0 = new Date(from);
  jour0.setHours(0, 0, 0, 0);

  for (let j = 0; j <= horizonJours; j++) {
    const jour = new Date(jour0);
    jour.setDate(jour.getDate() + j);
    for (const rule of rules) {
      if (regleSansHoraire(rule)) continue;
      for (const borne of [rule.start, rule.end]) {
        const v = versHhmm(borne);
        if (Number.isNaN(v)) continue;
        const d = new Date(jour);
        d.setHours(Math.floor(v / 100), v % 100, 0, 0);
        // Une plage est inclusive sur sa fin : la bascule se produit à la
        // minute suivante.
        candidats.push(d.getTime());
        candidats.push(d.getTime() + 60000);
      }
    }
  }

  const uniques = [...new Set(candidats)].filter((t) => t > from.getTime()).sort((a, b) => a - b);
  for (const t of uniques) {
    const d = new Date(t);
    if (isInTimeRange(brut, d) !== etatInitial) return d;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Description en français                                                    */
/* -------------------------------------------------------------------------- */

function decrireJours(days) {
  if (!Array.isArray(days) || days.length === 0 || days.length === 7) return "tous les jours";
  const noms = CLES_JOURS.filter((c) => days.includes(c)).map(
    (c) => JOURS.find((j) => j.cle === c).nom
  );
  const semaine = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  if (days.length === 5 && semaine.every((d) => days.includes(d))) return "du lundi au vendredi";
  if (days.length === 2 && days.includes("saturday") && days.includes("sunday")) {
    return "le week-end";
  }
  if (noms.length === 1) return `le ${noms[0]}`;
  return `le ${noms.slice(0, -1).join(", ")} et le ${noms.at(-1)}`;
}

function decrireSemaines(weekNumberIs) {
  if (weekNumberIs === undefined || weekNumberIs === null || weekNumberIs === "") return "";
  if (weekNumberIs === "even") return ", les semaines paires";
  if (weekNumberIs === "odd") return ", les semaines impaires";
  return `, uniquement la semaine ${weekNumberIs}`;
}

/** Phrase en français décrivant une règle. */
export function describeRule(rule) {
  const bouts = [decrireJours(rule.days)];
  const debut = versHhmm(rule.start);
  const fin = versHhmm(rule.end);
  if (!Number.isNaN(debut) && !Number.isNaN(fin)) bouts.push(`de ${rule.start} à ${rule.end}`);
  else if (!Number.isNaN(debut)) bouts.push(`à partir de ${rule.start}`);
  else if (!Number.isNaN(fin)) bouts.push(`jusqu'à ${rule.end}`);
  let texte = bouts.join(", ") + decrireSemaines(rule.weekNumberIs);
  if (rule.priority) texte += " — prioritaire";
  if (rule.always) texte += " — permanent";
  return texte;
}

/** Phrase en français décrivant l'ensemble du paramétrage. */
export function describeSchedule(brut) {
  const { rules, vide, erreur } = parseSchedule(brut);
  if (erreur) return `Paramétrage illisible (${erreur})`;
  if (vide) return "Diffusion permanente";
  return rules.map(describeRule).join(" ; ou ");
}

/**
 * Segments d'affichage d'un jour donné, pour la frise.
 * @returns {Array<{debut: number, fin: number, rule: object}>} minutes depuis minuit
 */
export function segmentsDuJour(brut, date) {
  const { rules, vide, erreur } = parseSchedule(brut);
  if (erreur) return [];
  if (vide) return [{ debut: 0, fin: 1440, rule: null }];

  const segments = [];
  let contraignante = false;
  for (const rule of rules) {
    if (regleSansHoraire(rule)) continue;
    contraignante = true;
    if (!regleApplicableCeJour(rule, date)) continue;
    const debut = versHhmm(rule.start);
    const fin = versHhmm(rule.end);
    const enMinutes = (v, defaut) =>
      Number.isNaN(v) ? defaut : Math.floor(v / 100) * 60 + (v % 100);
    segments.push({ debut: enMinutes(debut, 0), fin: enMinutes(fin, 1440), rule });
  }
  if (!contraignante) return [{ debut: 0, fin: 1440, rule: null }];
  return segments.sort((a, b) => a.debut - b.debut);
}

/** Formatage de dates en français, orienté lisibilité pour l'utilisateur. */

const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function formatDateHeure(valeur) {
  if (!valeur) return "";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatHeure(valeur) {
  if (!valeur) return "";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

function memeJour(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Formulation courte et parlante d'un instant proche :
 * « à 14:30 », « demain à 09:00 », « lundi à 09:00 », « le 12 mars à 08:00 ».
 */
export function formatEcheance(valeur, maintenant = new Date()) {
  if (!valeur) return "";
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  if (Number.isNaN(d.getTime())) return "";

  const heure = formatHeure(d);
  if (memeJour(d, maintenant)) return `à ${heure}`;

  const demain = new Date(maintenant);
  demain.setDate(demain.getDate() + 1);
  if (memeJour(d, demain)) return `demain à ${heure}`;

  const joursEcart = Math.round((d - maintenant) / 86400000);
  if (joursEcart > 0 && joursEcart < 7) return `${JOURS_FR[d.getDay()]} à ${heure}`;

  return `le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
    d
  )} à ${heure}`;
}

/** « 2 min 30 s », « 1 h 05 », « 45 s ». */
export function formatDuree(secondes) {
  const s = Math.max(0, Math.round(Number(secondes) || 0));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const reste = s % 60;
  if (min < 60) return reste ? `${min} min ${reste} s` : `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

/** Date locale au format attendu par un champ `datetime-local`. */
export function versChampDateHeure(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Valeur d'un champ `datetime-local` vers un ISO exploitable en base. */
export function depuisChampDateHeure(valeur) {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

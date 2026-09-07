/**
 * Accès aux données.
 *
 * Client minimal écrit sur `fetch` : le contrat (tables, colonnes, espaces de
 * stockage) est strictement celui de la v1, mais sans dépendance à un SDK — ce
 * qui allège nettement le lecteur, qui n'a besoin que de trois lectures.
 *
 * Règle : ce module expose des OPÉRATIONS MÉTIER, jamais des requêtes brutes,
 * et il normalise tout ce qu'il renvoie.
 */

import config from "./config.js";
import { normaliserSlide, normaliserEcran, DUREE_PAR_DEFAUT } from "./slide-types.js";

const BASE_REST = `${config.supabaseUrl}/rest/v1`;
const BASE_STORAGE = `${config.supabaseUrl}/storage/v1`;
const BUCKET = "medias";

function entetes(extra = {}) {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    ...extra,
  };
}

async function rest(chemin, { method = "GET", body, prefer } = {}) {
  const reponse = await fetch(`${BASE_REST}/${chemin}`, {
    method,
    headers: entetes({
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!reponse.ok) {
    const texte = await reponse.text().catch(() => "");
    throw new Error(`Requête échouée (${reponse.status}) : ${texte || reponse.statusText}`);
  }
  if (reponse.status === 204) return null;
  const texte = await reponse.text();
  return texte ? JSON.parse(texte) : null;
}

/** Colonnes acceptées en écriture, pour ne jamais envoyer de champ calculé. */
const COLONNES_ECRAN = [
  "name", "slug", "image", "show_side", "side_url", "side_times",
  "playlist_on", "playlist", "playlist_volume", "slideSort", "trash",
];
const COLONNES_SLIDE = [
  "name", "type", "duration", "active", "trash",
  "publication", "expiration", "display_times", "meta",
];

function projeter(objet, colonnes) {
  const out = {};
  for (const c of colonnes) if (c in objet) out[c] = objet[c];
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Écrans                                                                     */
/* -------------------------------------------------------------------------- */

export const ecrans = {
  async list() {
    const data = await rest("ecrans?select=*&trash=not.is.true&order=name");
    return data.map(normaliserEcran);
  },

  async get(idOuSlug) {
    const filtre =
      typeof idOuSlug === "number" || /^\d+$/.test(String(idOuSlug))
        ? `id=eq.${Number(idOuSlug)}`
        : `slug=eq.${encodeURIComponent(idOuSlug)}`;
    const data = await rest(`ecrans?select=*&${filtre}&limit=1`);
    return data[0] ? normaliserEcran(data[0]) : null;
  },

  async create(nom = "Nouvel écran") {
    const data = await rest("ecrans", {
      method: "POST",
      body: [{ name: nom }],
      prefer: "return=representation",
    });
    return normaliserEcran(data[0]);
  },

  async save(ecran) {
    const data = await rest(`ecrans?id=eq.${ecran.id}`, {
      method: "PATCH",
      body: projeter(ecran, COLONNES_ECRAN),
      prefer: "return=representation",
    });
    return normaliserEcran(data[0]);
  },

  async remove(id) {
    await rest(`liens_ecrans_slides?ecran_id=eq.${id}`, { method: "DELETE" });
    await rest(`ecrans?id=eq.${id}`, { method: "DELETE" });
  },

  /** Enregistre l'ordre de passage des slides sur un écran. */
  async setOrder(id, slideIds) {
    await rest(`ecrans?id=eq.${id}`, {
      method: "PATCH",
      body: { slideSort: slideIds.map(Number) },
    });
  },
};

/* -------------------------------------------------------------------------- */
/*  Slides                                                                     */
/* -------------------------------------------------------------------------- */

export const slides = {
  async list() {
    const data = await rest("slides?select=*&order=id");
    return data.map(normaliserSlide);
  },

  async get(id) {
    const data = await rest(`slides?select=*&id=eq.${Number(id)}&limit=1`);
    return data[0] ? normaliserSlide(data[0]) : null;
  },

  async create(nom) {
    const data = await rest("slides", {
      method: "POST",
      body: [{ name: nom, type: "default", duration: DUREE_PAR_DEFAUT, active: false }],
      prefer: "return=representation",
    });
    return normaliserSlide(data[0]);
  },

  async save(slide) {
    const corps = projeter(slide, COLONNES_SLIDE);
    // La colonne est un texte : on n'y écrit jamais la chaîne "null".
    if (corps.display_times === null || corps.display_times === undefined) corps.display_times = "";
    corps.updated_at = new Date().toISOString();
    const data = await rest(`slides?id=eq.${slide.id}`, {
      method: "PATCH",
      body: corps,
      prefer: "return=representation",
    });
    return normaliserSlide(data[0]);
  },

  /** Action en lot : un seul aller-retour, quelle que soit la taille de la sélection. */
  async setActive(ids, actif) {
    if (!ids.length) return;
    await rest(`slides?id=in.(${ids.join(",")})`, {
      method: "PATCH",
      body: { active: !!actif, updated_at: new Date().toISOString() },
    });
  },

  async setTrash(ids, dansCorbeille) {
    if (!ids.length) return;
    await rest(`slides?id=in.(${ids.join(",")})`, {
      method: "PATCH",
      body: { trash: !!dansCorbeille, updated_at: new Date().toISOString() },
    });
  },

  async setExpiration(ids, iso) {
    if (!ids.length) return;
    await rest(`slides?id=in.(${ids.join(",")})`, {
      method: "PATCH",
      body: { expiration: iso, updated_at: new Date().toISOString() },
    });
  },

  async remove(ids) {
    if (!ids.length) return;
    await rest(`liens_ecrans_slides?slide_id=in.(${ids.join(",")})`, { method: "DELETE" });
    await rest(`slides?id=in.(${ids.join(",")})`, { method: "DELETE" });
  },

  async duplicate(id) {
    const source = await slides.get(id);
    if (!source) throw new Error("Slide introuvable.");
    const data = await rest("slides", {
      method: "POST",
      body: [
        {
          name: `${source.name} (copie)`,
          type: source.type,
          duration: source.duration,
          active: false,
          display_times: source.display_times || "",
          meta: source.meta,
        },
      ],
      prefer: "return=representation",
    });
    return normaliserSlide(data[0]);
  },

  /** Combien de slides portent déjà le nom « Nouveau slide vide … ». */
  async compterSlidesVides() {
    const data = await rest(
      "slides?select=id&trash=not.is.true&name=ilike.Nouveau%20slide%20vide*"
    );
    return data.length;
  },
};

/* -------------------------------------------------------------------------- */
/*  Liens écran ↔ slide                                                        */
/* -------------------------------------------------------------------------- */

export const liens = {
  async list() {
    return rest("liens_ecrans_slides?select=*");
  },

  /**
   * Met à jour les écrans d'un slide par DIFFÉRENTIEL.
   *
   * La v1 supprimait tous les liens puis les réinsérait : les attributs portés
   * par le lien (dont l'interrupteur par écran) étaient perdus à chaque
   * enregistrement.
   */
  async setEcransDuSlide(slideId, ecranIds) {
    const existants = await rest(`liens_ecrans_slides?select=*&slide_id=eq.${slideId}`);
    const actuels = new Set(existants.map((l) => l.ecran_id));
    const voulus = new Set(ecranIds.map(Number));

    const aRetirer = [...actuels].filter((id) => !voulus.has(id));
    const aAjouter = [...voulus].filter((id) => !actuels.has(id));

    if (aRetirer.length) {
      await rest(
        `liens_ecrans_slides?slide_id=eq.${slideId}&ecran_id=in.(${aRetirer.join(",")})`,
        { method: "DELETE" }
      );
    }
    if (aAjouter.length) {
      await rest("liens_ecrans_slides", {
        method: "POST",
        body: aAjouter.map((ecran_id) => ({ slide_id: slideId, ecran_id })),
      });
    }
  },

  async ajouter(slideIds, ecranId) {
    const existants = await rest(
      `liens_ecrans_slides?select=slide_id&ecran_id=eq.${ecranId}&slide_id=in.(${slideIds.join(",")})`
    );
    const deja = new Set(existants.map((l) => l.slide_id));
    const nouveaux = slideIds.filter((id) => !deja.has(id));
    if (!nouveaux.length) return;
    await rest("liens_ecrans_slides", {
      method: "POST",
      body: nouveaux.map((slide_id) => ({ slide_id, ecran_id: ecranId })),
    });
  },

  async retirer(slideIds, ecranId) {
    if (!slideIds.length) return;
    await rest(
      `liens_ecrans_slides?ecran_id=eq.${ecranId}&slide_id=in.(${slideIds.join(",")})`,
      { method: "DELETE" }
    );
  },

  /**
   * Interrupteur par écran.
   *
   * Dépend de la colonne `active` sur `liens_ecrans_slides` (voir l'annexe de
   * ECRANS-V2.md). Si elle n'existe pas, l'appel échoue proprement et
   * l'interface bascule sur l'interrupteur global.
   */
  async setActiveSurEcran(slideIds, ecranId, actif) {
    if (!slideIds.length) return;
    await rest(
      `liens_ecrans_slides?ecran_id=eq.${ecranId}&slide_id=in.(${slideIds.join(",")})`,
      { method: "PATCH", body: { active: !!actif } }
    );
  },
};

/**
 * La colonne `active` existe-t-elle sur les liens ?
 *
 * On lit une ligne complète plutôt que de demander la colonne : interroger une
 * colonne absente renvoie une erreur 400, bruyante dans la console alors que le
 * repli est parfaitement normal.
 *
 * Table vide : on ne peut pas conclure, on suppose que la colonne n'existe pas.
 * Le repli (interrupteur global) est le comportement sûr.
 */
let _supporteActiveParEcran = null;
export async function supporteActiveParEcran() {
  if (_supporteActiveParEcran !== null) return _supporteActiveParEcran;
  try {
    const lignes = await rest("liens_ecrans_slides?select=*&limit=1");
    _supporteActiveParEcran = Array.isArray(lignes) && lignes.length > 0 && "active" in lignes[0];
  } catch {
    _supporteActiveParEcran = false;
  }
  return _supporteActiveParEcran;
}

/* -------------------------------------------------------------------------- */
/*  Médias                                                                     */
/* -------------------------------------------------------------------------- */

export const FORMATS_ACCEPTES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml",
  "video/mp4",
];
/** Formats pour lesquels une miniature est générée. */
export const FORMATS_MINIATURE = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];

export function urlPublique(chemin) {
  return `${config.supabaseUrl}/storage/v1/object/public/${BUCKET}/${chemin}`;
}

export const medias = {
  async list() {
    const reponse = await fetch(`${BASE_STORAGE}/object/list/${BUCKET}`, {
      method: "POST",
      headers: entetes({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        prefix: "medias",
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    if (!reponse.ok) throw new Error(`Liste des médias indisponible (${reponse.status})`);
    const fichiers = await reponse.json();

    return fichiers
      .filter((f) => f.name && !f.name.startsWith("."))
      .map((f) => ({
        fichier: f,
        nom: f.name,
        url: urlPublique(`medias/${f.name}`),
        miniature: urlPublique(`thumbnails/${f.name}`),
        modifieLe: f.metadata?.lastModified || f.updated_at || f.created_at || null,
        taille: f.metadata?.size ?? null,
        type: f.metadata?.mimetype || "",
        index: `${f.name}`.toLowerCase(),
      }))
      .sort((a, b) => new Date(b.modifieLe || 0) - new Date(a.modifieLe || 0));
  },

  async upload(chemin, fichier, { upsert = false } = {}) {
    const reponse = await fetch(`${BASE_STORAGE}/object/${BUCKET}/${chemin}`, {
      method: upsert ? "PUT" : "POST",
      headers: entetes({ "x-upsert": String(upsert) }),
      body: fichier,
    });
    if (!reponse.ok) {
      const texte = await reponse.text().catch(() => "");
      throw new Error(`Envoi impossible (${reponse.status}) : ${texte}`);
    }
    return reponse.json();
  },

  async remove(noms) {
    const prefixes = noms.flatMap((n) => [`medias/${n}`, `thumbnails/${n}`]);
    const reponse = await fetch(`${BASE_STORAGE}/object/${BUCKET}`, {
      method: "DELETE",
      headers: entetes({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes }),
    });
    if (!reponse.ok) throw new Error(`Suppression impossible (${reponse.status})`);
  },
};

export default { ecrans, slides, liens, medias, urlPublique, supporteActiveParEcran };

/**
 * Schéma des types de slides et de leur contenu (`meta`).
 *
 * ⚠️ La clé `meta.url` a deux significations selon le type : adresse encodée en
 * QR code pour une composition, page à afficher pour un slide « page web ».
 * C'est un héritage de la v1 conservé pour ne pas casser les contenus existants.
 * L'isoler ici évite de le redécouvrir dans chaque formulaire.
 */

export const TYPES = [
  {
    slug: "default",
    nom: "Composition",
    description: "Titre, texte enrichi, emoji ou visuel, QR code, image de fond.",
    icone: "fa-pen-fancy",
    champs: [
      "emojiPrincipal",
      "imagePrincipale",
      "titre",
      "texte",
      "color",
      "url",
      "image",
      "fit",
      "opacity",
      "backgroundColor",
    ],
  },
  {
    slug: "image",
    nom: "Image",
    description: "Une image en plein écran.",
    icone: "fa-image",
    champs: ["image", "fit", "opacity", "backgroundColor"],
  },
  {
    slug: "video",
    nom: "Vidéo",
    description: "Une vidéo en plein écran, lue sans son.",
    icone: "fa-video",
    champs: ["video"],
  },
  {
    slug: "url",
    nom: "Page web",
    description: "Une page web affichée en plein slide.",
    icone: "fa-globe",
    champs: ["url"],
  },
];

export const DUREE_PAR_DEFAUT = 10;

export function getType(slug) {
  return TYPES.find((t) => t.slug === slug) || TYPES[0];
}

export function nomDuType(slug) {
  return getType(slug).nom;
}

/** Valeurs par défaut du contenu, par type. */
export function metaParDefaut(type) {
  const commun = { backgroundColor: "#000000", fit: "cover", opacity: 1 };
  switch (type) {
    case "default":
      return { ...commun, color: "#FFFFFF", titre: "", texte: "", emojiPrincipal: "", imagePrincipale: "", image: "", url: "" };
    case "image":
      return { ...commun, image: "" };
    case "video":
      return { video: "" };
    case "url":
      return { url: "" };
    default:
      return {};
  }
}

/**
 * Normalise un slide lu en base : `meta` absent, `display_times` valant la
 * chaîne "null", durée manquante. Fait une seule fois, ici, jamais dans les vues.
 */
export function normaliserSlide(slide) {
  const type = slide.type || "default";
  const meta = slide.meta && typeof slide.meta === "object" ? slide.meta : {};
  return {
    ...slide,
    type,
    active: slide.active !== false,
    trash: !!slide.trash,
    duration: Number(slide.duration) > 0 ? Number(slide.duration) : DUREE_PAR_DEFAUT,
    display_times:
      slide.display_times === "null" || slide.display_times === null ? "" : slide.display_times,
    meta: { ...metaParDefaut(type), ...meta },
  };
}

/** Normalise un écran lu en base. */
export function normaliserEcran(ecran) {
  return {
    ...ecran,
    show_side: !!ecran.show_side,
    playlist_on: !!ecran.playlist_on,
    playlist_volume:
      ecran.playlist_volume === null || ecran.playlist_volume === undefined
        ? 50
        : Number(ecran.playlist_volume),
    side_times: ecran.side_times === "null" ? "" : ecran.side_times || "",
    slideSort: Array.isArray(ecran.slideSort) ? ecran.slideSort.map(Number) : [],
  };
}

/**
 * Un emoji unique, nettoyé : on ne conserve que le premier graphème qui est un
 * emoji complet (séquences ZWJ et sélecteurs de variante compris).
 */
export function nettoyerEmoji(valeur) {
  const texte = (valeur || "").normalize("NFC");
  if (!texte) return "";
  const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });
  const graphemes = Array.from(segmenteur.segment(texte), (s) => s.segment);
  const estEmoji =
    /^\p{Extended_Pictographic}(?:️|︎)?(?:‍\p{Extended_Pictographic}(?:️|︎)?)*$/u;
  const trouve = graphemes.find((g) => estEmoji.test(g));
  return trouve || "";
}

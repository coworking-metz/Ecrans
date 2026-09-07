/** URLs de médias : proxy d'images, miniatures, QR codes, conversion vidéo. */

import config from "./config.js";

const PREFIXE_STOCKAGE = "/storage/v1/object/public/";

/**
 * Réécrit une URL de stockage vers le proxy d'images, qui sait redimensionner.
 * @param {string} url
 * @param {object} params - ex. { w: 1600, t: updated_at } (`t` casse le cache)
 */
export function urlImage(url, params = {}) {
  if (!url) return "";
  const base = url.replace(`${config.supabaseUrl}${PREFIXE_STOCKAGE}`, config.imagesBase);
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return query ? `${base}?${query}` : base;
}

/** Miniature d'un média, à partir de l'URL du fichier d'origine. */
export function urlMiniature(url, params = {}) {
  if (!url) return "";
  return urlImage(url.replace("/medias/medias/", "/medias/thumbnails/"), params);
}

export function urlQrCode(cible) {
  if (!cible) return "";
  return `${config.qrUrl}?url=${encodeURIComponent(cible)}`;
}

/** Le convertisseur renvoie la vidéo dans le format demandé. */
export function urlVideo(source, format) {
  if (!source) return "";
  return `${config.videoConvertUrl}?t=4&to=${format}&v=${encodeURIComponent(source)}`;
}

/** Lien public vers le lecteur, pour un écran ou pour un slide isolé. */
export function urlLecteur({ slug, slideId } = {}) {
  if (slug) return `${config.viewerBase}?nocache&slug=${encodeURIComponent(slug)}`;
  if (slideId) return `${config.viewerBase}?nocache&id=${slideId}`;
  return config.viewerBase;
}

/**
 * Réduit une image côté navigateur pour produire une miniature.
 * @returns {Promise<File>}
 */
export function fabriquerMiniature(fichier, largeur = 150) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    const image = new Image();

    lecteur.onerror = () => reject(new Error("Lecture du fichier impossible."));
    image.onerror = () => reject(new Error("Image illisible."));

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const echelle = largeur / image.width;
      canvas.width = largeur;
      canvas.height = Math.max(1, Math.round(image.height * echelle));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Miniature non générée."));
        resolve(new File([blob], fichier.name, { type: blob.type }));
      }, fichier.type);
    };

    lecteur.onload = (e) => {
      image.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/** Raccourcit un nom de fichier long en gardant début, fin et extension. */
export function raccourcirNom(nom, maxLen = 40) {
  if (!nom || nom.length <= maxLen) return nom || "";
  const extension = nom.includes(".") ? nom.split(".").pop() : "";
  const sansExt = extension ? nom.slice(0, -(extension.length + 1)) : nom;
  const taille = Math.floor((maxLen - 4 - extension.length) / 2);
  if (taille < 1) return nom.slice(0, maxLen);
  return `${sansExt.slice(0, taille)}…${sansExt.slice(-taille)}${extension ? "." + extension : ""}`;
}

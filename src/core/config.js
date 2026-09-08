/**
 * Configuration centrale.
 *
 * Toutes les adresses de services externes sont ici, et nulle part ailleurs.
 * En v1 elles étaient écrites en dur dans six fichiers, dont `index.html`.
 *
 * Les valeurs sensibles sont injectées au build depuis le fichier `.env`
 * (voir `build.mjs`), via la constante `__ENV__`.
 */

// Vite expose les variables préfixées `VITE_` du fichier `.env`.
const env = import.meta.env;

export const config = {
  /** Base de données et stockage. */
  supabaseUrl: env.VITE_APP_SUPABASE_URL || "https://lvsbvjweppdlhmjuqqvt.supabase.co",
  supabaseKey: env.VITE_APP_SUPABASE_KEY || "",

  /** Code d'accès partagé à l'administration. Vide = pas de protection. */
  password: env.VITE_APP_PASSWORD || "",

  /** Proxy d'images : redimensionnement et anti-cache. */
  imagesBase: env.VITE_APP_IMAGES_BASE || "https://images.coworking-metz.fr/supabase/",

  /** Générateur de QR code : reçoit `?url=`, renvoie une image. */
  qrUrl: env.VITE_APP_QR_URL || "https://tools.coworking-metz.fr/qr/",

  /** Convertisseur vidéo : reçoit `?to=<format>&v=<url>`. */
  videoConvertUrl: env.VITE_APP_VIDEO_URL || "https://tools.sopress.dev/convertVideo/",

  /** Canal temps réel avec les lecteurs. */
  wsUrl: env.VITE_APP_WS_URL || "wss://websocket.coworking-metz.fr/ws",

  /** Base publique du lecteur, utilisée pour les liens « visionner ». */
  viewerBase: env.VITE_APP_VIEWER_BASE || "https://tools.coworking-metz.fr/visionner/",

};

/**
 * Ajoute le `?v=<hash>` à un chemin d'asset.
 *
 * Le manifeste est injecté par le build dans la page HTML (et non dans le
 * bundle) : sinon le hash d'un fichier dépendrait de son propre contenu.
 */
export function asset(chemin) {
  const manifeste = globalThis.__ASSETS__ || {};
  const hash = manifeste[chemin];
  return hash ? `${chemin}?v=${hash}` : chemin;
}

export default config;

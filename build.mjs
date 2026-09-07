/**
 * Chaîne de build de la v2.
 *
 * Produit `./dist` :
 *
 *   dist/
 *     index.html            administration
 *     visionner.html        lecteur
 *     assets/
 *       admin.js  admin.css
 *       player.js player.css
 *       manifest.json       { "/assets/admin.js": "8f3a1c2e", ... }
 *     fonts/ logo.svg ...   copiés depuis public/
 *
 * Les noms de fichiers restent STABLES ; la version passe en paramètre de
 * requête (`?v=<hash du contenu>`). Les chemins restent donc lisibles côté
 * serveur et proxy, et un déploiement prend effet sans vider de cache.
 *
 *   node build.mjs          build de production
 *   node build.mjs --dev    build + serveur local + reconstruction à la volée
 */

import esbuild from "esbuild";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const RACINE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const SRC = path.join(RACINE, "src");
const DIST = path.join(RACINE, "dist");
const PUBLIC = path.join(RACINE, "public");

const DEV = process.argv.includes("--dev");
const PORT = Number(process.env.PORT || 5174);

/* -------------------------------------------------------------------------- */
/*  Environnement                                                              */
/* -------------------------------------------------------------------------- */

/** Lit un `.env` simple (KEY=VALUE), sans dépendance. */
function lireEnv(fichier) {
  if (!fs.existsSync(fichier)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(fichier, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

// Les variables d'environnement du processus (celles du tableau de bord
// Cloudflare Pages, en production) priment sur le `.env` local.
const env = { ...lireEnv(path.join(RACINE, ".env")) };
for (const cle of Object.keys(env)) {
  if (process.env[cle]) env[cle] = process.env[cle];
}
for (const cle of Object.keys(process.env)) {
  if (cle.startsWith("VITE_APP_")) env[cle] = process.env[cle];
}

if (!env.VITE_APP_SUPABASE_KEY) {
  console.warn("⚠️  VITE_APP_SUPABASE_KEY absente : l'application ne pourra pas lire les données.");
}

/* -------------------------------------------------------------------------- */
/*  Utilitaires                                                                */
/* -------------------------------------------------------------------------- */

function viderDossier(dossier) {
  fs.rmSync(dossier, { recursive: true, force: true });
  fs.mkdirSync(dossier, { recursive: true });
}

function copierRecursif(source, cible) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(cible, { recursive: true });
  for (const entree of fs.readdirSync(source, { withFileTypes: true })) {
    const de = path.join(source, entree.name);
    const vers = path.join(cible, entree.name);
    if (entree.isDirectory()) copierRecursif(de, vers);
    else fs.copyFileSync(de, vers);
  }
}

function hashFichier(chemin) {
  return createHash("sha256").update(fs.readFileSync(chemin)).digest("hex").slice(0, 8);
}

/* -------------------------------------------------------------------------- */
/*  Build                                                                      */
/* -------------------------------------------------------------------------- */

const OPTIONS_COMMUNES = {
  bundle: true,
  format: "esm",
  target: ["es2022", "chrome109", "firefox115", "safari16"],
  platform: "browser",
  charset: "utf8",
  logLevel: "info",
  // Les polices et images référencées depuis le CSS sont servies depuis /public :
  // on garde les URLs telles quelles.
  external: ["/fonts/*", "/logo.svg", "/screen.png"],
  define: {
    __ENV__: JSON.stringify({
      VITE_APP_SUPABASE_URL: env.VITE_APP_SUPABASE_URL,
      VITE_APP_SUPABASE_KEY: env.VITE_APP_SUPABASE_KEY,
      VITE_APP_PASSWORD: env.VITE_APP_PASSWORD,
      VITE_APP_IMAGES_BASE: env.VITE_APP_IMAGES_BASE,
      VITE_APP_QR_URL: env.VITE_APP_QR_URL,
      VITE_APP_VIDEO_URL: env.VITE_APP_VIDEO_URL,
      VITE_APP_WS_URL: env.VITE_APP_WS_URL,
      VITE_APP_VIEWER_BASE: env.VITE_APP_VIEWER_BASE,
    }),
  },
};

/**
 * Deux builds indépendants : l'administration et le lecteur ne partagent aucun
 * fragment, ce qui évite les noms de morceaux hachés et garde le lecteur léger.
 */
async function bundler() {
  const entrees = [
    { nom: "admin", fichier: path.join(SRC, "admin.js") },
    { nom: "player", fichier: path.join(SRC, "player.js") },
  ];

  for (const entree of entrees) {
    await esbuild.build({
      ...OPTIONS_COMMUNES,
      entryPoints: [entree.fichier],
      outfile: path.join(DIST, "assets", `${entree.nom}.js`),
      minify: !DEV,
      sourcemap: DEV ? "inline" : false,
    });
  }
}

/** Calcule les hashs et écrit le manifeste. */
function fabriquerManifeste() {
  const dossierAssets = path.join(DIST, "assets");
  const manifeste = {};
  if (!fs.existsSync(dossierAssets)) return manifeste;
  for (const nom of fs.readdirSync(dossierAssets)) {
    if (nom === "manifest.json") continue;
    manifeste[`/assets/${nom}`] = hashFichier(path.join(dossierAssets, nom));
  }
  fs.writeFileSync(
    path.join(dossierAssets, "manifest.json"),
    JSON.stringify(manifeste, null, 2),
    "utf8"
  );
  return manifeste;
}

/**
 * Réécrit les pages HTML.
 *   {{v:/assets/admin.js}}  ->  ?v=8f3a1c2e
 *   {{manifest}}            ->  <script>window.__ASSETS__ = {...}</script>
 */
const PAGES = ["index.html", "visionner.html"];

function ecrirePages(manifeste) {
  const injection = `<script>window.__ASSETS__=${JSON.stringify(manifeste)}</script>`;

  for (const nom of PAGES) {
    let html = fs.readFileSync(path.join(RACINE, nom), "utf8");
    html = html.replace(/\{\{v:([^}]+)\}\}/g, (_, chemin) => {
      const hash = manifeste[chemin.trim()];
      if (!hash) {
        console.warn(`⚠️  ${nom} : aucun hash pour ${chemin} (asset absent du build ?)`);
        return "";
      }
      return `?v=${hash}`;
    });
    html = html.replace("{{manifest}}", injection);
    fs.writeFileSync(path.join(DIST, nom), html, "utf8");
  }
}

/**
 * Redirections et en-têtes, lus par Cloudflare Pages dans le dossier publié.
 *
 * C'est la seule configuration de déploiement versionnée : le reste (commande
 * de build, dossier de sortie, variables) vit dans le tableau de bord
 * Cloudflare, comme le veut Pages.
 */
function ecrireRedirections() {
  const regles = [
    "/visionner/*   /visionner.html   200",
    "/*             /index.html       200",
  ].join("\n");
  fs.writeFileSync(path.join(DIST, "_redirects"), regles + "\n", "utf8");

  // En-têtes de cache : les pages ne sont jamais mises en cache (elles portent
  // les numéros de version), les assets versionnés le sont pour longtemps.
  // L'ordre compte : sur Cloudflare Pages, quand plusieurs règles correspondent,
  // c'est la dernière qui l'emporte pour un même en-tête. La règle du manifeste
  // doit donc rester APRÈS celle de /assets/*.
  const entetes = [
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/assets/manifest.json",
    "  Cache-Control: no-store",
    "/*.html",
    "  Cache-Control: no-store",
    "/",
    "  Cache-Control: no-store",
  ].join("\n");
  fs.writeFileSync(path.join(DIST, "_headers"), entetes + "\n", "utf8");
}

async function construire() {
  const debut = Date.now();
  viderDossier(DIST);
  copierRecursif(PUBLIC, DIST);
  await bundler();
  const manifeste = fabriquerManifeste();
  ecrirePages(manifeste);
  ecrireRedirections();

  console.log(`\n✅ dist/ construit en ${Date.now() - debut} ms`);
  for (const [chemin, hash] of Object.entries(manifeste)) {
    const taille = fs.statSync(path.join(DIST, chemin.slice(1))).size;
    console.log(`   ${chemin}?v=${hash}  ${(taille / 1024).toFixed(1)} ko`);
  }
  return manifeste;
}

/* -------------------------------------------------------------------------- */
/*  Serveur de développement                                                   */
/* -------------------------------------------------------------------------- */

const TYPES_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function servir() {
  const serveur = http.createServer((requete, reponse) => {
    const url = new URL(requete.url, `http://localhost:${PORT}`);
    let chemin = decodeURIComponent(url.pathname);

    // Mêmes redirections qu'en production.
    let fichier = path.join(DIST, chemin);
    if (chemin === "/" || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
      fichier = path.join(DIST, chemin.startsWith("/visionner") ? "visionner.html" : "index.html");
    }

    if (!fs.existsSync(fichier)) {
      reponse.writeHead(404).end("404");
      return;
    }
    reponse.writeHead(200, {
      "Content-Type": TYPES_MIME[path.extname(fichier)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(fichier).pipe(reponse);
  });

  serveur.listen(PORT, () => {
    console.log(`\n🌐 http://localhost:${PORT}/            administration`);
    console.log(`   http://localhost:${PORT}/visionner/<slug>   lecteur\n`);
  });
}

/* -------------------------------------------------------------------------- */

await construire();

if (DEV) {
  servir();

  let enCours = false;
  const reconstruire = () => {
    if (enCours) return;
    enCours = true;
    setTimeout(async () => {
      try {
        await construire();
      } catch (e) {
        console.error("❌ build en échec :", e.message);
      }
      enCours = false;
    }, 100);
  };

  // On surveille les sources et les deux pages — surtout pas la racine entière,
  // qui contient dist/ : chaque build relancerait le build.
  fs.watch(SRC, { recursive: true }, reconstruire);
  for (const page of PAGES) fs.watch(path.join(RACINE, page), reconstruire);
}

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Versionnement des assets en `?v=<hash du contenu>`.
 *
 * Vite met par défaut le hash dans le NOM du fichier (`admin-a1b2c3.js`). On
 * préfère ici des noms stables et la version en paramètre de requête : les
 * chemins restent lisibles côté serveur et proxy, et l'ancien fichier n'est
 * jamais laissé derrière à chaque déploiement.
 *
 * Le hash ne peut pas être injecté pendant `transformIndexHtml` (il dépendrait
 * de son propre contenu) : on réécrit donc les pages une fois le bundle écrit.
 */
function versionnerAssets() {
  return {
    name: "versionner-assets",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(import.meta.dirname, "dist");
      if (!fs.existsSync(dist)) return;

      const hash = (fichier) =>
        createHash("sha256").update(fs.readFileSync(fichier)).digest("hex").slice(0, 8);

      const manifeste = {};
      const dossierAssets = path.join(dist, "assets");
      if (fs.existsSync(dossierAssets)) {
        for (const nom of fs.readdirSync(dossierAssets)) {
          manifeste[`/assets/${nom}`] = hash(path.join(dossierAssets, nom));
        }
      }

      for (const nom of fs.readdirSync(dist)) {
        if (!nom.endsWith(".html")) continue;
        const chemin = path.join(dist, nom);
        let html = fs.readFileSync(chemin, "utf8");
        // On ne touche qu'aux références vers /assets/ produites par Vite.
        html = html.replace(/(["'])(\/assets\/[^"'?]+)\1/g, (entier, quote, ref) =>
          manifeste[ref] ? `${quote}${ref}?v=${manifeste[ref]}${quote}` : entier
        );
        html = html.replace(
          "</head>",
          `<script>window.__ASSETS__=${JSON.stringify(manifeste)}</script></head>`
        );
        fs.writeFileSync(chemin, html, "utf8");
      }

      fs.writeFileSync(
        path.join(dossierAssets, "manifest.json"),
        JSON.stringify(manifeste, null, 2),
        "utf8"
      );
      console.log(`\n  ${Object.keys(manifeste).length} assets versionnés en ?v=<hash>`);
    },
  };
}

export default defineConfig({
  plugins: [vue(), versionnerAssets()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    port: 5174,
  },

  // Tests de montage : un build qui réussit ne garantit pas que l'application
  // s'affiche. jsdom permet de le vérifier sans navigateur.
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.js"],
    restoreMocks: true,
    // Les fichiers de `public/` sont servis tels quels en vrai ; en test, il
    // faut les pointer explicitement.
    alias: {
      "/logo.svg": fileURLToPath(new URL("./public/logo.svg", import.meta.url)),
      "/screen.png": fileURLToPath(new URL("./public/screen.png", import.meta.url)),
    },
  },

  build: {
    // Deux pages : l'administration et le lecteur. Le lecteur ne charge ainsi
    // ni Bulma, ni l'éditeur de texte, ni les vues d'administration.
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        visionner: fileURLToPath(new URL("./visionner.html", import.meta.url)),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        // Sans cela, le morceau partagé hérite du nom d'un module quelconque
        // qu'il contient (« realtime.js » pour le moteur de Vue…).
        manualChunks(id) {
          if (id.includes("node_modules/quill")) return "quill";
          if (id.includes("node_modules/bulma")) return "bulma";
          if (id.includes("node_modules")) return "vendor";
          return null;
        },
      },
    },
  },
});

/** Bibliothèque de médias. */

import { h, rendre } from "../dom.js";
import store, { subscribe } from "../../core/store.js";
import { zoneDepot, listeMedias } from "../components/medias.js";

export function vueMedias(params, conteneur) {
  const racine = h("div");
  conteneur.append(racine);

  let liste = null;

  function dessiner() {
    liste = listeMedias({ avecSuppression: true });
    rendre(
      racine,
      h(
        "h1.title.is-4",
        {},
        "Médias",
        h("span.has-text-grey.ml-2", {}, `(${store.medias.length})`)
      ),
      h(
        "p.help.mb-3",
        {},
        "Images (JPEG, PNG, GIF, WebP, AVIF, SVG) et vidéos MP4. Une miniature est générée automatiquement pour les images."
      ),
      zoneDepot(),
      h("div.mt-4", {}, liste)
    );
  }

  dessiner();
  const desabonner = subscribe(() => liste?.rafraichir());
  return desabonner;
}

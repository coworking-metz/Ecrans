/** Chargement et rechargement des données de l'administration. */

import { ecrans, slides, liens, medias, supporteActiveParEcran } from "./core/api.js";
import { setState } from "./core/store.js";

/** Premier chargement : tout, en parallèle. */
export async function chargerDonnees() {
  const [listeEcrans, listeSlides, listeLiens, actifParEcran] = await Promise.all([
    ecrans.list(),
    slides.list(),
    liens.list(),
    supporteActiveParEcran(),
  ]);

  setState({
    ecrans: listeEcrans,
    slides: listeSlides,
    liens: listeLiens,
    activeParEcran: actifParEcran,
    chargement: false,
  });

  // Les médias ne bloquent pas l'affichage : ils arrivent quand ils arrivent.
  medias
    .list()
    .then((liste) => setState({ medias: liste }))
    .catch((e) => console.warn("[médias] liste indisponible", e));
}

/** Rechargement après une écriture. Les médias ne sont pas concernés. */
export async function rechargerDonnees() {
  const [listeEcrans, listeSlides, listeLiens] = await Promise.all([
    ecrans.list(),
    slides.list(),
    liens.list(),
  ]);
  setState({ ecrans: listeEcrans, slides: listeSlides, liens: listeLiens });
}

/**
 * Liste des écrans.
 *
 * Ajout v2 : chaque écran indique ce qu'il diffuse en ce moment, combien de
 * slides sont éligibles, et s'il est en ligne. Un écran qui ne diffuse rien
 * était indétectable en v1 sans se déplacer.
 */

import { h, bouton, icone, message, erreur, rendre } from "../dom.js";
import { lien, naviguer } from "../router.js";
import store, { subscribe } from "../../core/store.js";
import { ecrans as apiEcrans } from "../../core/api.js";
import { eligibleSlides, dureeDuCycle } from "../../core/playlist.js";
import { urlImage, urlLecteur } from "../../core/media.js";
import { formatDuree } from "../../core/dates.js";
import { COMMANDES } from "../../core/realtime.js";
import { rechargerDonnees } from "../../admin-data.js";

export function vueEcrans(params, conteneur) {
  const racine = h("div");
  conteneur.append(racine);

  const desabonner = subscribe(dessiner);
  dessiner();
  return desabonner;

  function dessiner() {
    rendre(
      racine,
      h("h1.title.is-4", {}, "Écrans"),
      h(
        "div.buttons.are-small.mb-4",
        {},
        bouton("Ajouter un écran", {
          icone: "fa-plus",
          classe: "is-small is-success",
          onClick: creerEcran,
        })
      ),
      store.ecrans.length === 0
        ? h("p.notification.is-light", {}, "Aucun écran configuré pour le moment.")
        : h("div.ecrans-liste", {}, store.ecrans.map(carteEcran))
    );
  }

  function carteEcran(ecran) {
    const eligibles = eligibleSlides(ecran, store.slides, store.liens, store.maintenant);
    const cycle = dureeDuCycle(eligibles);
    const vivant = store.lecteurs?.[ecran.id];
    const enLigne = vivant && Date.now() - vivant.vuA < 120000;

    const image = urlImage(ecran.image, { w: 200 });

    return h(
      "article.media.ecran-ligne",
      {},
      h(
        "figure.media-left",
        {},
        h(
          "p.image.apercu-ecran",
          {},
          h("img", { src: image || "/screen.png", alt: "", onError: (e) => (e.target.src = "/screen.png") })
        )
      ),
      h(
        "div.media-content",
        {},
        h(
          "p.mb-1",
          {},
          lien(`/ecran/${ecran.id}/slides`, h("strong", {}, ecran.name || "(sans nom)")),
          ecran.slug ? h("code.ml-2.is-size-7", {}, ecran.slug) : null
        ),
        h(
          "p.is-size-7.mb-2",
          {},
          eligibles.length === 0
            ? h("span.tag.is-danger.is-light", {}, "⚠️ Aucun contenu diffusé en ce moment")
            : h(
                "span.has-text-grey",
                {},
                `${eligibles.length} slide(s) en diffusion · tour de ${formatDuree(cycle)}`,
                vivant?.slideCourant
                  ? h(
                      "span",
                      {},
                      " · à l'écran : ",
                      h(
                        "strong",
                        {},
                        store.slides.find((s) => s.id === vivant.slideCourant)?.name ?? "?"
                      )
                    )
                  : null
              ),
          h(
            "span.ml-2.tag.is-light",
            { class: enLigne ? "is-success" : "" },
            enLigne ? "● en ligne" : "○ liaison inconnue"
          )
        ),
        h(
          "nav.level.is-mobile.mb-0",
          {},
          h(
            "div.level-left",
            {},
            ecran.slug
              ? h(
                  "a.level-item.action",
                  {
                    href: urlLecteur({ slug: ecran.slug }),
                    target: "_blank",
                    rel: "noreferrer",
                    title: "Visionner",
                  },
                  icone("fa-tv")
                )
              : null,
            lien(`/ecran/${ecran.id}/slides`, icone("fa-images"), {
              class: "level-item action",
              title: "Slides de l'écran",
            }),
            lien(`/ecran/${ecran.id}/frise`, icone("fa-chart-gantt"), {
              class: "level-item action",
              title: "Frise de la journée",
            }),
            lien(`/ecran/${ecran.id}`, icone("fa-pen"), {
              class: "level-item action",
              title: "Configurer",
            }),
            h(
              "a.level-item.action",
              {
                title: "Recharger l'écran à distance",
                onClick: () => piloter(COMMANDES.recharger(ecran.id), "Rechargement demandé."),
              },
              icone("fa-sync")
            ),
            h(
              "a.level-item.action",
              {
                title: "Passer au slide suivant",
                onClick: () => piloter(COMMANDES.avancer(ecran.id), "Slide suivant demandé."),
              },
              icone("fa-arrow-right")
            )
          )
        )
      )
    );
  }

  async function creerEcran() {
    try {
      const ecran = await apiEcrans.create();
      await rechargerDonnees();
      naviguer(`/ecran/${ecran.id}`);
    } catch (e) {
      erreur(e);
    }
  }

  function piloter(commande, texte) {
    if (window.liaison?.envoyer(commande)) message(texte);
    else message("Liaison temps réel indisponible.", { ton: "warning" });
  }
}

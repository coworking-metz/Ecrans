/**
 * Frise de la journée — la contrepartie visuelle des plages horaires.
 *
 * Répond à « qu'est-ce qui passe sur cet écran, et quand ? ». En v1, le
 * paramétrage `display_times` était totalement invisible : il fallait lire le
 * JSON de chaque slide et le simuler mentalement.
 */

import { h, rendre } from "../dom.js";
import { lien, naviguer } from "../router.js";
import store, { ecranParId, subscribe } from "../../core/store.js";
import { slidesDeLEcran } from "../../core/playlist.js";
import { segmentsDuJour, hasPriority, isAlways, getIsoWeek } from "../../core/schedule.js";
import { formatDuree } from "../../core/dates.js";

const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function vueFrise(params, conteneur) {
  const ecran = ecranParId(params.id);
  if (!ecran) {
    conteneur.append(h("p.notification.is-warning", {}, "Écran introuvable."));
    return;
  }

  let jour = new Date();
  jour.setHours(0, 0, 0, 0);

  const racine = h("div");
  conteneur.append(racine);

  dessiner();
  const desabonner = subscribe(dessiner);
  return desabonner;

  function decalerJour(delta) {
    jour = new Date(jour);
    jour.setDate(jour.getDate() + delta);
    dessiner();
  }

  function dessiner() {
    const slides = slidesDeLEcran(ecran, store.slides, store.liens).filter(
      (s) => s.active !== false
    );

    const lignes = slides.map((slide) => ({
      slide,
      segments: segmentsDuJour(slide.display_times, jour),
      prioritaire: hasPriority(slide.display_times),
      permanent: isAlways(slide.display_times),
    }));

    // Plages pendant lesquelles un slide prioritaire évince les autres.
    const zonesEviction = lignes
      .filter((l) => l.prioritaire)
      .flatMap((l) => l.segments.map((s) => ({ ...s, nom: l.slide.name })));

    const estAujourdhui = new Date().toDateString() === jour.toDateString();
    const minuteCourante = new Date().getHours() * 60 + new Date().getMinutes();

    rendre(
      racine,
      h(
        "div.buttons.are-small",
        {},
        lien(`/ecran/${ecran.id}/slides`, "← Slides de l'écran", { class: "button is-small" })
      ),

      h("h1.title.is-4", {}, `Frise — « ${ecran.name} »`),

      h(
        "div.frise-navigation",
        {},
        h("button.button.is-small", { type: "button", onClick: () => decalerJour(-1) }, "‹ Jour précédent"),
        h(
          "span.frise-jour",
          {},
          `${JOURS_FR[jour.getDay()]} ${jour.toLocaleDateString("fr-FR")}`,
          h("span.tag.is-light.ml-2", {}, `semaine ${getIsoWeek(jour)} (${
            getIsoWeek(jour) % 2 === 0 ? "paire" : "impaire"
          })`)
        ),
        h("button.button.is-small", { type: "button", onClick: () => decalerJour(1) }, "Jour suivant ›"),
        h(
          "button.button.is-small.is-light",
          { type: "button", onClick: () => { jour = new Date(); jour.setHours(0,0,0,0); dessiner(); } },
          "Aujourd'hui"
        )
      ),

      lignes.length === 0
        ? h("p.notification.is-light.mt-4", {}, "Aucun slide actif sur cet écran.")
        : h(
            "div.frise",
            {},
            grilleHeures(),
            estAujourdhui
              ? h("div.frise-maintenant", {
                  style: { left: `${(minuteCourante / 1440) * 100}%` },
                  title: "Maintenant",
                })
              : null,
            zonesEviction.map((zone) =>
              h("div.frise-eviction", {
                style: {
                  left: `${(zone.debut / 1440) * 100}%`,
                  width: `${((zone.fin - zone.debut) / 1440) * 100}%`,
                },
                title: `« ${zone.nom} » est prioritaire : les slides non permanents sont écartés.`,
              })
            ),
            lignes.map(ligneFrise)
          ),

      h(
        "div.content.is-small.mt-4",
        {},
        h("p.heading", {}, "Légende"),
        h(
          "ul",
          {},
          h("li", {}, h("span.frise-exemple.est-normal"), " slide diffusé pendant la plage"),
          h("li", {}, h("span.frise-exemple.est-prioritaire"), " slide prioritaire : il écarte les autres"),
          h("li", {}, h("span.frise-exemple.est-permanent"), " slide permanent : il résiste à l'éviction"),
          h("li", {}, h("span.frise-exemple.est-zone"), " période d'éviction par un slide prioritaire")
        )
      )
    );
  }

  function grilleHeures() {
    const marques = [];
    for (let heure = 0; heure <= 24; heure += 2) {
      marques.push(
        h(
          "div.frise-heure",
          { style: { left: `${(heure / 24) * 100}%` } },
          h("span", {}, `${String(heure).padStart(2, "0")}h`)
        )
      );
    }
    return h("div.frise-grille", {}, marques);
  }

  function ligneFrise({ slide, segments, prioritaire, permanent }) {
    const classe = prioritaire ? "est-prioritaire" : permanent ? "est-permanent" : "est-normal";
    return h(
      "div.frise-ligne",
      {},
      h(
        "div.frise-libelle",
        { onClick: () => naviguer(`/slide/${slide.id}`), title: "Ouvrir ce slide" },
        prioritaire ? h("span", { title: "Prioritaire" }, "⚡ ") : null,
        permanent ? h("span", { title: "Permanent" }, "📌 ") : null,
        slide.name,
        h("span.has-text-grey.ml-1", {}, formatDuree(slide.duration))
      ),
      h(
        "div.frise-piste",
        {},
        segments.length === 0
          ? h("span.frise-vide", {}, "ne passe pas ce jour-là")
          : segments.map((s) =>
              h("div.frise-barre", {
                class: classe,
                style: {
                  left: `${(s.debut / 1440) * 100}%`,
                  width: `${Math.max(0.5, ((s.fin - s.debut) / 1440) * 100)}%`,
                },
                title: `${minutesEnHeure(s.debut)} → ${minutesEnHeure(s.fin)}`,
              })
            )
      )
    );
  }
}

function minutesEnHeure(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

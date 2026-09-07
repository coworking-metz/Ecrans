/** Fiche de configuration d'un écran. */

import { h, bouton, champ, message, erreur, confirmer, rendre } from "../dom.js";
import { lien, naviguer } from "../router.js";
import { ecranParId } from "../../core/store.js";
import { ecrans as apiEcrans } from "../../core/api.js";
import { selecteurMedia } from "../components/medias.js";
import { editeurHoraires } from "../components/horaires.js";
import { rechargerDonnees } from "../../admin-data.js";

export function vueEcran(params, conteneur) {
  const source = ecranParId(params.id);
  if (!source) {
    conteneur.append(h("p.notification.is-warning", {}, "Écran introuvable."));
    return;
  }

  // Copie de travail : rien n'est écrit tant que l'utilisateur ne valide pas.
  const brouillon = { ...source };
  let modifie = false;

  const marquer = () => {
    modifie = true;
    majBarre();
  };

  const racine = h("div");
  conteneur.append(racine);

  const barre = h("div.buttons.validation-bar");

  function majBarre() {
    rendre(
      barre,
      bouton("Valider", {
        classe: `is-primary ${modifie ? "" : "is-light"}`,
        onClick: enregistrer,
      }),
      lien(`/ecran/${source.id}/slides`, "Retour aux slides", { class: "button is-text" }),
      modifie ? h("span.has-text-grey.ml-2", {}, "Modifications non enregistrées") : null
    );
  }

  dessiner();
  brancherAvertissement();
  return debrancherAvertissement;

  /* ---------------------------------------------------------------------- */

  function dessiner() {
    rendre(
      racine,

      h(
        "div.buttons.are-small",
        {},
        lien("/", "← Retour aux écrans", { class: "button is-small" }),
        lien(`/ecran/${source.id}/slides`, "Slides de cet écran", { class: "button is-small" })
      ),

      h("h1.title.is-4", {}, `Écran « ${source.name} »`),

      h(
        "div.columns",
        {},
        h(
          "div.column",
          {},
          champ(
            "Nom de l'écran",
            h("input.input", {
              type: "text",
              value: brouillon.name || "",
              onInput: (e) => {
                brouillon.name = e.target.value;
                marquer();
              },
            }),
            "Sert à retrouver l'écran dans l'administration."
          ),
          champ(
            "Adresse courte (slug)",
            h("input.input", {
              type: "text",
              value: brouillon.slug || "",
              onInput: (e) => {
                brouillon.slug = e.target.value.trim();
                marquer();
              },
            }),
            "Identifiant utilisé dans l'adresse de diffusion, à paramétrer sur le téléviseur."
          )
        ),
        h(
          "div.column",
          {},
          selecteurMedia({
            libelle: "Image d'illustration",
            valeur: brouillon.image,
            onChange: (url) => {
              brouillon.image = url;
              marquer();
            },
          })
        )
      ),

      h("hr"),

      /* --- Barre latérale --------------------------------------------- */
      h(
        "div.field",
        {},
        h(
          "label.checkbox",
          {},
          h("input", {
            type: "checkbox",
            checked: !!brouillon.show_side,
            onChange: (e) => {
              brouillon.show_side = e.target.checked;
              marquer();
              dessiner();
            },
          }),
          " Afficher une barre latérale sur cet écran"
        )
      ),

      brouillon.show_side
        ? h(
            "div.box",
            {},
            champ(
              "Adresse de la page à afficher",
              h("input.input", {
                type: "url",
                placeholder: "https://…",
                value: brouillon.side_url || "",
                onInput: (e) => {
                  brouillon.side_url = e.target.value;
                  marquer();
                },
              })
            ),
            editeurHoraires({
              valeur: brouillon.side_times,
              avecPriorite: false, // priorité et permanence n'ont pas de sens ici
              onChange: (valeur) => {
                brouillon.side_times = valeur;
                marquer();
              },
            })
          )
        : null,

      h("hr"),

      /* --- Playlist ---------------------------------------------------- */
      h(
        "div.field",
        {},
        h(
          "label.checkbox",
          {},
          h("input", {
            type: "checkbox",
            checked: !!brouillon.playlist_on,
            onChange: (e) => {
              brouillon.playlist_on = e.target.checked;
              marquer();
              dessiner();
            },
          }),
          " Diffuser une playlist audio"
        )
      ),

      brouillon.playlist_on ? blocPlaylist() : null,

      h("hr"),

      h(
        "nav.level.is-mobile",
        {},
        h(
          "div.level-left",
          {},
          h(
            "a.level-item.has-text-danger",
            { onClick: supprimer },
            "🗑 Supprimer cet écran"
          )
        )
      ),
      h(
        "p.help",
        {},
        "Les slides rattachés à cet écran ne seront pas supprimés : ils restent disponibles pour les autres écrans."
      ),

      barre
    );
    majBarre();
  }

  function blocPlaylist() {
    const valeurVolume = h("span.ml-2", {}, `${brouillon.playlist_volume ?? 50} %`);
    return h(
      "div.box",
      {},
      champ(
        "Morceaux à diffuser",
        h("textarea.textarea.is-small", {
          rows: 6,
          placeholder: "https://…/morceau-1.mp3\nhttps://…/morceau-2.mp3",
          value: brouillon.playlist || "",
          onInput: (e) => {
            brouillon.playlist = e.target.value;
            marquer();
          },
        }),
        "Une adresse de fichier audio par ligne. La liste est mélangée puis jouée en boucle."
      ),
      h(
        "div.field",
        {},
        h("label.label", {}, "Volume"),
        h(
          "div.control.is-flex.is-align-items-center",
          {},
          h("input", {
            type: "range",
            min: 0,
            max: 100,
            step: 5,
            value: brouillon.playlist_volume ?? 50,
            onInput: (e) => {
              brouillon.playlist_volume = Number(e.target.value);
              valeurVolume.textContent = `${brouillon.playlist_volume} %`;
              marquer();
            },
          }),
          valeurVolume
        )
      )
    );
  }

  /* ---- Actions ---------------------------------------------------------- */

  async function enregistrer() {
    try {
      await apiEcrans.save(brouillon);
      await rechargerDonnees();
      modifie = false;
      majBarre();
      message("Écran enregistré.");
    } catch (e) {
      erreur(e);
    }
  }

  async function supprimer() {
    if (
      !confirmer(
        `Supprimer l'écran « ${source.name} » ? Les slides associés ne seront pas effacés.`
      )
    ) {
      return;
    }
    try {
      await apiEcrans.remove(source.id);
      await rechargerDonnees();
      message("Écran supprimé.");
      naviguer("/");
    } catch (e) {
      erreur(e);
    }
  }

  /* ---- Avertissement avant de quitter ----------------------------------- */

  function avantFermeture(e) {
    if (!modifie) return;
    e.preventDefault();
    e.returnValue = "";
  }
  function brancherAvertissement() {
    window.addEventListener("beforeunload", avantFermeture);
  }
  function debrancherAvertissement() {
    window.removeEventListener("beforeunload", avantFermeture);
  }
}

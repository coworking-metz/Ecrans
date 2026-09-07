/** Fiche d'un slide : paramètres, contenu, horaires, état et aperçu. */

import Quill from "quill";
import "quill/dist/quill.snow.css";

import { h, bouton, champ, message, erreur, rendre, icone } from "../dom.js";
import { lien, naviguer } from "../router.js";
import store, { slideParId, ecransDuSlide, slidesParEcran, subscribe } from "../../core/store.js";
import { slides as apiSlides, liens as apiLiens } from "../../core/api.js";
import { computeSlideStateGlobal } from "../../core/state.js";
import { bandeauEtat } from "../components/etat.js";
import { editeurHoraires } from "../components/horaires.js";
import { selecteurMedia } from "../components/medias.js";
import { TYPES, nettoyerEmoji, metaParDefaut } from "../../core/slide-types.js";
import { formatDateHeure, versChampDateHeure, depuisChampDateHeure } from "../../core/dates.js";
import { renderSlide } from "../../render/index.js";
import { rechargerDonnees } from "../../admin-data.js";

const BARRE_QUILL = [
  ["bold", "italic", "underline", "strike"],
  [{ header: 1 }, { header: 2 }],
  [{ size: ["small", false, "large", "huge"] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }],
  ["clean"],
];

export function vueSlide(params, conteneur) {
  const source = slideParId(params.id);
  if (!source) {
    conteneur.append(h("p.notification.is-warning", {}, "Slide introuvable."));
    return;
  }

  const brouillon = { ...source, meta: { ...source.meta } };
  let ecransIds = ecransDuSlide(source.id).map((e) => e.id);
  let modifie = false;
  let quill = null;

  const racine = h("div");
  conteneur.append(racine);

  const zoneApercu = h("div.apercu-tv");
  const zoneEtat = h("div");
  const barre = h("div.buttons.validation-bar");

  const marquer = () => {
    modifie = true;
    majBarre();
    majApercu();
  };

  dessiner();
  const desabonner = subscribe(majEtat);
  window.addEventListener("beforeunload", avantFermeture);
  return () => {
    desabonner();
    window.removeEventListener("beforeunload", avantFermeture);
  };

  /* ---------------------------------------------------------------------- */

  function dessiner() {
    rendre(
      racine,
      h(
        "div.buttons.are-small",
        {},
        lien("/slides", "← Tous les slides", { class: "button is-small" }),
        h(
          "a.button.is-small",
          {
            href: `/visionner/slide/${source.id}`,
            target: "_blank",
            rel: "noreferrer",
          },
          icone("fa-tv"),
          h("span", {}, "Aperçu plein écran")
        )
      ),

      h("h1.title.is-4", {}, brouillon.name || "(sans nom)"),

      h(
        "div.columns",
        {},
        h("div.column.is-4", {}, colonneIdentite()),
        h("div.column", {}, colonneContenu()),
        h("div.column.is-3", {}, colonneControle())
      ),

      h(
        "p.help.mt-4",
        {},
        `Créé le ${formatDateHeure(source.created_at)} · dernière modification le ${formatDateHeure(
          source.updated_at
        )}`
      ),

      barre
    );
    majBarre();
    majEtat();
    majApercu();
  }

  /* ---- Colonne 1 : identité et diffusion -------------------------------- */

  function colonneIdentite() {
    return h(
      "div",
      {},
      champ(
        "Nom du slide",
        h("input.input", {
          type: "text",
          value: brouillon.name || "",
          onInput: (e) => {
            brouillon.name = e.target.value;
            marquer();
          },
        }),
        "Sert à retrouver le slide dans l'administration."
      ),

      h(
        "div.field",
        {},
        h("label.label", {}, "Diffusion"),
        h(
          "div.control",
          {},
          h(
            "label.interrupteur.est-grand",
            { class: brouillon.active ? "est-actif" : "" },
            h("input", {
              type: "checkbox",
              checked: brouillon.active !== false,
              onChange: (e) => {
                brouillon.active = e.target.checked;
                marquer();
                dessiner();
              },
            }),
            h("span", {}, brouillon.active ? "ON" : "OFF")
          ),
          ecransIds.length > 1 && brouillon.active
            ? h(
                "p.help.has-text-warning-dark",
                {},
                `⚠️ Ce slide est diffusé sur ${ecransIds.length} écrans : le désactiver le coupe partout.`
              )
            : null
        )
      ),

      h(
        "div.columns.is-mobile",
        {},
        h(
          "div.column",
          {},
          champ(
            "Type",
            h(
              "div.select.is-fullwidth",
              {},
              h(
                "select",
                {
                  value: brouillon.type,
                  onChange: (e) => {
                    brouillon.type = e.target.value;
                    // On complète le contenu avec les valeurs par défaut du
                    // nouveau type, sans effacer ce qui était déjà saisi.
                    brouillon.meta = { ...metaParDefaut(brouillon.type), ...brouillon.meta };
                    marquer();
                    dessiner();
                  },
                },
                TYPES.map((t) => h("option", { value: t.slug }, t.nom))
              )
            )
          )
        ),
        h(
          "div.column",
          {},
          champ(
            "Durée (secondes)",
            h("input.input", {
              type: "number",
              min: 1,
              value: brouillon.duration,
              onInput: (e) => {
                brouillon.duration = Number(e.target.value);
                marquer();
              },
            })
          )
        )
      ),

      champ(
        "Date de publication",
        h("input.input", {
          type: "datetime-local",
          value: versChampDateHeure(brouillon.publication),
          onInput: (e) => {
            brouillon.publication = depuisChampDateHeure(e.target.value);
            marquer();
          },
        }),
        "Le slide n'apparaît pas avant cette date."
      ),

      champ(
        "Date d'expiration",
        h("input.input", {
          type: "datetime-local",
          value: versChampDateHeure(brouillon.expiration),
          onInput: (e) => {
            brouillon.expiration = depuisChampDateHeure(e.target.value);
            marquer();
          },
        }),
        "Le slide disparaît automatiquement après cette date."
      ),

      champ(
        "Écrans de diffusion",
        h(
          "div.select.is-multiple.is-fullwidth",
          {},
          h(
            "select",
            {
              multiple: true,
              size: Math.min(8, Math.max(3, store.ecrans.length)),
              onChange: (e) => {
                ecransIds = [...e.target.selectedOptions].map((o) => Number(o.value));
                marquer();
                dessiner();
              },
            },
            store.ecrans.map((ecran) =>
              h(
                "option",
                { value: String(ecran.id), selected: ecransIds.includes(ecran.id) },
                ecran.name
              )
            )
          )
        ),
        ecransIds.length === 0 ? "⚠️ Aucun écran : ce slide ne passera nulle part." : null
      )
    );
  }

  /* ---- Colonne 2 : contenu ---------------------------------------------- */

  function colonneContenu() {
    switch (brouillon.type) {
      case "default":
        return formulaireComposition();
      case "image":
        return formulaireImage();
      case "video":
        return formulaireVideo();
      case "url":
        return formulaireUrl();
      default:
        return h("p", {}, "Type inconnu.");
    }
  }

  function majMeta(cle, valeur) {
    brouillon.meta = { ...brouillon.meta, [cle]: valeur };
    marquer();
  }

  function formulaireComposition() {
    const aUneImagePrincipale = !!brouillon.meta.imagePrincipale;
    const aUnEmoji = !!brouillon.meta.emojiPrincipal;

    const zoneEditeur = h("div.editeur-texte");
    // Quill se branche après insertion dans le document.
    queueMicrotask(() => {
      if (!zoneEditeur.isConnected) return;
      quill = new Quill(zoneEditeur, { theme: "snow", modules: { toolbar: BARRE_QUILL } });
      quill.root.innerHTML = brouillon.meta.texte || "";
      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        brouillon.meta = { ...brouillon.meta, texte: html === "<p><br></p>" ? "" : html };
        marquer();
      });
    });

    return h(
      "div",
      {},
      h(
        "div.columns",
        {},
        h(
          "div.column",
          { style: aUneImagePrincipale ? { opacity: 0.4, pointerEvents: "none" } : {} },
          champ(
            "Emoji principal",
            h("input.input", {
              type: "text",
              autocomplete: "off",
              spellcheck: false,
              value: brouillon.meta.emojiPrincipal || "",
              onInput: (e) => {
                const propre = nettoyerEmoji(e.target.value);
                e.target.value = propre;
                majMeta("emojiPrincipal", propre);
              },
            }),
            "Un seul emoji, affiché en grand au-dessus du texte."
          )
        ),
        h(
          "div.column",
          { style: aUnEmoji ? { opacity: 0.4, pointerEvents: "none" } : {} },
          selecteurMedia({
            libelle: "… ou image principale",
            valeur: brouillon.meta.imagePrincipale,
            onChange: (url) => majMeta("imagePrincipale", url),
          })
        )
      ),

      champ(
        "Titre",
        h("input.input", {
          type: "text",
          value: brouillon.meta.titre || "",
          onInput: (e) => majMeta("titre", e.target.value),
        })
      ),

      h("div.field", {}, h("label.label", {}, "Texte"), h("div.control", {}, zoneEditeur)),

      h(
        "div.columns",
        {},
        h(
          "div.column.is-half",
          {},
          champCouleur("Couleur du texte", brouillon.meta.color || "#FFFFFF", (v) =>
            majMeta("color", v)
          )
        )
      ),

      champ(
        "Adresse à afficher en QR code",
        h("input.input", {
          type: "url",
          placeholder: "https://…",
          value: brouillon.meta.url || "",
          onInput: (e) => majMeta("url", e.target.value),
        }),
        "Un QR code est incrusté en bas à droite du slide."
      ),

      h("hr"),
      h("p.heading", {}, "Image de fond"),
      formulaireImage()
    );
  }

  function formulaireImage() {
    const aUneImage = !!brouillon.meta.image;
    return h(
      "div",
      {},
      selecteurMedia({
        libelle: brouillon.type === "image" ? "Image" : "Image de fond",
        valeur: brouillon.meta.image,
        onChange: (url) => {
          majMeta("image", url);
          dessiner();
        },
      }),
      h(
        "div.columns",
        {},
        aUneImage
          ? h(
              "div.column",
              {},
              champ(
                "Ajustement",
                h(
                  "div.select.is-fullwidth",
                  {},
                  h(
                    "select",
                    {
                      value: brouillon.meta.fit || "cover",
                      onChange: (e) => majMeta("fit", e.target.value),
                    },
                    h("option", { value: "cover" }, "Remplir (cover)"),
                    h("option", { value: "contain" }, "Entière (contain)")
                  )
                )
              )
            )
          : null,
        aUneImage
          ? h(
              "div.column",
              {},
              champ(
                `Opacité — ${Math.round((brouillon.meta.opacity ?? 1) * 100)} %`,
                h("input", {
                  type: "range",
                  min: 0,
                  max: 1,
                  step: 0.1,
                  value: brouillon.meta.opacity ?? 1,
                  onInput: (e) => {
                    majMeta("opacity", Number(e.target.value));
                    dessiner();
                  },
                })
              )
            )
          : null,
        h(
          "div.column",
          {},
          champCouleur("Couleur de fond", brouillon.meta.backgroundColor || "#000000", (v) =>
            majMeta("backgroundColor", v)
          )
        )
      )
    );
  }

  function formulaireVideo() {
    return h(
      "div",
      {},
      selecteurMedia({
        libelle: "Vidéo",
        valeur: brouillon.meta.video,
        onChange: (url) => {
          majMeta("video", url);
          proposerDuree(url);
        },
      }),
      h(
        "p.help",
        {},
        "La vidéo est lue automatiquement, sans son. La durée du slide doit correspondre à sa longueur."
      )
    );
  }

  /**
   * Ajout v2 : on mesure la vidéo et on propose sa durée réelle.
   * En v1, une durée mal réglée coupait la vidéo ou laissait un écran figé.
   */
  function proposerDuree(url) {
    if (!url) return;
    const sonde = document.createElement("video");
    sonde.preload = "metadata";
    sonde.src = url;
    sonde.onloadedmetadata = () => {
      const duree = Math.ceil(sonde.duration);
      if (!Number.isFinite(duree) || duree <= 0) return;
      if (duree === brouillon.duration) return;
      message(`La vidéo dure ${duree} s. Ajuster la durée du slide ?`, {
        ton: "info",
        duree: 15000,
        action: {
          label: `Régler sur ${duree} s`,
          onClick: () => {
            brouillon.duration = duree;
            marquer();
            dessiner();
          },
        },
      });
    };
  }

  function formulaireUrl() {
    return champ(
      "Adresse de la page à afficher",
      h("input.input", {
        type: "url",
        placeholder: "https://…",
        value: brouillon.meta.url || "",
        onInput: (e) => majMeta("url", e.target.value),
      }),
      "La page occupe toute la surface du slide."
    );
  }

  function champCouleur(libelle, valeur, onChange) {
    const texte = h("input.input", {
      type: "text",
      value: valeur,
      onInput: (e) => onChange(e.target.value),
    });
    const couleur = h("input.input", {
      type: "color",
      value: valeur,
      onInput: (e) => {
        texte.value = e.target.value;
        onChange(e.target.value);
      },
    });
    return champ(libelle, h("div.champ-couleur", {}, couleur, texte));
  }

  /* ---- Colonne 3 : contrôle --------------------------------------------- */

  function colonneControle() {
    return h(
      "div",
      {},
      zoneApercu,
      zoneEtat,
      h(
        "div.mt-4",
        {},
        editeurHoraires({
          valeur: brouillon.display_times,
          onChange: (valeur) => {
            brouillon.display_times = valeur;
            marquer();
            majEtat();
          },
        })
      )
    );
  }

  /** L'aperçu utilise EXACTEMENT le même rendu que le lecteur. */
  function majApercu() {
    const rendu = renderSlide({ ...brouillon, id: source.id }, { largeurImage: 800 });
    rendre(
      zoneApercu,
      h("p.heading", {}, "Aperçu"),
      h("div.tv", {}, h("div.tv-ecran", {}, rendu.element))
    );
    rendu.demarrer?.();
  }

  function majEtat() {
    const ecrans = store.ecrans.filter((e) => ecransIds.includes(e.id));
    const etat = computeSlideStateGlobal(
      { ...brouillon, id: source.id },
      {
        now: store.maintenant,
        ecrans,
        liens: store.liens,
        slidesParEcran: slidesParEcran(),
      }
    );
    rendre(
      zoneEtat,
      bandeauEtat(etat, { ...brouillon, id: source.id }, { onAction: appliquerCorrection })
    );
  }

  function appliquerCorrection(action) {
    switch (action.action) {
      case "activer":
        brouillon.active = true;
        break;
      case "expiration":
        brouillon.expiration = null;
        break;
      case "publication":
        brouillon.publication = null;
        break;
      case "voir-slide":
        return naviguer(`/slide/${action.id}`);
      default:
        break;
    }
    marquer();
    dessiner();
  }

  /* ---- Enregistrement --------------------------------------------------- */

  function majBarre() {
    rendre(
      barre,
      bouton("Valider", {
        classe: `is-primary ${modifie ? "" : "is-light"}`,
        onClick: enregistrer,
      }),
      lien("/slides", "Retour", { class: "button is-text" }),
      modifie ? h("span.has-text-grey.ml-2", {}, "Modifications non enregistrées") : null
    );
  }

  async function enregistrer() {
    try {
      await apiSlides.save(brouillon);
      await apiLiens.setEcransDuSlide(source.id, ecransIds);
      await rechargerDonnees();
      modifie = false;
      majBarre();
      majEtat();
      message("Slide enregistré.");
    } catch (e) {
      erreur(e);
    }
  }

  function avantFermeture(e) {
    if (!modifie) return;
    e.preventDefault();
    e.returnValue = "";
  }
}

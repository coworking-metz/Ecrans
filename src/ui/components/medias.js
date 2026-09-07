/**
 * Bibliothèque de médias : dépôt, recherche, liste, et sélecteur réutilisable
 * dans tous les formulaires.
 */

// `rendre` est aliasé : ces composants ont leur propre fonction locale `rendre`,
// et il ne faut surtout pas retomber sur `replaceChildren` par mégarde (voir
// plus bas — la méthode native n'aplatit pas les tableaux).
import { h, bouton, icone, message, erreur, confirmer, rendre as remplir } from "../dom.js";
import { medias as apiMedias, FORMATS_ACCEPTES, FORMATS_MINIATURE } from "../../core/api.js";
import { urlMiniature, urlImage, fabriquerMiniature, raccourcirNom } from "../../core/media.js";
import { formatDateHeure } from "../../core/dates.js";
import store, { setState } from "../../core/store.js";

export async function rechargerMedias() {
  try {
    setState({ medias: await apiMedias.list() });
  } catch (e) {
    erreur(e);
  }
}

/* -------------------------------------------------------------------------- */
/*  Dépôt de fichiers                                                          */
/* -------------------------------------------------------------------------- */

export function zoneDepot({ onDepose } = {}) {
  const entree = h("input.file-input", {
    type: "file",
    multiple: true,
    accept: FORMATS_ACCEPTES.join(","),
    onChange: (e) => envoyer([...e.target.files]),
  });

  const etiquette = h(
    "label.file-label",
    {},
    entree,
    h(
      "span.file-cta",
      {},
      h("span.file-icon", {}, h("i.fas.fa-upload")),
      h("span.file-label", {}, "Ajouter des fichiers")
    )
  );

  const racine = h("div.file.depot", {}, etiquette);

  // Dépôt par glisser-déposer, en plus du sélecteur de fichiers.
  racine.addEventListener("dragover", (e) => {
    e.preventDefault();
    racine.classList.add("survol");
  });
  racine.addEventListener("dragleave", () => racine.classList.remove("survol"));
  racine.addEventListener("drop", (e) => {
    e.preventDefault();
    racine.classList.remove("survol");
    envoyer([...e.dataTransfer.files]);
  });

  async function envoyer(fichiers) {
    if (!fichiers.length) return;

    const refuses = fichiers.filter((f) => !FORMATS_ACCEPTES.includes(f.type));
    if (refuses.length) {
      message(
        `Format non autorisé pour : ${refuses.map((f) => f.name).join(", ")}.`,
        { ton: "warning", duree: 10000 }
      );
    }
    const acceptes = fichiers.filter((f) => FORMATS_ACCEPTES.includes(f.type));
    if (!acceptes.length) return;

    etiquette.classList.add("is-loading");
    let dernier = null;
    for (const fichier of acceptes) {
      try {
        await apiMedias.upload(`medias/${fichier.name}`, fichier, { upsert: true });
        if (FORMATS_MINIATURE.includes(fichier.type)) {
          try {
            const miniature = await fabriquerMiniature(fichier);
            await apiMedias.upload(`thumbnails/${fichier.name}`, miniature, { upsert: true });
          } catch (e) {
            // Une miniature manquante n'est pas bloquante : l'original s'affiche.
            console.warn("[médias] miniature non générée pour", fichier.name, e);
          }
        }
        dernier = fichier.name;
      } catch (e) {
        erreur(e);
      }
    }
    etiquette.classList.remove("is-loading");
    await rechargerMedias();
    message(`${acceptes.length} fichier(s) ajouté(s).`);
    if (dernier && onDepose) {
      const media = store.medias.find((m) => m.nom === dernier);
      if (media) onDepose(media);
    }
  }

  return racine;
}

/* -------------------------------------------------------------------------- */
/*  Liste                                                                      */
/* -------------------------------------------------------------------------- */

function ligneMedia(media, { selectionnable, selectionne, onSelect, onSupprime }) {
  return h(
    "article.media.media-ligne",
    {
      class: [selectionnable ? "est-selectionnable" : "", selectionne ? "est-selectionne" : ""]
        .filter(Boolean)
        .join(" "),
      onClick: selectionnable ? () => onSelect(media) : null,
    },
    h(
      "figure.media-left",
      {},
      h(
        "p.image.apercu-media",
        {},
        h("img", {
          src: urlMiniature(media.url) || urlImage(media.url, { w: 128 }),
          alt: media.nom,
          loading: "lazy",
          onError: (e) => {
            // Pas de miniature (SVG, vidéo) : on retombe sur l'original.
            if (e.target.dataset.replie) return;
            e.target.dataset.replie = "1";
            e.target.src = media.url;
          },
        })
      )
    ),
    h(
      "div.media-content",
      {},
      h(
        "p.mb-1",
        {},
        h("strong", { title: media.nom }, raccourcirNom(media.nom)),
        h("small.has-text-grey.ml-2", {}, formatDateHeure(media.modifieLe))
      ),
      onSupprime
        ? h(
            "nav.level.is-mobile.mb-0",
            {},
            h(
              "div.level-left",
              {},
              h(
                "a.level-item",
                { href: media.url, target: "_blank", rel: "noreferrer", title: "Ouvrir" },
                icone("fa-eye")
              ),
              h(
                "a.level-item",
                {
                  title: "Supprimer",
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSupprime(media);
                  },
                },
                icone("fa-trash")
              )
            )
          )
        : null
    )
  );
}

/**
 * Liste de médias avec recherche.
 * @param {object} options
 * @param {boolean} [options.selectionnable]
 * @param {Function} [options.onSelect]
 * @param {string} [options.selectionne] nom du média sélectionné
 * @param {boolean} [options.avecSuppression]
 */
export function listeMedias({
  selectionnable = false,
  onSelect = () => {},
  selectionne = null,
  avecSuppression = false,
  hauteurMax = null,
} = {}) {
  let recherche = "";

  const conteneur = h("div.medias-liste", {
    style: hauteurMax ? { maxHeight: hauteurMax, overflowY: "auto" } : {},
  });

  const champRecherche = h(
    "div.field.mb-2",
    {},
    h(
      "p.control.has-icons-left",
      {},
      h("input.input.is-small", {
        type: "search",
        placeholder: "Rechercher un fichier…",
        onInput: (e) => {
          recherche = e.target.value.trim().toLowerCase();
          rendreListe();
        },
      }),
      h("span.icon.is-small.is-left", {}, h("i.fas.fa-magnifying-glass"))
    )
  );

  async function supprimer(media) {
    if (!confirmer(`Effacer le fichier « ${media.nom} » ?`)) return;
    try {
      await apiMedias.remove([media.nom]);
      await rechargerMedias();
      message("Fichier supprimé.");
      rendreListe();
    } catch (e) {
      erreur(e);
    }
  }

  function rendreListe() {
    const filtres = store.medias.filter((m) => !recherche || m.index.includes(recherche));
    // `remplir` (et non `replaceChildren`) : la méthode native du DOM n'aplatit
    // pas les tableaux, elle les convertit en texte — la liste s'affichait en
    // « [object HTMLElement],[object HTMLElement],… ».
    remplir(
      conteneur,
      filtres.length === 0
        ? h("p.has-text-grey.p-4", {}, recherche ? "Aucun fichier ne correspond." : "Aucun fichier.")
        : filtres.map((m) =>
            ligneMedia(m, {
              selectionnable,
              selectionne: selectionne === m.url,
              onSelect,
              onSupprime: avecSuppression ? supprimer : null,
            })
          )
    );
  }

  rendreListe();

  const racine = h("div", {}, champRecherche, conteneur);
  racine.rafraichir = (nouveauSelectionne) => {
    if (nouveauSelectionne !== undefined) selectionne = nouveauSelectionne;
    rendreListe();
  };
  return racine;
}

/* -------------------------------------------------------------------------- */
/*  Sélecteur                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sélecteur repliable, réutilisable dans tous les formulaires.
 * @param {object} options
 * @param {string} options.valeur    URL du média retenu
 * @param {Function} options.onChange (url|"") => void
 * @param {string} [options.libelle]
 */
export function selecteurMedia({ valeur, onChange, libelle = "Média" }) {
  let ouvert = false;
  let courant = valeur || "";
  const racine = h("div.selecteur-media");

  function choisir(media) {
    courant = media.url;
    ouvert = false;
    onChange(courant);
    rendre();
  }

  function rendre() {
    remplir(
      racine,
      h(
        "div.field",
        {},
        h("label.label", {}, libelle),
        courant
          ? h(
              "div.apercu-selection",
              {},
              h("img", {
                src: urlMiniature(courant) || urlImage(courant, { w: 300 }),
                alt: "",
                onError: (e) => {
                  if (e.target.dataset.replie) return;
                  e.target.dataset.replie = "1";
                  e.target.src = courant;
                },
              }),
              h(
                "button.button.is-small.is-light",
                {
                  type: "button",
                  onClick: () => {
                    courant = "";
                    onChange("");
                    rendre();
                  },
                },
                "Retirer"
              )
            )
          : null,
        ouvert
          ? h(
              "div.box",
              {},
              zoneDepot({ onDepose: choisir }),
              listeMedias({
                selectionnable: true,
                selectionne: courant,
                onSelect: choisir,
                hauteurMax: "40vh",
              }),
              h(
                "div.buttons.is-right.mt-2",
                {},
                bouton("Fermer", {
                  classe: "is-small",
                  onClick: () => {
                    ouvert = false;
                    rendre();
                  },
                })
              )
            )
          : bouton(courant ? "Changer de fichier" : "Choisir un fichier", {
              icone: "fa-image",
              classe: "is-small",
              onClick: () => {
                ouvert = true;
                rendre();
              },
            })
      )
    );
  }

  rendre();
  return racine;
}

/**
 * Liste des slides — la vue où se joue la refonte de la gestion actif/inactif.
 *
 * Trois usages de la même vue :
 *   /slides                 tous les slides
 *   /ecran/:id/slides       les slides d'un écran, dans l'ordre de passage
 *   /slides/corbeille       la corbeille
 */

import { h, bouton, icone, message, erreur, confirmer, modale, rendre } from "../dom.js";
import { lien, naviguer } from "../router.js";
import store, {
  ecranParId,
  ecransDuSlide,
  lienDe,
  slidesParEcran,
  setState,
  subscribe,
} from "../../core/store.js";
import { slides as apiSlides, liens as apiLiens, ecrans as apiEcrans } from "../../core/api.js";
import { computeSlideState, computeSlideStateGlobal, compterEtats } from "../../core/state.js";
import { pastilleEtat, compteursEtats } from "../components/etat.js";
import { describeSchedule } from "../../core/schedule.js";
import { nomDuType } from "../../core/slide-types.js";
import { formatDuree, depuisChampDateHeure } from "../../core/dates.js";
import { urlLecteur } from "../../core/media.js";
import { rechargerDonnees } from "../../admin-data.js";
import { COMMANDES } from "../../core/realtime.js";

export function vueSlides(params, conteneur) {
  const ecranId = params.id ? Number(params.id) : null;
  const corbeille = location.pathname.endsWith("/corbeille");

  const etat = {
    filtreEtat: null,
    recherche: "",
    tri: ecranId ? "ordre" : "modification",
    selection: new Set(),
  };

  const racine = h("div");
  conteneur.append(racine);

  // Le store notifie aussi le passage de l'horloge : les états se recalculent
  // tout seuls, sans action de l'utilisateur.
  const desabonner = subscribe(() => dessiner());
  dessiner();
  return desabonner;

  /* ---------------------------------------------------------------------- */

  function dessiner() {
    const ecran = ecranId ? ecranParId(ecranId) : null;
    if (ecranId && !ecran) {
      rendre(racine, h("p.notification.is-warning", {}, "Écran introuvable."));
      return;
    }

    const index = slidesParEcran();
    const maintenant = store.maintenant;

    // 1. Périmètre
    let slides = store.slides.filter((s) => !!s.trash === corbeille);
    if (ecranId) {
      const ids = new Set(
        store.liens.filter((l) => l.ecran_id === ecranId).map((l) => l.slide_id)
      );
      slides = slides.filter((s) => ids.has(s.id));
    }

    // 2. État de chaque slide
    const avecEtat = slides.map((slide) => {
      const ecransDu = ecransDuSlide(slide.id);
      const etatSlide = ecranId
        ? computeSlideState(slide, {
            now: maintenant,
            ecrans: ecransDu,
            ecran,
            lien: lienDe(slide.id, ecranId),
            slidesDeLEcran: index[ecranId] || [],
          })
        : computeSlideStateGlobal(slide, {
            now: maintenant,
            ecrans: ecransDu,
            liens: store.liens,
            slidesParEcran: index,
          });
      return { slide, etat: etatSlide, ecrans: ecransDu };
    });

    const compteurs = compterEtats(avecEtat.map((x) => x.etat));

    // 3. Filtres
    let visibles = avecEtat;
    if (etat.filtreEtat) visibles = visibles.filter((x) => x.etat.etat === etat.filtreEtat);
    if (etat.recherche) {
      const q = etat.recherche.toLowerCase();
      visibles = visibles.filter((x) => x.slide.name?.toLowerCase().includes(q));
    }

    // 4. Tri
    if (etat.tri === "ordre" && ecran) {
      const ordre = ecran.slideSort || [];
      visibles = [...visibles].sort((a, b) => {
        const ia = ordre.indexOf(a.slide.id);
        const ib = ordre.indexOf(b.slide.id);
        return (ia === -1 ? 1e9 + a.slide.id : ia) - (ib === -1 ? 1e9 + b.slide.id : ib);
      });
    } else if (etat.tri === "nom") {
      visibles = [...visibles].sort((a, b) => (a.slide.name || "").localeCompare(b.slide.name || ""));
    } else if (etat.tri === "duree") {
      visibles = [...visibles].sort((a, b) => b.slide.duration - a.slide.duration);
    } else {
      visibles = [...visibles].sort(
        (a, b) => new Date(b.slide.updated_at || 0) - new Date(a.slide.updated_at || 0)
      );
    }

    const titre = corbeille
      ? "Corbeille des slides"
      : ecran
      ? `Slides de « ${ecran.name} »`
      : "Tous les slides";

    rendre(
      racine,
      h("h1.title.is-4", {}, titre, h("span.has-text-grey.ml-2", {}, `(${slides.length})`)),
      barreActions(ecran),
      compteursEtats(compteurs, etat.filtreEtat, (code) => {
        etat.filtreEtat = code;
        dessiner();
      }),
      barreFiltres(),
      etat.selection.size ? barreSelection(ecran) : null,
      visibles.length === 0
        ? h("p.notification.is-light.mt-4", {}, "Aucun slide ne correspond.")
        : h(
            "div.slides-liste.mt-3",
            {},
            visibles.map((x) => ligneSlide(x, ecran))
          )
    );
  }

  /* ---- Barres ----------------------------------------------------------- */

  function barreActions(ecran) {
    if (corbeille) {
      return h(
        "div.buttons.are-small.mb-2",
        {},
        lien("/slides", [icone("fa-arrow-left"), h("span", {}, "Retour aux slides")], {
          class: "button is-small",
        })
      );
    }

    return h(
      "div.buttons.are-small.mb-2",
      {},
      bouton("Créer un slide", {
        icone: "fa-plus",
        classe: "is-small is-success",
        onClick: () => creerSlide(ecran),
      }),
      ecran
        ? h(
            "a.button.is-small.is-link",
            { href: urlLecteur({ slug: ecran.slug }), target: "_blank", rel: "noreferrer" },
            icone("fa-tv"),
            h("span", {}, `Visionner « ${ecran.name} »`)
          )
        : null,
      ecran
        ? bouton("Recharger l'écran", {
            icone: "fa-sync",
            classe: "is-small",
            onClick: () => piloter(COMMANDES.recharger(ecran.id), "Rechargement demandé."),
          })
        : null,
      ecran
        ? bouton("Avancer", {
            icone: "fa-arrow-right",
            classe: "is-small",
            onClick: () => piloter(COMMANDES.avancer(ecran.id), "Slide suivant demandé."),
          })
        : null,
      ecran
        ? lien(`/ecran/${ecran.id}/frise`, [icone("fa-chart-gantt"), h("span", {}, "Frise de la journée")], {
            class: "button is-small",
          })
        : null,
      lien("/slides/corbeille", [icone("fa-trash"), h("span", {}, "Corbeille")], {
        class: "button is-small",
      })
    );
  }

  function barreFiltres() {
    return h(
      "div.field.is-grouped.filtres.mt-2",
      {},
      h(
        "p.control.has-icons-left.is-expanded",
        {},
        h("input.input.is-small", {
          type: "search",
          placeholder: "Rechercher un slide…",
          value: etat.recherche,
          onInput: (e) => {
            etat.recherche = e.target.value;
            dessiner();
          },
        }),
        h("span.icon.is-small.is-left", {}, h("i.fas.fa-magnifying-glass"))
      ),
      h(
        "p.control",
        {},
        h(
          "span.select.is-small",
          {},
          h(
            "select",
            {
              value: etat.tri,
              onChange: (e) => {
                etat.tri = e.target.value;
                dessiner();
              },
            },
            ecranId ? h("option", { value: "ordre" }, "Ordre de diffusion") : null,
            h("option", { value: "modification" }, "Modifié récemment"),
            h("option", { value: "nom" }, "Nom"),
            h("option", { value: "duree" }, "Durée")
          )
        )
      )
    );
  }

  function barreSelection(ecran) {
    const ids = [...etat.selection];
    return h(
      "div.notification.is-link.is-light.barre-selection",
      {},
      h("strong", {}, `${ids.length} slide(s) sélectionné(s)`),
      h(
        "div.buttons.are-small",
        {},
        corbeille
          ? bouton("Restaurer", {
              icone: "fa-recycle",
              classe: "is-small",
              onClick: () => lotCorbeille(ids, false),
            })
          : bouton("Activer", {
              icone: "fa-toggle-on",
              classe: "is-small is-success",
              onClick: () => lotActif(ids, true),
            }),
        corbeille
          ? bouton("Supprimer définitivement", {
              icone: "fa-xmark",
              classe: "is-small is-danger",
              onClick: () => supprimerDefinitivement(ids),
            })
          : bouton("Désactiver", {
              icone: "fa-toggle-off",
              classe: "is-small",
              onClick: () => lotActif(ids, false),
            }),
        !corbeille
          ? bouton("Définir une expiration", {
              icone: "fa-clock",
              classe: "is-small",
              onClick: () => demanderExpiration(ids),
            })
          : null,
        !corbeille && ecran
          ? bouton(`Retirer de « ${ecran.name} »`, {
              icone: "fa-link-slash",
              classe: "is-small",
              onClick: () => retirerDeLEcran(ids, ecran),
            })
          : null,
        !corbeille
          ? bouton("Rattacher à un écran…", {
              icone: "fa-tv",
              classe: "is-small",
              onClick: () => demanderRattachement(ids),
            })
          : null,
        !corbeille
          ? bouton("Mettre à la corbeille", {
              icone: "fa-trash",
              classe: "is-small is-danger is-light",
              onClick: () => lotCorbeille(ids, true),
            })
          : null,
        bouton("Tout désélectionner", {
          classe: "is-small is-white",
          onClick: () => {
            etat.selection.clear();
            dessiner();
          },
        })
      )
    );
  }

  /* ---- Ligne ------------------------------------------------------------ */

  function ligneSlide({ slide, etat: etatSlide, ecrans }, ecran) {
    const selectionne = etat.selection.has(slide.id);

    const ligne = h(
      "article.slide-ligne",
      {
        class: selectionne ? "est-selectionne" : "",
        dataset: { id: slide.id },
        draggable: !!(ecran && etat.tri === "ordre"),
      },

      h("label.checkbox.slide-case", {}, h("input", {
        type: "checkbox",
        checked: selectionne,
        onChange: (e) => {
          if (e.target.checked) etat.selection.add(slide.id);
          else etat.selection.delete(slide.id);
          dessiner();
        },
      })),

      ecran && etat.tri === "ordre"
        ? h("span.poignee", { title: "Glisser pour réordonner" }, icone("fa-grip-vertical"))
        : null,

      h(
        "div.slide-principal",
        {},
        h(
          "div.slide-titre",
          {},
          lien(`/slide/${slide.id}`, slide.name || "(sans nom)", { class: "slide-nom" }),
          h("span.tag.is-light.ml-2", {}, nomDuType(slide.type)),
          h("span.tag.is-light.ml-1", { title: "Durée d'affichage" }, formatDuree(slide.duration)),
          slide.display_times
            ? h(
                "span.ml-1",
                { title: describeSchedule(slide.display_times) },
                "⏱️"
              )
            : null
        ),
        h("div.slide-message.has-text-grey", {}, etatSlide.message)
      ),

      h(
        "div.slide-ecrans",
        {},
        ecrans.map((e) =>
          lien(`/ecran/${e.id}/slides`, e.name, { class: "tag is-primary is-light" })
        )
      ),

      h("div.slide-etat", {}, pastilleEtat(etatSlide, slide, { onAction: (a) => appliquerCorrection(a, slide) })),

      h(
        "div.slide-actions",
        {},
        !corbeille
          ? lien(`/slide/${slide.id}`, icone("fa-pen"), { class: "action", title: "Modifier" })
          : null,
        !corbeille
          ? h(
              "a.action",
              {
                href: urlLecteur({ slideId: slide.id }),
                target: "_blank",
                rel: "noreferrer",
                title: "Aperçu",
              },
              icone("fa-tv")
            )
          : null,
        !corbeille
          ? h(
              "a.action",
              { title: "Dupliquer", onClick: () => dupliquer(slide) },
              icone("fa-copy")
            )
          : null,
        corbeille
          ? h(
              "a.action",
              { title: "Restaurer", onClick: () => lotCorbeille([slide.id], false) },
              icone("fa-recycle")
            )
          : h(
              "a.action",
              { title: "Mettre à la corbeille", onClick: () => lotCorbeille([slide.id], true) },
              icone("fa-trash")
            )
      ),

      corbeille ? null : interrupteur(slide, ecran, ecrans)
    );

    if (ecran && etat.tri === "ordre") brancherGlisser(ligne, ecran);
    return ligne;
  }

  /**
   * Interrupteur avec intention.
   *
   * Sur la vue d'un écran et si la colonne le permet, il agit sur le LIEN
   * (portée : cet écran). Sinon il agit sur le slide, et l'avertissement de
   * portée est affiché avant de couper un slide diffusé sur plusieurs écrans.
   */
  function interrupteur(slide, ecran, ecransDu) {
    const parEcran = !!ecran && store.activeParEcran;
    const lienCourant = parEcran ? lienDe(slide.id, ecran.id) : null;
    const actif = parEcran ? lienCourant?.active !== false : slide.active !== false;

    const basculer = async () => {
      if (!parEcran && actif && ecransDu.length > 1) {
        return avertirPortee(slide, ecransDu);
      }
      await appliquerActif([slide.id], !actif, { ecran: parEcran ? ecran : null });
    };

    return h(
      "div.slide-interrupteur",
      {},
      h(
        "label.interrupteur",
        { class: actif ? "est-actif" : "", title: parEcran ? `Sur « ${ecran.name} » uniquement` : "Interrupteur général" },
        h("input", { type: "checkbox", checked: actif, onChange: basculer }),
        h("span", {}, actif ? "ON" : "OFF")
      ),
      h(
        "div.dropdown.is-right.is-hoverable.menu-intentions",
        {},
        h(
          "div.dropdown-trigger",
          {},
          h("button.button.is-small.is-white", { type: "button" }, icone("fa-caret-down"))
        ),
        h(
          "div.dropdown-menu",
          {},
          h(
            "div.dropdown-content",
            {},
            item("Diffuser jusqu'au…", () => demanderExpiration([slide.id])),
            item("Diffuser à partir du…", () => demanderPublication([slide.id])),
            h("hr.dropdown-divider"),
            item("Suspendre 1 heure", () => suspendre(slide, 3600e3)),
            item("Suspendre jusqu'à demain", () => suspendreJusquA(slide, 1)),
            item("Suspendre jusqu'à lundi", () => suspendreJusquALundi(slide)),
            h("hr.dropdown-divider"),
            item("Dupliquer", () => dupliquer(slide)),
            item("Mettre à la corbeille", () => lotCorbeille([slide.id], true))
          )
        )
      )
    );

    function item(libelle, onClick) {
      return h("a.dropdown-item", { onClick }, libelle);
    }
  }

  /* ---- Actions ---------------------------------------------------------- */

  async function appliquerActif(ids, actif, { ecran = null } = {}) {
    // Mémorise l'état précédent pour proposer une annulation.
    const avant = ids.map((id) => ({
      id,
      actif: ecran
        ? lienDe(id, ecran.id)?.active !== false
        : store.slides.find((s) => s.id === id)?.active !== false,
    }));

    try {
      if (ecran) await apiLiens.setActiveSurEcran(ids, ecran.id, actif);
      else await apiSlides.setActive(ids, actif);
      await rechargerDonnees();
      message(
        `${ids.length} slide(s) ${actif ? "activé(s)" : "désactivé(s)"}${
          ecran ? ` sur « ${ecran.name} »` : ""
        }.`,
        {
          action: {
            label: "Annuler",
            onClick: async () => {
              try {
                for (const groupe of [true, false]) {
                  const cibles = avant.filter((a) => a.actif === groupe).map((a) => a.id);
                  if (!cibles.length) continue;
                  if (ecran) await apiLiens.setActiveSurEcran(cibles, ecran.id, groupe);
                  else await apiSlides.setActive(cibles, groupe);
                }
                await rechargerDonnees();
                message("Annulé.");
              } catch (e) {
                erreur(e);
              }
            },
          },
        }
      );
      etat.selection.clear();
    } catch (e) {
      erreur(e);
    }
  }

  const lotActif = (ids, actif) => appliquerActif(ids, actif);

  function avertirPortee(slide, ecransDu) {
    modale(
      "Ce slide est diffusé sur plusieurs écrans",
      h(
        "div.content",
        {},
        h(
          "p",
          {},
          "« ",
          h("strong", {}, slide.name),
          ` » est diffusé sur ${ecransDu.length} écrans : `,
          h("strong", {}, ecransDu.map((e) => e.name).join(", ")),
          ". Le désactiver le coupe partout."
        ),
        store.activeParEcran
          ? h(
              "p.has-text-grey",
              {},
              "Pour ne le couper que sur un écran, utilisez l'interrupteur depuis la page de cet écran."
            )
          : h(
              "p.has-text-grey",
              {},
              "La coupure par écran n'est pas disponible sur cette base : l'interrupteur agit partout."
            )
      ),
      {
        boutons: [
          { label: "Annuler", classe: "is-light" },
          {
            label: "Couper partout",
            classe: "is-danger",
            onClick: () => appliquerActif([slide.id], false),
          },
        ],
      }
    );
  }

  async function lotCorbeille(ids, dansCorbeille) {
    try {
      await apiSlides.setTrash(ids, dansCorbeille);
      await rechargerDonnees();
      etat.selection.clear();
      message(
        dansCorbeille ? `${ids.length} slide(s) mis à la corbeille.` : `${ids.length} slide(s) restauré(s).`,
        {
          action: {
            label: "Annuler",
            onClick: async () => {
              await apiSlides.setTrash(ids, !dansCorbeille);
              await rechargerDonnees();
            },
          },
        }
      );
    } catch (e) {
      erreur(e);
    }
  }

  async function supprimerDefinitivement(ids) {
    if (!confirmer(`Supprimer définitivement ${ids.length} slide(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await apiSlides.remove(ids);
      await rechargerDonnees();
      etat.selection.clear();
      message(`${ids.length} slide(s) supprimé(s) définitivement.`, { ton: "warning" });
    } catch (e) {
      erreur(e);
    }
  }

  function demanderExpiration(ids) {
    const champ = h("input.input", { type: "datetime-local" });
    modale(
      `Date d'expiration pour ${ids.length} slide(s)`,
      h(
        "div",
        {},
        h("p.mb-3", {}, "Le slide ne sera plus diffusé après cette date."),
        champ
      ),
      {
        boutons: [
          { label: "Annuler", classe: "is-light" },
          {
            label: "Enregistrer",
            classe: "is-primary",
            onClick: async () => {
              try {
                await apiSlides.setExpiration(ids, depuisChampDateHeure(champ.value));
                await rechargerDonnees();
                etat.selection.clear();
                message("Date d'expiration enregistrée.");
              } catch (e) {
                erreur(e);
              }
            },
          },
        ],
      }
    );
  }

  function demanderPublication(ids) {
    const champ = h("input.input", { type: "datetime-local" });
    modale(
      `Date de publication pour ${ids.length} slide(s)`,
      h("div", {}, h("p.mb-3", {}, "Le slide ne sera pas diffusé avant cette date."), champ),
      {
        boutons: [
          { label: "Annuler", classe: "is-light" },
          {
            label: "Enregistrer",
            classe: "is-primary",
            onClick: async () => {
              try {
                for (const id of ids) {
                  const slide = store.slides.find((s) => s.id === id);
                  await apiSlides.save({ ...slide, publication: depuisChampDateHeure(champ.value) });
                }
                await rechargerDonnees();
                etat.selection.clear();
                message("Date de publication enregistrée.");
              } catch (e) {
                erreur(e);
              }
            },
          },
        ],
      }
    );
  }

  /** Suspension temporaire : publication repoussée, sans nouveau champ en base. */
  async function suspendre(slide, delaiMs) {
    const reprise = new Date(Date.now() + delaiMs);
    await appliquerReprise(slide, reprise);
  }

  async function suspendreJusquA(slide, joursPlusTard) {
    const reprise = new Date();
    reprise.setDate(reprise.getDate() + joursPlusTard);
    reprise.setHours(8, 0, 0, 0);
    await appliquerReprise(slide, reprise);
  }

  async function suspendreJusquALundi(slide) {
    const reprise = new Date();
    const joursJusquALundi = (8 - reprise.getDay()) % 7 || 7;
    reprise.setDate(reprise.getDate() + joursJusquALundi);
    reprise.setHours(8, 0, 0, 0);
    await appliquerReprise(slide, reprise);
  }

  async function appliquerReprise(slide, reprise) {
    const avant = slide.publication;
    try {
      await apiSlides.save({ ...slide, publication: reprise.toISOString(), active: true });
      await rechargerDonnees();
      message(`« ${slide.name} » suspendu — reprise le ${reprise.toLocaleString("fr-FR")}.`, {
        action: {
          label: "Annuler",
          onClick: async () => {
            await apiSlides.save({ ...slide, publication: avant });
            await rechargerDonnees();
          },
        },
      });
    } catch (e) {
      erreur(e);
    }
  }

  async function dupliquer(slide) {
    try {
      const copie = await apiSlides.duplicate(slide.id);
      const ecransDu = ecransDuSlide(slide.id);
      if (ecransDu.length) {
        await apiLiens.setEcransDuSlide(copie.id, ecransDu.map((e) => e.id));
      }
      await rechargerDonnees();
      message("Slide dupliqué (désactivé par défaut).");
      naviguer(`/slide/${copie.id}`);
    } catch (e) {
      erreur(e);
    }
  }

  async function retirerDeLEcran(ids, ecran) {
    try {
      await apiLiens.retirer(ids, ecran.id);
      await rechargerDonnees();
      etat.selection.clear();
      message(`${ids.length} slide(s) retiré(s) de « ${ecran.name} ».`, {
        action: {
          label: "Annuler",
          onClick: async () => {
            await apiLiens.ajouter(ids, ecran.id);
            await rechargerDonnees();
          },
        },
      });
    } catch (e) {
      erreur(e);
    }
  }

  function demanderRattachement(ids) {
    const select = h(
      "div.select.is-multiple.is-fullwidth",
      {},
      h(
        "select",
        { multiple: true, size: Math.min(8, store.ecrans.length) },
        store.ecrans.map((e) => h("option", { value: String(e.id) }, e.name))
      )
    );
    modale(`Rattacher ${ids.length} slide(s) à…`, select, {
      boutons: [
        { label: "Annuler", classe: "is-light" },
        {
          label: "Rattacher",
          classe: "is-primary",
          onClick: async () => {
            const choisis = [...select.querySelectorAll("option:checked")].map((o) => Number(o.value));
            try {
              for (const ecranCible of choisis) await apiLiens.ajouter(ids, ecranCible);
              await rechargerDonnees();
              etat.selection.clear();
              message("Rattachement effectué.");
            } catch (e) {
              erreur(e);
            }
          },
        },
      ],
    });
  }

  function appliquerCorrection(action, slide) {
    switch (action.action) {
      case "activer":
        return appliquerActif([slide.id], true);
      case "activer-ecran":
        return appliquerActif([slide.id], true, { ecran: ecranParId(ecranId) });
      case "restaurer":
        return lotCorbeille([slide.id], false);
      case "voir-slide":
        return naviguer(`/slide/${action.id}`);
      default:
        return naviguer(`/slide/${slide.id}`);
    }
  }

  async function creerSlide(ecran) {
    try {
      const nb = await apiSlides.compterSlidesVides();
      const slide = await apiSlides.create(`Nouveau slide vide (${nb + 1})`);
      if (ecran) await apiLiens.ajouter([slide.id], ecran.id);
      await rechargerDonnees();
      naviguer(`/slide/${slide.id}`);
    } catch (e) {
      erreur(e);
    }
  }

  function piloter(commande, texte) {
    if (window.liaison?.envoyer(commande)) message(texte);
    else message("Liaison temps réel indisponible.", { ton: "warning" });
  }

  /* ---- Glisser-déposer -------------------------------------------------- */

  function brancherGlisser(ligne, ecran) {
    ligne.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", ligne.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      ligne.classList.add("en-deplacement");
    });
    ligne.addEventListener("dragend", () => ligne.classList.remove("en-deplacement"));
    ligne.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      ligne.classList.add("survole");
    });
    ligne.addEventListener("dragleave", () => ligne.classList.remove("survole"));
    ligne.addEventListener("drop", async (e) => {
      e.preventDefault();
      ligne.classList.remove("survole");
      const source = Number(e.dataTransfer.getData("text/plain"));
      const cible = Number(ligne.dataset.id);
      if (!source || source === cible) return;
      await reordonner(ecran, source, cible);
    });
  }

  async function reordonner(ecran, sourceId, cibleId) {
    // On repart de l'ordre affiché, pour que le résultat soit celui que
    // l'utilisateur voit — et non celui d'une liste partiellement filtrée.
    const affiches = [...racine.querySelectorAll(".slide-ligne")].map((l) => Number(l.dataset.id));
    const ordre = affiches.filter((id) => id !== sourceId);
    const position = ordre.indexOf(cibleId);
    ordre.splice(position, 0, sourceId);

    // Les slides de l'écran non affichés (filtrés) gardent leur position relative.
    const tousLesIds = store.liens
      .filter((l) => l.ecran_id === ecran.id)
      .map((l) => l.slide_id);
    const complet = [...ordre, ...tousLesIds.filter((id) => !ordre.includes(id))];

    try {
      await apiEcrans.setOrder(ecran.id, complet);
      setState({
        ecrans: store.ecrans.map((e) => (e.id === ecran.id ? { ...e, slideSort: complet } : e)),
      });
      message("Ordre enregistré.");
    } catch (e) {
      erreur(e);
    }
  }
}


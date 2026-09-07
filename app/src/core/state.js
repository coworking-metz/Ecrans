/**
 * État de diffusion d'un slide — le cœur de la v2.
 *
 * En v1, six conditions indépendantes décidaient qu'un slide passait ou non, et
 * l'interface n'en exposait qu'une (la case « actif »). Un slide pouvait être
 * « ON » sans jamais s'afficher, sans aucun indice.
 *
 * Ce module ramène ces six conditions à UN état, calculé au même endroit pour
 * l'administration et pour le lecteur, accompagné de son explication et — c'est
 * le point important — du moment où la situation changera.
 */

import { isInTimeRange, hasPriority, isAlways, nextChange, parseSchedule } from "./schedule.js";
import { formatEcheance, formatDateHeure } from "./dates.js";

/**
 * Les états, dans leur ordre de priorité d'évaluation.
 * `ton` correspond aux couleurs Bulma.
 */
export const ETATS = {
  corbeille: { code: "corbeille", label: "Corbeille", ton: "dark", pastille: "⚫" },
  erreur: { code: "erreur", label: "Horaires illisibles", ton: "danger", pastille: "⛔" },
  desactive: { code: "desactive", label: "Désactivé", ton: "light", pastille: "⚪" },
  orphelin: { code: "orphelin", label: "Aucun écran", ton: "warning", pastille: "🟠" },
  expire: { code: "expire", label: "Expiré", ton: "danger", pastille: "🔴" },
  programme: { code: "programme", label: "Programmé", ton: "info", pastille: "🔵" },
  hors_plage: { code: "hors_plage", label: "Hors plage", ton: "warning", pastille: "🟡" },
  ecarte: { code: "ecarte", label: "Écarté", ton: "link", pastille: "🟣" },
  diffusion: { code: "diffusion", label: "En diffusion", ton: "success", pastille: "🟢" },
};

/** Ordre d'affichage des compteurs, du plus « vivant » au plus « inerte ». */
export const ORDRE_ETATS = [
  "diffusion",
  "programme",
  "hors_plage",
  "ecarte",
  "desactive",
  "orphelin",
  "expire",
  "erreur",
  "corbeille",
];

function toDate(valeur) {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Un slide prioritaire est-il en cours sur cet écran à cet instant ?
 * Renvoie le slide fautif, ou null.
 */
export function slidePrioritaireEnCours(slidesDeLEcran, now) {
  if (!Array.isArray(slidesDeLEcran)) return null;
  return (
    slidesDeLEcran.find((s) => {
      if (!s.active || s.trash) return false;
      if (!hasPriority(s.display_times)) return false;
      const pub = toDate(s.publication);
      const exp = toDate(s.expiration);
      if (pub && pub > now) return false;
      if (exp && exp < now) return false;
      return isInTimeRange(s.display_times, now);
    }) || null
  );
}

/**
 * Calcule l'état d'un slide.
 *
 * @param {object} slide
 * @param {object} ctx
 * @param {Date}   [ctx.now]
 * @param {Array}  [ctx.ecrans]          écrans auxquels le slide est rattaché
 * @param {object} [ctx.lien]            lien écran↔slide, si l'état est calculé pour UN écran
 * @param {Array}  [ctx.slidesDeLEcran]  les autres slides de cet écran (pour l'éviction)
 * @param {object} [ctx.ecran]           l'écran de référence, si connu
 * @returns {{etat, code, label, ton, pastille, message, jusqua, raisons}}
 */
export function computeSlideState(slide, ctx = {}) {
  const now = ctx.now || new Date();
  const ecrans = ctx.ecrans || [];
  const raisons = [];
  const fin = (cle, message, jusqua = null) => ({
    ...ETATS[cle],
    etat: cle,
    message,
    jusqua,
    raisons,
  });

  /* 1. Corbeille -------------------------------------------------------- */
  const dansCorbeille = !!slide.trash;
  raisons.push({
    ok: !dansCorbeille,
    label: "Pas dans la corbeille",
    detail: dansCorbeille ? "Ce slide est archivé." : "",
    correction: dansCorbeille ? { action: "restaurer", label: "Restaurer" } : null,
  });
  if (dansCorbeille) return fin("corbeille", "Dans la corbeille — restaurable à tout moment.");

  /* 2. Paramétrage horaire lisible -------------------------------------- */
  const horaires = parseSchedule(slide.display_times);
  if (horaires.erreur) {
    raisons.push({
      ok: false,
      label: "Horaires lisibles",
      detail: horaires.erreur,
      correction: { action: "horaires", label: "Corriger les horaires" },
    });
    return fin(
      "erreur",
      `Le paramétrage horaire est illisible (${horaires.erreur}). Le slide est diffusé en permanence en attendant.`
    );
  }

  /* 3. Interrupteurs ----------------------------------------------------- */
  const actifGlobal = slide.active !== false;
  const actifSurEcran = ctx.lien ? ctx.lien.active !== false : true;
  raisons.push({
    ok: actifGlobal,
    label: "Activé",
    detail: actifGlobal ? "" : "L'interrupteur général du slide est sur OFF.",
    correction: actifGlobal ? null : { action: "activer", label: "Activer" },
  });
  if (!actifGlobal) {
    const portee =
      ecrans.length > 1
        ? ` — il ne passe sur aucun des ${ecrans.length} écrans auxquels il est rattaché.`
        : " — il ne passe nulle part.";
    return fin("desactive", `Désactivé${portee}`);
  }
  if (ctx.lien) {
    raisons.push({
      ok: actifSurEcran,
      label: `Activé sur « ${ctx.ecran?.name ?? "cet écran"} »`,
      detail: actifSurEcran ? "" : "Coupé sur cet écran uniquement.",
      correction: actifSurEcran ? null : { action: "activer-ecran", label: "Réactiver ici" },
    });
    if (!actifSurEcran) {
      return fin(
        "desactive",
        `Coupé sur « ${ctx.ecran?.name ?? "cet écran"} » — il continue de passer sur les autres écrans.`
      );
    }
  }

  /* 4. Rattachement à un écran ------------------------------------------ */
  const rattache = ecrans.length > 0;
  raisons.push({
    ok: rattache,
    label: rattache
      ? `Rattaché à ${ecrans.length} écran${ecrans.length > 1 ? "s" : ""} : ${ecrans
          .map((e) => e.name)
          .join(", ")}`
      : "Rattaché à au moins un écran",
    detail: rattache ? "" : "Aucun écran sélectionné.",
    correction: rattache ? null : { action: "ecrans", label: "Choisir un écran" },
  });
  if (!rattache) {
    return fin("orphelin", "Aucun écran sélectionné : ce slide ne passe nulle part.");
  }

  /* 5. Fenêtre de publication ------------------------------------------- */
  const publication = toDate(slide.publication);
  const expiration = toDate(slide.expiration);

  const expire = expiration && expiration < now;
  raisons.push({
    ok: !expire,
    label: expiration ? `Expire le ${formatDateHeure(expiration)}` : "N'expire pas",
    detail: expire ? "La date d'expiration est dépassée." : "",
    correction: expire ? { action: "expiration", label: "Repousser l'expiration" } : null,
  });
  if (expire) return fin("expire", `Expiré le ${formatDateHeure(expiration)}.`, expiration);

  const pasEncore = publication && publication > now;
  raisons.push({
    ok: !pasEncore,
    label: publication ? `Publié depuis le ${formatDateHeure(publication)}` : "Publié",
    detail: pasEncore ? "La date de publication est dans le futur." : "",
    correction: pasEncore ? { action: "publication", label: "Publier maintenant" } : null,
  });
  if (pasEncore) {
    return fin(
      "programme",
      `Passera en diffusion ${formatEcheance(publication, now)}.`,
      publication
    );
  }

  /* 6. Plages horaires --------------------------------------------------- */
  const dansPlage = isInTimeRange(slide.display_times, now);
  const bascule = nextChange(slide.display_times, now);
  raisons.push({
    ok: dansPlage,
    label: horaires.vide ? "Diffusion permanente (aucune plage horaire)" : "Dans une plage horaire",
    detail: dansPlage
      ? ""
      : `Aucune plage ne couvre l'instant présent.${
          bascule ? ` Reprise ${formatEcheance(bascule, now)}.` : ""
        }`,
    correction: dansPlage ? null : { action: "horaires", label: "Voir les horaires" },
  });
  if (!dansPlage) {
    return fin(
      "hors_plage",
      bascule
        ? `Hors plage — reprendra ${formatEcheance(bascule, now)}.`
        : "Hors plage horaire — aucune reprise prévue dans les deux prochains mois.",
      bascule
    );
  }

  /* 7. Éviction par un slide prioritaire --------------------------------- */
  const prioritaire = slidePrioritaireEnCours(ctx.slidesDeLEcran, now);
  const survit = !prioritaire || prioritaire.id === slide.id || isAlways(slide.display_times);
  if (prioritaire) {
    raisons.push({
      ok: survit,
      label: "Aucun slide prioritaire ne l'écarte",
      detail: survit
        ? `« ${prioritaire.name} » est prioritaire, mais ce slide y résiste.`
        : `« ${prioritaire.name} » est prioritaire et écarte les slides non permanents.`,
      correction: survit ? null : { action: "voir-slide", id: prioritaire.id, label: "Voir ce slide" },
    });
  } else {
    raisons.push({ ok: true, label: "Aucun slide prioritaire en cours", detail: "" });
  }
  if (!survit) {
    const finEviction = nextChange(prioritaire.display_times, now);
    return fin(
      "ecarte",
      `Écarté par le slide prioritaire « ${prioritaire.name} »${
        finEviction ? `, jusqu'${formatEcheance(finEviction, now)}` : ""
      }.`,
      finEviction
    );
  }

  /* 8. En diffusion ------------------------------------------------------ */
  return fin(
    "diffusion",
    bascule ? `En diffusion — jusqu'${formatEcheance(bascule, now)}.` : "En diffusion.",
    bascule
  );
}

/**
 * État d'un slide vu depuis la liste globale (tous écrans confondus) :
 * on retient le plus favorable, et on conserve le détail par écran.
 *
 * @returns {{...etat, parEcran: Array<{ecran, etat}>}}
 */
export function computeSlideStateGlobal(slide, { now = new Date(), ecrans = [], liens = [], slidesParEcran = {} } = {}) {
  if (ecrans.length === 0) {
    return { ...computeSlideState(slide, { now, ecrans: [] }), parEcran: [] };
  }

  const parEcran = ecrans.map((ecran) => ({
    ecran,
    etat: computeSlideState(slide, {
      now,
      ecrans,
      ecran,
      lien: liens.find((l) => l.ecran_id === ecran.id && l.slide_id === slide.id) || null,
      slidesDeLEcran: slidesParEcran[ecran.id] || [],
    }),
  }));

  const rang = (code) => ORDRE_ETATS.indexOf(code);
  const meilleur = parEcran.reduce((a, b) => (rang(a.etat.etat) <= rang(b.etat.etat) ? a : b));

  return { ...meilleur.etat, parEcran };
}

/** Compte les slides par état, pour le bandeau de filtres. */
export function compterEtats(etats) {
  const compteurs = {};
  for (const code of ORDRE_ETATS) compteurs[code] = 0;
  for (const e of etats) compteurs[e.etat] = (compteurs[e.etat] || 0) + 1;
  return compteurs;
}

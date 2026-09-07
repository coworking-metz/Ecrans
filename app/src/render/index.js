/**
 * Rendu d'un slide.
 *
 * Une seule implémentation, utilisée par le lecteur ET par l'aperçu de
 * l'administration. `renderSlide` renvoie un élément accompagné de son cycle de
 * vie (`demarrer` / `arreter`), nécessaire aux vidéos.
 */

import { urlImage, urlMiniature, urlQrCode, urlVideo } from "../core/media.js";

function el(balise, classe, attributs = {}) {
  const noeud = document.createElement(balise);
  if (classe) noeud.className = classe;
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === undefined || valeur === null || valeur === false) continue;
    if (cle === "style") noeud.setAttribute("style", valeur);
    else if (cle in noeud) noeud[cle] = valeur;
    else noeud.setAttribute(cle, valeur);
  }
  return noeud;
}

/* -------------------------------------------------------------------------- */
/*  Composition                                                                */
/* -------------------------------------------------------------------------- */

function rendreComposition(slide, { largeurImage }) {
  const meta = slide.meta || {};
  const racine = el("div", "rendu rendu-default", {
    style: `background:${meta.backgroundColor || "#000000"}`,
  });

  if (meta.image) {
    racine.append(
      el("img", "rendu-fond", {
        src: urlImage(meta.image, { w: largeurImage, t: slide.updated_at }),
        alt: "",
        style: `object-fit:${meta.fit || "cover"};opacity:${
          meta.opacity === undefined ? 1 : meta.opacity
        }`,
      })
    );
  }

  const contenu = el("div", "rendu-contenu");

  if (meta.emojiPrincipal) {
    contenu.append(el("div", "rendu-figure rendu-emoji", { textContent: meta.emojiPrincipal }));
  } else if (meta.imagePrincipale) {
    const figure = el("div", "rendu-figure rendu-image-principale");
    figure.append(el("img", "", { src: urlImage(meta.imagePrincipale, { w: 500 }), alt: "" }));
    contenu.append(figure);
  }

  const texte = el("div", "rendu-texte", { style: `color:${meta.color || "#FFFFFF"}` });
  const section = el("section");
  section.append(el("h1", "", { textContent: meta.titre || "" }));
  const corps = el("div", "rendu-corps");
  // Le texte est du HTML produit par l'éditeur, saisi par un administrateur
  // identifié : on le rend tel quel, comme en v1.
  corps.innerHTML = (meta.texte || "").replaceAll("\n", "<br>");
  section.append(corps);
  texte.append(section);
  contenu.append(texte);

  racine.append(contenu);

  if (meta.url) {
    const qr = el("div", "rendu-qr");
    qr.append(el("img", "", { src: urlQrCode(meta.url), alt: "QR code" }));
    racine.append(qr);
  }

  return { element: racine };
}

/* -------------------------------------------------------------------------- */
/*  Image                                                                      */
/* -------------------------------------------------------------------------- */

function rendreImage(slide, { largeurImage }) {
  const meta = slide.meta || {};
  const racine = el("div", "rendu rendu-image", {
    style: `background:${meta.backgroundColor || "#000000"}`,
  });
  racine.append(
    el("img", "rendu-fond", {
      src: urlImage(meta.image, { w: largeurImage, t: slide.updated_at }),
      alt: slide.name || "",
      style: `object-fit:${meta.fit || "cover"};opacity:${
        meta.opacity === undefined ? 1 : meta.opacity
      }`,
    })
  );
  return { element: racine };
}

/* -------------------------------------------------------------------------- */
/*  Vidéo                                                                      */
/* -------------------------------------------------------------------------- */

function rendreVideo(slide) {
  const meta = slide.meta || {};
  const racine = el("div", "rendu rendu-video-hote");
  const video = el("video", "rendu-video", {
    preload: "auto",
    muted: true,
    playsInline: true,
    loop: false,
  });
  video.muted = true; // doit être posé en propriété pour autoriser la lecture auto
  video.append(el("source", "", { src: urlVideo(meta.video, "mp4"), type: "video/mp4" }));
  video.append(el("source", "", { src: urlVideo(meta.video, "webm"), type: "video/webm" }));
  racine.append(video);

  return {
    element: racine,
    demarrer() {
      video.currentTime = 0;
      video.volume = 0;
      const promesse = video.play();
      // Certains navigateurs refusent la lecture auto : on n'en fait pas une erreur.
      if (promesse?.catch) promesse.catch(() => {});
    },
    arreter() {
      video.pause();
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page web                                                                   */
/* -------------------------------------------------------------------------- */

function rendreUrl(slide) {
  const meta = slide.meta || {};
  const racine = el("div", "rendu rendu-url");
  racine.append(
    el("iframe", "rendu-iframe", {
      src: meta.url || "about:blank",
      frameborder: "0",
      loading: "eager",
      referrerpolicy: "no-referrer",
    })
  );
  return { element: racine };
}

/* -------------------------------------------------------------------------- */

const RENDUS = {
  default: rendreComposition,
  image: rendreImage,
  video: rendreVideo,
  url: rendreUrl,
};

/**
 * Fabrique le rendu d'un slide.
 *
 * @param {object} slide
 * @param {object} [options]
 * @param {number} [options.largeurImage=1600] largeur demandée au proxy d'images
 * @param {boolean} [options.progression=false] afficher la barre de progression
 * @returns {{element: HTMLElement, demarrer?: Function, arreter?: Function}}
 */
export function renderSlide(slide, options = {}) {
  const { largeurImage = 1600, progression = false } = options;
  const fabrique = RENDUS[slide?.type] || RENDUS.default;

  let rendu;
  try {
    rendu = fabrique(slide, { largeurImage });
  } catch (e) {
    // Un slide en erreur ne doit jamais figer un écran : on rend un cadre vide
    // et on laisse l'appelant décider (le lecteur l'écarte du cycle).
    console.error("[rendu] slide %s illisible", slide?.id, e);
    rendu = { element: el("div", "rendu"), erreur: e };
  }

  if (progression && slide?.duration) {
    const barre = el("div", "rendu-progression anime", {
      style: `animation-duration:${slide.duration}s`,
    });
    rendu.element.append(barre);
  }

  return rendu;
}

/** Écran d'attente affiché quand aucun slide n'est éligible. */
export function renderAttente(message = "Aucun contenu à diffuser pour le moment.") {
  const racine = el("div", "rendu");
  const attente = el("div", "rendu-attente");
  const heure = el("div", "heure");
  const majHeure = () => {
    heure.textContent = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  };
  majHeure();
  const minuteur = setInterval(majHeure, 10000);
  attente.append(heure, el("div", "message", { textContent: message }));
  racine.append(attente);
  return { element: racine, arreter: () => clearInterval(minuteur) };
}

export { urlMiniature };

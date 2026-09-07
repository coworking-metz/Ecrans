/**
 * Administration — point d'entrée.
 *
 * Séparé du lecteur : celui-ci ne charge ni Bulma, ni l'éditeur de texte, ni
 * aucune de ces vues.
 */

import "bulma/css/bulma.css";
import "./render/slide.css";
import "./styles/admin.css";

import config from "./core/config.js";
import store, { setState, demarrerHorloge } from "./core/store.js";
import { chargerDonnees } from "./admin-data.js";
import { creerLiaison } from "./core/realtime.js";
import { h, rendre, erreur } from "./ui/dom.js";
import { route, demarrerRouteur, lien } from "./ui/router.js";

import { vueEcrans } from "./ui/views/ecrans.js";
import { vueEcran } from "./ui/views/ecran.js";
import { vueSlides } from "./ui/views/slides.js";
import { vueSlide } from "./ui/views/slide.js";
import { vueMedias } from "./ui/views/medias.js";
import { vueFrise } from "./ui/views/frise.js";

const CLE_AUTH = "auth";

/* -------------------------------------------------------------------------- */
/*  Accès                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Code d'accès partagé, mémorisé sur l'appareil.
 *
 * Ce n'est pas un mécanisme de sécurité — il est vérifié côté navigateur — mais
 * un garde-fou contre les modifications accidentelles. La protection réelle des
 * données repose sur les règles d'accès du service de données.
 */
function estAutorise() {
  if (!config.password) return true;
  try {
    return localStorage.getItem(CLE_AUTH) === config.password;
  } catch {
    return false; // navigation privée, stockage bloqué
  }
}

function ecranDeConnexion(surSucces) {
  const saisie = h("input.input", {
    type: "password",
    placeholder: "Code d'accès",
    autofocus: true,
    onInput: (e) => {
      if (e.target.value !== config.password) return;
      try {
        localStorage.setItem(CLE_AUTH, e.target.value);
      } catch {
        /* stockage indisponible : l'accès vaudra pour cette session */
      }
      surSucces();
    },
  });

  return h(
    "div.connexion",
    {},
    h("img", { src: "/logo.svg", alt: "", width: 64, height: 64 }),
    h("h1.title.is-5.mt-4", {}, "Écrans"),
    h("div.field", {}, h("div.control", {}, saisie)),
    h("p.help", {}, "Entrez le code de la boîte à clés de la réserve.")
  );
}

/* -------------------------------------------------------------------------- */
/*  Ossature                                                                   */
/* -------------------------------------------------------------------------- */

function navigation() {
  return h(
    "nav.navbar.is-light",
    { role: "navigation" },
    h(
      "div.navbar-brand",
      {},
      lien("/", h("img", { src: "/logo.svg", alt: "", width: 28, height: 28 }), {
        class: "navbar-item",
      }),
      lien("/", "Écrans", { class: "navbar-item", "data-route": "/" }),
      lien("/slides", "Slides", { class: "navbar-item", "data-route": "/slides" }),
      lien("/medias", "Médias", { class: "navbar-item", "data-route": "/medias" })
    )
  );
}

/* -------------------------------------------------------------------------- */
/*  Pilotage à distance                                                        */
/* -------------------------------------------------------------------------- */

function brancherLiaison() {
  window.liaison = creerLiaison({
    onEtat: ({ etat }) => document.body.setAttribute("data-liaison", etat),
    onMessage: (message) => {
      // Les lecteurs signalent leur activité : on alimente l'indicateur
      // « en ligne » et le slide en cours de la liste des écrans.
      if (message.name === "pong" && message.id) {
        setState({
          lecteurs: {
            ...store.lecteurs,
            [message.id]: {
              vuA: Date.now(),
              slideCourant: message.slideCourant ?? null,
              nbEligibles: message.nbEligibles ?? null,
            },
          },
        });
      }
    },
  });

  // Interroge les lecteurs à intervalle régulier.
  setInterval(() => {
    for (const ecran of store.ecrans) window.liaison?.envoyer({ name: "ping", id: ecran.id });
  }, 45000);
}

/* -------------------------------------------------------------------------- */
/*  Démarrage                                                                  */
/* -------------------------------------------------------------------------- */

async function demarrer() {
  const app = document.getElementById("app");

  if (!estAutorise()) {
    rendre(app, ecranDeConnexion(() => demarrer()));
    return;
  }

  rendre(
    app,
    navigation(),
    h("div.container.is-fluid.mt-4", {}, h("div#vue", {}, h("progress.progress.is-small.is-primary")))
  );

  try {
    await chargerDonnees();
  } catch (e) {
    rendre(
      document.getElementById("vue"),
      h(
        "div.notification.is-danger",
        {},
        h("p", {}, h("strong", {}, "Chargement impossible.")),
        h("p", {}, e.message),
        h("p.mt-2", {}, "Vérifiez la configuration (clé d'accès aux données) et rechargez la page.")
      )
    );
    return;
  }

  route("/", vueEcrans, "Écrans");
  route("/ecran/:id", vueEcran, "Écran");
  route("/ecran/:id/slides", vueSlides, "Slides de l'écran");
  route("/ecran/:id/frise", vueFrise, "Frise");
  route("/slides", vueSlides, "Slides");
  route("/slides/corbeille", vueSlides, "Corbeille");
  route("/slide/:id", vueSlide, "Slide");
  route("/medias", vueMedias, "Médias");

  demarrerRouteur(document.getElementById("vue"));
  demarrerHorloge();
  brancherLiaison();
}

demarrer().catch(erreur);

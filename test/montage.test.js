/**
 * Test de montage.
 *
 * Ces tests-là existent pour une raison simple : le build peut réussir alors
 * que l'application ne monte pas. C'est arrivé en production — une erreur
 * `nextSibling` de null au premier rendu — parce que rien ne vérifiait qu'un
 * composant s'affiche réellement.
 *
 * Ils tournent sans navigateur (jsdom) et couvrent le montage initial de
 * l'administration et du lecteur, ainsi que les composants qui touchent aux
 * mécanismes délicats de Vue (fragments, Teleport, Transition).
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

// Aucun accès réseau pendant les tests.
vi.mock("@/core/api.js", () => ({
  ecrans: { list: vi.fn().mockResolvedValue([]), get: vi.fn(), create: vi.fn(), save: vi.fn(), remove: vi.fn(), setOrder: vi.fn() },
  slides: { list: vi.fn().mockResolvedValue([]), get: vi.fn(), create: vi.fn(), save: vi.fn(), setActive: vi.fn(), setTrash: vi.fn(), setExpiration: vi.fn(), remove: vi.fn(), duplicate: vi.fn(), compterSlidesVides: vi.fn() },
  liens: { list: vi.fn().mockResolvedValue([]), setEcransDuSlide: vi.fn(), ajouter: vi.fn(), retirer: vi.fn(), setActiveSurEcran: vi.fn() },
  medias: { list: vi.fn().mockResolvedValue([]), upload: vi.fn(), remove: vi.fn() },
  supporteActiveParEcran: vi.fn().mockResolvedValue(false),
  urlPublique: (c) => `https://exemple/${c}`,
  FORMATS_ACCEPTES: ["image/png"],
  FORMATS_MINIATURE: ["image/png"],
}));

// La liaison temps réel n'a pas à s'ouvrir.
vi.mock("@/core/realtime.js", () => ({
  creerLiaison: () => ({ envoyer: () => false, estConnectee: () => false, fermer: () => {} }),
  COMMANDES: {
    recharger: (id) => ({ name: "refresh-ecran", id }),
    avancer: (id) => ({ name: "avancer-ecran", id }),
    reculer: (id) => ({ name: "reculer-ecran", id }),
    afficherSlide: (id, slideId) => ({ name: "afficher-slide", id, slideId }),
    ping: (id) => ({ name: "ping", id }),
  },
}));

function routeurDeTest() {
  return createRouter({
    history: createWebHistory(),
    routes: [{ path: "/:chemin(.*)*", component: { template: "<div />" } }],
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("administration", () => {
  test("App se monte — code d'accès non saisi", async () => {
    localStorage.clear();
    const App = (await import("@/admin/App.vue")).default;
    const router = routeurDeTest();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
    });

    expect(wrapper.html()).toBeTruthy();
    wrapper.unmount();
  });

  /**
   * La branche authentifiée est celle que voit tout le monde en production —
   * et c'est elle qui plantait, faute d'être couverte.
   */
  test("App se monte — code d'accès déjà mémorisé", async () => {
    const config = (await import("@/core/config.js")).default;
    localStorage.setItem("auth", config.password);

    const App = (await import("@/admin/App.vue")).default;
    const router = routeurDeTest();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
      attachTo: document.body,
    });

    // Laisse le chargement échouer et l'affichage se mettre à jour.
    await new Promise((r) => setTimeout(r, 50));

    expect(wrapper.find("nav.navbar").exists(), "la navigation doit être rendue").toBe(true);
    wrapper.unmount();
  });
});

describe("lecteur", () => {
  test("Player se monte sans erreur", async () => {
    const Player = (await import("@/player/Player.vue")).default;
    const wrapper = mount(Player);
    expect(wrapper.html()).toBeTruthy();
    wrapper.unmount();
  });
});

describe("composants sensibles", () => {
  const slide = {
    id: 1,
    name: "Un slide",
    type: "default",
    duration: 10,
    active: true,
    trash: false,
    display_times: "",
    meta: { titre: "Bonjour", texte: "<p>Texte</p>", color: "#fff", backgroundColor: "#000" },
  };

  test("SlideRender rend chaque type", async () => {
    const SlideRender = (await import("@/components/slides/SlideRender.vue")).default;
    for (const type of ["default", "image", "video", "url"]) {
      const wrapper = mount(SlideRender, {
        props: { slide: { ...slide, type, meta: { ...slide.meta, video: "v.mp4", url: "https://x" } } },
      });
      expect(wrapper.find(".rendu-hote").exists()).toBe(true);
      wrapper.unmount();
    }
  });

  test("SlideRender affiche la barre de progression", async () => {
    const SlideRender = (await import("@/components/slides/SlideRender.vue")).default;
    const wrapper = mount(SlideRender, { props: { slide, progression: true } });
    expect(wrapper.find(".rendu-progression").exists()).toBe(true);
    wrapper.unmount();
  });

  // Teleport : c'est le mécanisme le plus susceptible de casser au montage.
  test("MessagesFlottants se monte et affiche les messages", async () => {
    const MessagesFlottants = (await import("@/components/ui/MessagesFlottants.vue")).default;
    const { message } = await import("@/composables/messages.js");

    const wrapper = mount(MessagesFlottants, { attachTo: document.body });
    message("Bonjour");
    await wrapper.vm.$nextTick();

    expect(document.body.textContent).toContain("Bonjour");
    wrapper.unmount();
  });

  test("ModaleBase se monte", async () => {
    const ModaleBase = (await import("@/components/ui/ModaleBase.vue")).default;
    const wrapper = mount(ModaleBase, {
      props: { titre: "Titre" },
      slots: { default: "Contenu" },
      attachTo: document.body,
    });
    expect(document.body.textContent).toContain("Titre");
    wrapper.unmount();
  });

  test("EditeurHoraires se monte et décrit le paramétrage", async () => {
    const EditeurHoraires = (await import("@/components/horaires/EditeurHoraires.vue")).default;
    const wrapper = mount(EditeurHoraires, {
      props: {
        modelValue: JSON.stringify([{ days: ["monday"], start: "09:00", end: "12:00" }]),
      },
    });
    expect(wrapper.text()).toContain("lundi");
    wrapper.unmount();
  });
});

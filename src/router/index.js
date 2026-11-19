import { createRouter, createWebHistory } from "vue-router";

/**
 * Les vues sont chargées à la demande : ouvrir la liste des écrans ne charge
 * ni l'éditeur de texte enrichi, ni la frise.
 */
const routes = [
  {
    path: "/",
    name: "ecrans",
    component: () => import("@/views/EcransView.vue"),
    meta: { titre: "Écrans" },
  },
  {
    path: "/ecran/:id",
    name: "ecran",
    component: () => import("@/views/EcranView.vue"),
    meta: { titre: "Écran" },
  },
  {
    path: "/ecran/:id/slides",
    name: "ecran-slides",
    component: () => import("@/views/SlidesView.vue"),
    meta: { titre: "Slides de l'écran" },
  },
  {
    path: "/ecran/:id/frise",
    name: "frise",
    component: () => import("@/views/FriseView.vue"),
    meta: { titre: "Frise" },
  },
  {
    path: "/slides",
    name: "slides",
    component: () => import("@/views/SlidesView.vue"),
    meta: { titre: "Slides" },
  },
  {
    path: "/slides/corbeille",
    name: "slides-corbeille",
    component: () => import("@/views/SlidesView.vue"),
    meta: { titre: "Corbeille", corbeille: true },
  },
  {
    path: "/slide/:id",
    name: "slide",
    component: () => import("@/views/SlideView.vue"),
    meta: { titre: "Slide" },
  },
  {
    path: "/medias",
    name: "medias",
    component: () => import("@/views/MediasView.vue"),
    meta: { titre: "Médias" },
  },
  {
    path: "/:chemin(.*)*",
    name: "introuvable",
    component: () => import("@/views/IntrouvableView.vue"),
    meta: { titre: "Page introuvable" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  linkActiveClass: "is-active",
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = to.meta.titre ? `${to.meta.titre} — Écrans` : "Écrans";
});

export default router;

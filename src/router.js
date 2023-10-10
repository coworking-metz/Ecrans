import { createRouter, createWebHistory } from "vue-router";
import Ecrans from "@/views/Ecrans.vue";

const router = createRouter({
  linkActiveClass: "is-active",
  history: createWebHistory(),
  routes: [
    {
      meta: { title: "Écrans" },
      path: "/",
      component: Ecrans,
    },
    {
      name: "ecran",
      path: "/ecran/:id",
      component: () => import("@/views/Ecran.vue"),
    },
    {
      name: "ecran-slides",
      path: "/ecran/:id/slides",
      component: () => import("@/views/Slides.vue"),
    },
    {
      name: "visionner-ecran",
      path: "/visionner/:slug",
      component: () => import("@/views/VisionnerEcran.vue"),
    },
    {
      name: "visionner-slide",
      path: "/visionner/slide/:id",
      component: () => import("@/views/VisionnerSlide.vue"),
    },
    {
      meta: { title: "Slides" },
      name: "slides",
      path: "/slides",
      component: () => import("@/views/Slides.vue"),
    },
    {
      meta: { title: "Corbeille - Slides" },
      name: "slides-trash",
      path: "/slides/trash",
      component: () => import("@/views/Slides.vue"),
    },
    {
      meta: { title: "Medias" },
      name: "medias",
      path: "/medias",
      component: () => import("@/views/Medias.vue"),
    },
    {
      name: "slide",
      path: "/slide/:id",
      component: () => import("@/views/Slide.vue"),
    },
    // {
    //   path: "/contact",
    //   component: () => import("@/views/Contact.vue"),
    // },
  ],
});

// After creating the Vue Router instance
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  next();
});

export default router;

import { createRouter, createWebHistory } from "vue-router";
import Ecrans from "@/views/Ecrans.vue";

const router = createRouter({
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
      name: "slides",
      path: "/slides",
      component: () => import("@/views/Slides.vue"),
    },
    {
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

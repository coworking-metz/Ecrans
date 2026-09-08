/** Point d'entrée de l'administration. */

import { createApp } from "vue";
import { createPinia } from "pinia";

import "bulma/css/bulma.css";
import "@/styles/slide.css";
import "@/styles/admin.css";

import router from "@/router/index.js";
import App from "./App.vue";

createApp(App).use(createPinia()).use(router).mount("#app");

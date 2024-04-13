import { createApp } from "vue";
import mitt from "mitt";
import "bulma/css/bulma.css";
import "./style.css";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import { ws } from '@/websocket'

const bus = mitt();
const pinia = createPinia();
const app = createApp(App);
window.bus = bus;
window.ws = ws;
ws.connect();


app.use(pinia);
app.use(router);
app.mount("#app");

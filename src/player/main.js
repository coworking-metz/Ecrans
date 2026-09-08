/**
 * Point d'entrée du lecteur.
 *
 * Volontairement séparé de l'administration : cette page ne charge ni Bulma,
 * ni l'éditeur de texte, ni le routeur, ni les vues d'administration. Elle
 * tourne des semaines sans surveillance sur du matériel modeste.
 */

import { createApp } from "vue";
import "@/styles/slide.css";
import "@/styles/player.css";
import Player from "./Player.vue";

createApp(Player).mount("#lecteur");

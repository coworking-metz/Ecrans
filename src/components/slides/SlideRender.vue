<script setup>
/**
 * Rendu d'un slide — UNE seule définition, utilisée par le lecteur et par
 * l'aperçu de l'administration.
 *
 * Règle d'or : toute divergence entre l'aperçu et la diffusion réelle est un
 * défaut. C'est pourquoi ce composant est partagé plutôt que dupliqué.
 */
import { computed, onErrorCaptured } from "vue";
import SlideDefault from "./SlideDefault.vue";
import SlideImage from "./SlideImage.vue";
import SlideVideo from "./SlideVideo.vue";
import SlideUrl from "./SlideUrl.vue";

const props = defineProps({
  slide: { type: Object, required: true },
  largeurImage: { type: Number, default: 1600 },
  /** Barre de progression du temps restant (lecteur uniquement). */
  progression: { type: Boolean, default: false },
});

const emit = defineEmits(["erreur"]);

const RENDUS = {
  default: SlideDefault,
  image: SlideImage,
  video: SlideVideo,
  url: SlideUrl,
};

const composant = computed(() => RENDUS[props.slide?.type] || SlideDefault);

// Un slide en erreur ne doit jamais figer un écran : on le signale, et le
// lecteur l'écarte du cycle.
onErrorCaptured((e) => {
  console.error("[rendu] slide %s illisible", props.slide?.id, e);
  emit("erreur", { slide: props.slide, erreur: e });
  return false;
});
</script>

<template>
  <!--
    Racine unique : <Transition> n'accepte qu'un seul élément, et la barre de
    progression doit accompagner le slide pendant le fondu.
  -->
  <div class="rendu-hote">
    <component :is="composant" :slide="slide" :largeur-image="largeurImage" />
    <div
      v-if="progression && slide.duration"
      class="rendu-progression anime"
      :style="{ animationDuration: `${slide.duration}s` }"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { urlMiniature, urlImage, raccourcirNom } from "@/core/media.js";
import { formatDateHeure } from "@/core/dates.js";

const props = defineProps({
  media: { type: Object, required: true },
  selectionnable: { type: Boolean, default: false },
  selectionne: { type: Boolean, default: false },
  avecSuppression: { type: Boolean, default: false },
});

const emit = defineEmits(["choisir", "supprimer"]);

const replie = ref(false);

// Pas de miniature (SVG, vidéo) : on retombe sur le fichier d'origine.
const vignette = computed(() =>
  replie.value ? props.media.url : urlMiniature(props.media.url) || urlImage(props.media.url, { w: 128 })
);

const nomCourt = computed(() => raccourcirNom(props.media.nom));
const dateModif = computed(() => formatDateHeure(props.media.modifieLe));
</script>

<template>
  <article
    class="media media-ligne"
    :class="{ 'est-selectionnable': selectionnable, 'est-selectionne': selectionne }"
    @click="selectionnable && emit('choisir', media)"
  >
    <figure class="media-left">
      <p class="image apercu-media">
        <img :src="vignette" :alt="media.nom" loading="lazy" @error="replie = true" />
      </p>
    </figure>

    <div class="media-content">
      <p class="mb-1">
        <strong :title="media.nom">{{ nomCourt }}</strong>
        <small class="has-text-grey ml-2">{{ dateModif }}</small>
      </p>

      <nav v-if="avecSuppression" class="level is-mobile mb-0">
        <div class="level-left">
          <a class="level-item" :href="media.url" target="_blank" rel="noreferrer" title="Ouvrir">
            <span class="icon is-small"><i class="fas fa-eye"></i></span>
          </a>
          <a class="level-item" title="Supprimer" @click.stop.prevent="emit('supprimer', media)">
            <span class="icon is-small"><i class="fas fa-trash"></i></span>
          </a>
        </div>
      </nav>
    </div>
  </article>
</template>

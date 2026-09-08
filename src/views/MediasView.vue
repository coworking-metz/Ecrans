<script setup>
import { useMediasStore } from "@/stores/medias.js";
import ZoneDepot from "@/components/medias/ZoneDepot.vue";
import ListeMedias from "@/components/medias/ListeMedias.vue";

const medias = useMediasStore();
</script>

<template>
  <h1 class="title is-4">
    Médias
    <span class="has-text-grey ml-2">({{ medias.medias.length }})</span>
  </h1>

  <p class="help mb-3">
    Images (JPEG, PNG, GIF, WebP, AVIF, SVG) et vidéos MP4. Une miniature est générée
    automatiquement pour les images.
  </p>

  <ZoneDepot />

  <div class="mt-4">
    <ListeMedias avec-suppression />
  </div>
</template>

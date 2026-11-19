<script setup>
import { computed } from "vue";
import { urlImage } from "@/core/media.js";

const props = defineProps({
  slide: { type: Object, required: true },
  largeurImage: { type: Number, default: 1600 },
});

const meta = computed(() => props.slide.meta || {});
const source = computed(() =>
  meta.value.image ? urlImage(meta.value.image, { w: props.largeurImage, t: props.slide.updated_at }) : ""
);
</script>

<template>
  <div class="rendu rendu-image" :style="{ background: meta.backgroundColor || '#000000' }">
    <img
      v-if="source"
      class="rendu-fond"
      :src="source"
      :alt="slide.name || ''"
      :style="{ objectFit: meta.fit || 'cover', opacity: meta.opacity ?? 1 }"
    />
  </div>
</template>

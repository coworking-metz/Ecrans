<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { urlVideo } from "@/core/media.js";

const props = defineProps({
  slide: { type: Object, required: true },
});

const element = ref(null);
const meta = computed(() => props.slide.meta || {});
const mp4 = computed(() => urlVideo(meta.value.video, "mp4"));
const webm = computed(() => urlVideo(meta.value.video, "webm"));

onMounted(() => {
  const video = element.value;
  if (!video) return;
  video.currentTime = 0;
  video.volume = 0;
  // Certains navigateurs refusent la lecture automatique : ce n'est pas une
  // erreur, le slide reste affiché sur sa première image.
  video.play?.().catch(() => {});
});

onBeforeUnmount(() => element.value?.pause());
</script>

<template>
  <div class="rendu rendu-video-hote">
    <video ref="element" class="rendu-video" preload="auto" muted playsinline>
      <source :src="mp4" type="video/mp4" />
      <source :src="webm" type="video/webm" />
    </video>
  </div>
</template>

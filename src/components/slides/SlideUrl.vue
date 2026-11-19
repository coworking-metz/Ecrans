<script setup>
import { computed } from "vue";

const props = defineProps({
  slide: { type: Object, required: true },
});

const source = computed(() => props.slide.meta?.url || "about:blank");
</script>

<template>
  <div class="rendu rendu-url">
    <iframe
      class="rendu-iframe"
      :src="source"
      frameborder="0"
      loading="eager"
      referrerpolicy="no-referrer"
    ></iframe>
  </div>
</template>

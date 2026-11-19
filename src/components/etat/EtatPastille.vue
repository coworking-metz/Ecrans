<script setup>
import { ref } from "vue";
import PourquoiModale from "./PourquoiModale.vue";

defineProps({
  etat: { type: Object, required: true },
  slide: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(["corriger"]);
const ouvert = ref(false);
</script>

<template>
  <button
    type="button"
    class="tag etat-pastille"
    :class="[`is-${etat.ton}`, { 'is-small': compact }]"
    :title="etat.message"
    @click.stop.prevent="ouvert = true"
  >
    <span class="etat-point">{{ etat.pastille }}</span>
    <span>{{ etat.label }}</span>
  </button>

  <PourquoiModale
    v-if="ouvert"
    :etat="etat"
    :slide="slide"
    @fermer="ouvert = false"
    @corriger="emit('corriger', $event)"
  />
</template>

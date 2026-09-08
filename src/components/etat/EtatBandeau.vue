<script setup>
import { ref } from "vue";
import PourquoiModale from "./PourquoiModale.vue";

defineProps({
  etat: { type: Object, required: true },
  slide: { type: Object, required: true },
});

const emit = defineEmits(["corriger"]);
const ouvert = ref(false);
</script>

<template>
  <div class="notification is-light etat-bandeau" :class="`is-${etat.ton}`">
    <div>
      <strong>{{ etat.pastille }} {{ etat.label }}</strong>
      <p class="mb-0">{{ etat.message }}</p>
    </div>
    <button class="button is-small" type="button" @click="ouvert = true">
      <span class="icon is-small"><i class="fas fa-circle-question"></i></span>
      <span>Pourquoi ?</span>
    </button>
  </div>

  <PourquoiModale
    v-if="ouvert"
    :etat="etat"
    :slide="slide"
    @fermer="ouvert = false"
    @corriger="emit('corriger', $event)"
  />
</template>

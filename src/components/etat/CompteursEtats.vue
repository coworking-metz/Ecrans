<script setup>
/** Compteurs d'états, qui servent aussi de filtres. */
import { computed } from "vue";
import { ETATS, ORDRE_ETATS } from "@/core/state.js";

const props = defineProps({
  compteurs: { type: Object, required: true },
  actif: { type: String, default: null },
});

const emit = defineEmits(["filtrer"]);

const total = computed(() => Object.values(props.compteurs).reduce((a, b) => a + b, 0));

const puces = computed(() =>
  ORDRE_ETATS.filter((code) => props.compteurs[code] > 0).map((code) => ({
    code,
    nb: props.compteurs[code],
    ...ETATS[code],
  }))
);

function basculer(code) {
  emit("filtrer", props.actif === code ? null : code);
}
</script>

<template>
  <div class="compteurs">
    <button
      type="button"
      class="button is-small compteur"
      :class="{ 'is-selected': !actif }"
      @click="emit('filtrer', null)"
    >
      <strong>{{ total }}</strong>
      <span class="compteur-label">au total</span>
    </button>

    <button
      v-for="puce in puces"
      :key="puce.code"
      type="button"
      class="button is-small compteur"
      :class="{ 'is-selected': actif === puce.code }"
      :title="puce.label"
      @click="basculer(puce.code)"
    >
      <span class="compteur-point">{{ puce.pastille }}</span>
      <strong>{{ puce.nb }}</strong>
      <span class="compteur-label">{{ puce.label }}</span>
    </button>
  </div>
</template>

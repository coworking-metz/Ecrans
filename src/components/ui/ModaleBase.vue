<script setup>
import { onBeforeUnmount, onMounted } from "vue";

defineProps({
  titre: { type: String, required: true },
  large: { type: Boolean, default: false },
});

const emit = defineEmits(["fermer"]);

function auClavier(e) {
  if (e.key === "Escape") emit("fermer");
}

onMounted(() => document.addEventListener("keydown", auClavier));
onBeforeUnmount(() => document.removeEventListener("keydown", auClavier));
</script>

<template>
  <Teleport to="body">
    <div class="modal is-active">
      <div class="modal-background" @click="emit('fermer')"></div>
      <div class="modal-card" :style="large ? { maxWidth: '70rem', width: '90vw' } : {}">
        <header class="modal-card-head">
          <p class="modal-card-title">{{ titre }}</p>
          <button class="delete" type="button" aria-label="fermer" @click="emit('fermer')"></button>
        </header>
        <section class="modal-card-body">
          <slot />
        </section>
        <footer v-if="$slots.pied" class="modal-card-foot">
          <slot name="pied" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

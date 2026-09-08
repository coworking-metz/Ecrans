<script setup>
/** Écran d'attente : affiché quand aucun slide n'est éligible. */
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps({
  message: { type: String, default: "Aucun contenu à diffuser pour le moment." },
});

const heure = ref("");
let minuteur = null;

function majHeure() {
  heure.value = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

onMounted(() => {
  majHeure();
  minuteur = setInterval(majHeure, 10000);
});

onBeforeUnmount(() => clearInterval(minuteur));
</script>

<template>
  <div class="rendu">
    <div class="rendu-attente">
      <div class="heure">{{ heure }}</div>
      <div class="message">{{ message }}</div>
    </div>
  </div>
</template>

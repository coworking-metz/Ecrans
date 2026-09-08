<script setup>
import { ref } from "vue";
import { useMediasStore } from "@/stores/medias.js";
import { FORMATS_ACCEPTES } from "@/core/api.js";
import { message, erreur } from "@/composables/messages.js";

const emit = defineEmits(["depose"]);

const medias = useMediasStore();
const survol = ref(false);
const champ = ref(null);

async function envoyer(fichiers) {
  if (!fichiers.length) return;

  const { deposes, refuses, erreurs } = await medias.deposer(fichiers);

  if (refuses.length) {
    message(`Format non autorisé pour : ${refuses.join(", ")}.`, {
      ton: "warning",
      duree: 10000,
    });
  }
  for (const e of erreurs) erreur(e);

  if (deposes.length) {
    message(`${deposes.length} fichier(s) ajouté(s).`);
    const dernier = medias.medias.find((m) => m.nom === deposes.at(-1));
    if (dernier) emit("depose", dernier);
  }

  if (champ.value) champ.value.value = "";
}

function surDepot(e) {
  survol.value = false;
  envoyer([...e.dataTransfer.files]);
}
</script>

<template>
  <div
    class="file depot"
    :class="{ survol }"
    @dragover.prevent="survol = true"
    @dragleave="survol = false"
    @drop.prevent="surDepot"
  >
    <label class="file-label" :class="{ 'is-loading': medias.envoiEnCours }">
      <input
        ref="champ"
        class="file-input"
        type="file"
        multiple
        :accept="FORMATS_ACCEPTES.join(',')"
        @change="envoyer([...$event.target.files])"
      />
      <span class="file-cta">
        <span class="file-icon"><i class="fas fa-upload"></i></span>
        <span class="file-label">Ajouter des fichiers</span>
      </span>
    </label>
  </div>
</template>

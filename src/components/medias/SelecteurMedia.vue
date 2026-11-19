<script setup>
/** Sélecteur repliable, réutilisable dans tous les formulaires. */
import { computed, ref } from "vue";
import ZoneDepot from "./ZoneDepot.vue";
import ListeMedias from "./ListeMedias.vue";
import { urlMiniature, urlImage } from "@/core/media.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  libelle: { type: String, default: "Média" },
});

const emit = defineEmits(["update:modelValue"]);

const ouvert = ref(false);
const replie = ref(false);

const apercu = computed(() =>
  replie.value
    ? props.modelValue
    : urlMiniature(props.modelValue) || urlImage(props.modelValue, { w: 300 })
);

function choisir(media) {
  replie.value = false;
  emit("update:modelValue", media.url);
  ouvert.value = false;
}

function retirer() {
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="selecteur-media">
    <div class="field">
      <label class="label">{{ libelle }}</label>

      <div v-if="modelValue" class="apercu-selection">
        <img :src="apercu" alt="" @error="replie = true" />
        <button class="button is-small is-light" type="button" @click="retirer">Retirer</button>
      </div>

      <div v-if="ouvert" class="box">
        <ZoneDepot @depose="choisir" />
        <ListeMedias
          selectionnable
          :selectionne="modelValue"
          hauteur-max="40vh"
          @choisir="choisir"
        />
        <div class="buttons is-right mt-2">
          <button class="button is-small" type="button" @click="ouvert = false">Fermer</button>
        </div>
      </div>

      <button v-else class="button is-small" type="button" @click="ouvert = true">
        <span class="icon is-small"><i class="fas fa-image"></i></span>
        <span>{{ modelValue ? "Changer de fichier" : "Choisir un fichier" }}</span>
      </button>
    </div>
  </div>
</template>

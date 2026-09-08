<script setup>
/**
 * Interrupteur avec intention.
 *
 * Sur la page d'un écran (et si la colonne le permet), il agit sur le LIEN —
 * portée : cet écran. Sinon il agit sur le slide, et couper un slide diffusé
 * sur plusieurs écrans demande une confirmation explicite de la portée.
 */
import { computed, ref } from "vue";
import ModaleBase from "@/components/ui/ModaleBase.vue";
import { useDonneesStore } from "@/stores/donnees.js";

const props = defineProps({
  slide: { type: Object, required: true },
  /** Écran de référence, ou null pour l'interrupteur général. */
  ecran: { type: Object, default: null },
  ecransDuSlide: { type: Array, default: () => [] },
});

const emit = defineEmits(["basculer", "intention"]);

const donnees = useDonneesStore();
const avertissement = ref(false);

/** L'interrupteur agit-il sur cet écran seulement ? */
const parEcran = computed(() => !!props.ecran && donnees.activeParEcran);

const actif = computed(() => {
  if (parEcran.value) {
    return donnees.lienDe(props.slide.id, props.ecran.id)?.active !== false;
  }
  return props.slide.active !== false;
});

const infobulle = computed(() =>
  parEcran.value ? `Sur « ${props.ecran.name} » uniquement` : "Interrupteur général"
);

function basculer() {
  // Couper un slide diffusé partout mérite une confirmation.
  if (!parEcran.value && actif.value && props.ecransDuSlide.length > 1) {
    avertissement.value = true;
    return;
  }
  emit("basculer", { actif: !actif.value, ecran: parEcran.value ? props.ecran : null });
}

function couperPartout() {
  avertissement.value = false;
  emit("basculer", { actif: false, ecran: null });
}
</script>

<template>
  <div class="slide-interrupteur">
    <label class="interrupteur" :class="{ 'est-actif': actif }" :title="infobulle">
      <input type="checkbox" :checked="actif" @change="basculer" />
      <span>{{ actif ? "ON" : "OFF" }}</span>
    </label>

    <div class="dropdown is-right is-hoverable menu-intentions">
      <div class="dropdown-trigger">
        <button class="button is-small is-white" type="button">
          <span class="icon is-small"><i class="fas fa-caret-down"></i></span>
        </button>
      </div>
      <div class="dropdown-menu">
        <div class="dropdown-content">
          <a class="dropdown-item" @click="emit('intention', 'expiration')">
            Diffuser jusqu'au…
          </a>
          <a class="dropdown-item" @click="emit('intention', 'publication')">
            Diffuser à partir du…
          </a>
          <hr class="dropdown-divider" />
          <a class="dropdown-item" @click="emit('intention', 'suspendre-1h')">Suspendre 1 heure</a>
          <a class="dropdown-item" @click="emit('intention', 'suspendre-demain')">
            Suspendre jusqu'à demain
          </a>
          <a class="dropdown-item" @click="emit('intention', 'suspendre-lundi')">
            Suspendre jusqu'à lundi
          </a>
          <hr class="dropdown-divider" />
          <a class="dropdown-item" @click="emit('intention', 'dupliquer')">Dupliquer</a>
          <a class="dropdown-item" @click="emit('intention', 'corbeille')">
            Mettre à la corbeille
          </a>
        </div>
      </div>
    </div>
  </div>

  <ModaleBase
    v-if="avertissement"
    titre="Ce slide est diffusé sur plusieurs écrans"
    @fermer="avertissement = false"
  >
    <div class="content">
      <p>
        « <strong>{{ slide.name }}</strong> » est diffusé sur
        {{ ecransDuSlide.length }} écrans :
        <strong>{{ ecransDuSlide.map((e) => e.name).join(", ") }}</strong>. Le désactiver le coupe
        partout.
      </p>
      <p v-if="donnees.activeParEcran" class="has-text-grey">
        Pour ne le couper que sur un écran, utilisez l'interrupteur depuis la page de cet écran.
      </p>
      <p v-else class="has-text-grey">
        La coupure par écran n'est pas disponible sur cette base : l'interrupteur agit partout.
      </p>
    </div>

    <template #pied>
      <button class="button is-light" type="button" @click="avertissement = false">Annuler</button>
      <button class="button is-danger" type="button" @click="couperPartout">Couper partout</button>
    </template>
  </ModaleBase>
</template>

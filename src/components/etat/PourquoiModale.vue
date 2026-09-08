<script setup>
/**
 * Le panneau « Pourquoi ? » : les six conditions de diffusion, chacune avec son
 * verdict et, quand il y a lieu, un raccourci de correction.
 *
 * C'est la réponse à la question que la v1 ne permettait pas de poser :
 * « ce slide passe-t-il en ce moment, et sinon pourquoi ? »
 */
import { computed } from "vue";
import ModaleBase from "@/components/ui/ModaleBase.vue";
import { describeSchedule } from "@/core/schedule.js";
import { formatEcheance } from "@/core/dates.js";

const props = defineProps({
  etat: { type: Object, required: true },
  slide: { type: Object, required: true },
});

const emit = defineEmits(["fermer", "corriger"]);

const horaires = computed(() => describeSchedule(props.slide.display_times));
const echeance = computed(() => (props.etat.jusqua ? formatEcheance(props.etat.jusqua) : null));

function corriger(correction) {
  emit("corriger", correction);
  emit("fermer");
}
</script>

<template>
  <ModaleBase titre="Ce slide passe-t-il en ce moment ?" @fermer="emit('fermer')">
    <div class="notification is-light" :class="`is-${etat.ton}`">
      <strong>{{ etat.pastille }} {{ etat.label }}</strong>
      <p class="mb-0">{{ etat.message }}</p>
    </div>

    <ul class="pourquoi">
      <li
        v-for="(raison, i) in etat.raisons"
        :key="i"
        class="pourquoi-ligne"
        :class="raison.ok ? 'est-ok' : 'est-ko'"
      >
        <span class="pourquoi-marque">{{ raison.ok ? "✅" : "❌" }}</span>
        <div>
          <div class="pourquoi-label">{{ raison.label }}</div>
          <div v-if="raison.detail" class="pourquoi-detail">{{ raison.detail }}</div>
          <button
            v-if="raison.correction"
            class="button is-small is-link is-light mt-1"
            type="button"
            @click="corriger(raison.correction)"
          >
            {{ raison.correction.label }}
          </button>
        </div>
      </li>
    </ul>

    <div class="mt-4 content is-small">
      <p class="heading">Horaires paramétrés</p>
      <p>{{ horaires }}</p>
      <p v-if="echeance">Prochain changement d'état : {{ echeance }}.</p>
    </div>

    <div v-if="etat.parEcran && etat.parEcran.length > 1" class="mt-4">
      <p class="heading">Écran par écran</p>
      <ul class="pourquoi-ecrans">
        <li v-for="p in etat.parEcran" :key="p.ecran.id">
          <span class="tag mr-2" :class="`is-${p.etat.ton}`">
            {{ p.etat.pastille }} {{ p.etat.label }}
          </span>
          <strong>{{ p.ecran.name }}</strong>
          <span class="has-text-grey"> — {{ p.etat.message }}</span>
        </li>
      </ul>
    </div>

    <template #pied>
      <button class="button is-primary" type="button" @click="emit('fermer')">Fermer</button>
    </template>
  </ModaleBase>
</template>

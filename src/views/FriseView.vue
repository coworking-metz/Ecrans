<script setup>
/**
 * Frise de la journée — la contrepartie visuelle des plages horaires.
 *
 * Répond à « qu'est-ce qui passe sur cet écran, et quand ? ». En v1, le
 * paramétrage était totalement invisible : il fallait lire le JSON de chaque
 * slide et le simuler mentalement.
 */
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import { useDonneesStore } from "@/stores/donnees.js";
import { slidesDeLEcran } from "@/core/playlist.js";
import { segmentsDuJour, hasPriority, isAlways, getIsoWeek } from "@/core/schedule.js";
import { formatDuree } from "@/core/dates.js";

const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const route = useRoute();
const donnees = useDonneesStore();

const ecran = computed(() => donnees.ecranParId(route.params.id));

const jour = ref(debutDeJournee(new Date()));

function debutDeJournee(d) {
  const copie = new Date(d);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function decaler(delta) {
  const suivant = new Date(jour.value);
  suivant.setDate(suivant.getDate() + delta);
  jour.value = suivant;
}

const lignes = computed(() => {
  if (!ecran.value) return [];
  return slidesDeLEcran(ecran.value, donnees.slides, donnees.liens)
    .filter((s) => s.active !== false)
    .map((slide) => ({
      slide,
      segments: segmentsDuJour(slide.display_times, jour.value),
      prioritaire: hasPriority(slide.display_times),
      permanent: isAlways(slide.display_times),
    }));
});

/** Plages pendant lesquelles un slide prioritaire évince les autres. */
const zonesEviction = computed(() =>
  lignes.value
    .filter((l) => l.prioritaire)
    .flatMap((l) => l.segments.map((s) => ({ ...s, nom: l.slide.name })))
);

const estAujourdhui = computed(
  () => new Date().toDateString() === jour.value.toDateString()
);

const positionMaintenant = computed(() => {
  const maintenant = new Date();
  return ((maintenant.getHours() * 60 + maintenant.getMinutes()) / 1440) * 100;
});

const semaine = computed(() => getIsoWeek(jour.value));

const heures = computed(() =>
  Array.from({ length: 13 }, (_, i) => ({
    heure: i * 2,
    position: ((i * 2) / 24) * 100,
  }))
);

const libelleJour = computed(
  () => `${JOURS_FR[jour.value.getDay()]} ${jour.value.toLocaleDateString("fr-FR")}`
);

function classeLigne(ligne) {
  if (ligne.prioritaire) return "est-prioritaire";
  if (ligne.permanent) return "est-permanent";
  return "est-normal";
}

function minutesEnHeure(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
</script>

<template>
  <div v-if="!ecran" class="notification is-warning">Écran introuvable.</div>

  <div v-else>
    <div class="buttons are-small">
      <RouterLink class="button is-small" :to="`/ecran/${ecran.id}/slides`">
        ← Slides de l'écran
      </RouterLink>
    </div>

    <h1 class="title is-4">Frise — « {{ ecran.name }} »</h1>

    <div class="frise-navigation">
      <button class="button is-small" type="button" @click="decaler(-1)">‹ Jour précédent</button>
      <span class="frise-jour">
        {{ libelleJour }}
        <span class="tag is-light ml-2">
          semaine {{ semaine }} ({{ semaine % 2 === 0 ? "paire" : "impaire" }})
        </span>
      </span>
      <button class="button is-small" type="button" @click="decaler(1)">Jour suivant ›</button>
      <button
        class="button is-small is-light"
        type="button"
        @click="jour = debutDeJournee(new Date())"
      >
        Aujourd'hui
      </button>
    </div>

    <p v-if="lignes.length === 0" class="notification is-light mt-4">
      Aucun slide actif sur cet écran.
    </p>

    <div v-else class="frise">
      <div class="frise-grille">
        <div
          v-for="marque in heures"
          :key="marque.heure"
          class="frise-heure"
          :style="{ left: `${marque.position}%` }"
        >
          <span>{{ String(marque.heure).padStart(2, "0") }}h</span>
        </div>
      </div>

      <div
        v-if="estAujourdhui"
        class="frise-maintenant"
        :style="{ left: `${positionMaintenant}%` }"
        title="Maintenant"
      ></div>

      <div
        v-for="(zone, i) in zonesEviction"
        :key="`eviction-${i}`"
        class="frise-eviction"
        :style="{
          left: `${(zone.debut / 1440) * 100}%`,
          width: `${((zone.fin - zone.debut) / 1440) * 100}%`,
        }"
        :title="`« ${zone.nom} » est prioritaire : les slides non permanents sont écartés.`"
      ></div>

      <div v-for="ligne in lignes" :key="ligne.slide.id" class="frise-ligne">
        <RouterLink class="frise-libelle" :to="`/slide/${ligne.slide.id}`" title="Ouvrir ce slide">
          <span v-if="ligne.prioritaire" title="Prioritaire">⚡ </span>
          <span v-if="ligne.permanent" title="Permanent">📌 </span>
          {{ ligne.slide.name }}
          <span class="has-text-grey ml-1">{{ formatDuree(ligne.slide.duration) }}</span>
        </RouterLink>

        <div class="frise-piste">
          <span v-if="ligne.segments.length === 0" class="frise-vide">
            ne passe pas ce jour-là
          </span>
          <div
            v-for="(segment, i) in ligne.segments"
            :key="i"
            class="frise-barre"
            :class="classeLigne(ligne)"
            :style="{
              left: `${(segment.debut / 1440) * 100}%`,
              width: `${Math.max(0.5, ((segment.fin - segment.debut) / 1440) * 100)}%`,
            }"
            :title="`${minutesEnHeure(segment.debut)} → ${minutesEnHeure(segment.fin)}`"
          ></div>
        </div>
      </div>
    </div>

    <div class="content is-small mt-4">
      <p class="heading">Légende</p>
      <ul>
        <li><span class="frise-exemple est-normal"></span> slide diffusé pendant la plage</li>
        <li>
          <span class="frise-exemple est-prioritaire"></span> slide prioritaire : il écarte les
          autres
        </li>
        <li>
          <span class="frise-exemple est-permanent"></span> slide permanent : il résiste à
          l'éviction
        </li>
        <li>
          <span class="frise-exemple est-zone"></span> période d'éviction par un slide prioritaire
        </li>
      </ul>
    </div>
  </div>
</template>

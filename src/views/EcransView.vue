<script setup>
/**
 * Liste des écrans.
 *
 * Chaque écran indique ce qu'il diffuse en ce moment, combien de slides sont
 * éligibles, et s'il est en ligne. Un écran qui ne diffuse rien était
 * indétectable en v1 sans se déplacer.
 */
import { computed } from "vue";
import { useRouter } from "vue-router";

import { useDonneesStore } from "@/stores/donnees.js";
import { ecrans as apiEcrans } from "@/core/api.js";
import { eligibleSlides, dureeDuCycle } from "@/core/playlist.js";
import { urlImage, urlLecteur } from "@/core/media.js";
import { formatDuree } from "@/core/dates.js";
import { message, erreur } from "@/composables/messages.js";
import { useLiaison } from "@/composables/liaison.js";

const router = useRouter();
const donnees = useDonneesStore();
const { piloter, COMMANDES } = useLiaison();

const cartes = computed(() =>
  donnees.ecrans.map((ecran) => {
    const eligibles = eligibleSlides(
      ecran,
      donnees.slides,
      donnees.liens,
      donnees.maintenant
    );
    const vivant = donnees.lecteurs[ecran.id];
    const enLigne = !!vivant && Date.now() - vivant.vuA < 120000;
    const slideCourant = vivant?.slideCourant
      ? donnees.slideParId(vivant.slideCourant)
      : null;

    return {
      ecran,
      image: urlImage(ecran.image, { w: 200 }) || "/screen.png",
      nbEligibles: eligibles.length,
      cycle: formatDuree(dureeDuCycle(eligibles)),
      enLigne,
      slideCourant,
    };
  })
);

async function creerEcran() {
  try {
    const ecran = await apiEcrans.create();
    await donnees.recharger();
    router.push(`/ecran/${ecran.id}`);
  } catch (e) {
    erreur(e);
  }
}
</script>

<template>
  <h1 class="title is-4">Écrans</h1>

  <div class="buttons are-small mb-4">
    <button class="button is-small is-success" type="button" @click="creerEcran">
      <span class="icon is-small"><i class="fas fa-plus"></i></span>
      <span>Ajouter un écran</span>
    </button>
  </div>

  <p v-if="cartes.length === 0" class="notification is-light">
    Aucun écran configuré pour le moment.
  </p>

  <div v-else class="ecrans-liste">
    <article v-for="carte in cartes" :key="carte.ecran.id" class="media ecran-ligne">
      <figure class="media-left">
        <p class="image apercu-ecran">
          <img :src="carte.image" alt="" @error="$event.target.src = '/screen.png'" />
        </p>
      </figure>

      <div class="media-content">
        <p class="mb-1">
          <RouterLink :to="`/ecran/${carte.ecran.id}/slides`">
            <strong>{{ carte.ecran.name || "(sans nom)" }}</strong>
          </RouterLink>
          <code v-if="carte.ecran.slug" class="ml-2 is-size-7">{{ carte.ecran.slug }}</code>
        </p>

        <p class="is-size-7 mb-2">
          <span v-if="carte.nbEligibles === 0" class="tag is-danger is-light">
            ⚠️ Aucun contenu diffusé en ce moment
          </span>
          <span v-else class="has-text-grey">
            {{ carte.nbEligibles }} slide(s) en diffusion · tour de {{ carte.cycle }}
            <span v-if="carte.slideCourant">
              · à l'écran : <strong>{{ carte.slideCourant.name }}</strong>
            </span>
          </span>

          <span class="ml-2 tag is-light" :class="{ 'is-success': carte.enLigne }">
            {{ carte.enLigne ? "● en ligne" : "○ liaison inconnue" }}
          </span>
        </p>

        <nav class="level is-mobile mb-0">
          <div class="level-left">
            <a
              v-if="carte.ecran.slug"
              class="level-item action"
              :href="urlLecteur({ slug: carte.ecran.slug })"
              target="_blank"
              rel="noreferrer"
              title="Visionner"
            >
              <span class="icon is-small"><i class="fas fa-tv"></i></span>
            </a>

            <RouterLink
              class="level-item action"
              :to="`/ecran/${carte.ecran.id}/slides`"
              title="Slides de l'écran"
            >
              <span class="icon is-small"><i class="fas fa-images"></i></span>
            </RouterLink>

            <RouterLink
              class="level-item action"
              :to="`/ecran/${carte.ecran.id}/frise`"
              title="Frise de la journée"
            >
              <span class="icon is-small"><i class="fas fa-chart-gantt"></i></span>
            </RouterLink>

            <RouterLink class="level-item action" :to="`/ecran/${carte.ecran.id}`" title="Configurer">
              <span class="icon is-small"><i class="fas fa-pen"></i></span>
            </RouterLink>

            <a
              class="level-item action"
              title="Recharger l'écran à distance"
              @click="piloter(COMMANDES.recharger(carte.ecran.id), 'Rechargement demandé.')"
            >
              <span class="icon is-small"><i class="fas fa-sync"></i></span>
            </a>

            <a
              class="level-item action"
              title="Passer au slide suivant"
              @click="piloter(COMMANDES.avancer(carte.ecran.id), 'Slide suivant demandé.')"
            >
              <span class="icon is-small"><i class="fas fa-arrow-right"></i></span>
            </a>
          </div>
        </nav>
      </div>
    </article>
  </div>
</template>

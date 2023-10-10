<script setup>
import { computed, onMounted, watch } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { useRoute } from 'vue-router';
import { useEcransStore } from '@/stores/ecrans';
import { useMediasStore } from '@/stores/medias'
import { useSlidesStore } from '@/stores/slides'

const route = useRoute();
const ecransStore = useEcransStore();
const mediasStore = useMediasStore();
const slidesStore = useSlidesStore();

function start() {
  console.log('start')
  ecransStore.fetchEcrans();
  slidesStore.fetchLiens();
  slidesStore.fetchSlides();
  mediasStore.fetchMedias();
};

window.bus.on('loadSlides', () => {
  slidesStore.fetchSlides();
  slidesStore.fetchLiens();
});

window.bus.on('loadMedias', () => {
  mediasStore.fetchMedias();
})

onMounted(start);

watch(() => route.name, start);

const hasNavbar = computed(() => {
  if (route?.name?.includes('visionner')) return false;
  return true;
});

const appReady = computed(() => {
  if (slidesStore.liens===null) return;
  if (slidesStore.slides===null) return;
  if (ecransStore.ecrans===null) return;
  if (mediasStore.medias===null) return;
  // console.log(typeof slidesStore.liens, typeof slidesStore.slides, typeof ecransStore.ecrans, typeof mediasStore.medias)
  // console.log(slidesStore.liens?.length || 0, slidesStore.slides?.length || 0, ecransStore.ecrans?.length || 0, mediasStore.medias?.length || 0)
  return true;
})
</script>

<template>
  <template v-if="appReady">
    <template v-if="hasNavbar">
      <nav-bar />
      <div class="container">
        <div class="content">
          <div class="section">
            <router-view />
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <router-view />
    </template>
  </template>
</template>

<style scoped></style>

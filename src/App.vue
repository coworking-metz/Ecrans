<script setup>
import { computed, onMounted, watch, reactive } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { useRoute } from 'vue-router';
import { useEcransStore } from '@/stores/ecrans';
import { useMediasStore } from '@/stores/medias'
import { useSlidesStore } from '@/stores/slides'

const route = useRoute();
const ecransStore = useEcransStore();
const mediasStore = useMediasStore();
const slidesStore = useSlidesStore();

const data = reactive({
  hasNavbar: false
})
function start() {
  ecransStore.fetchEcrans();
  slidesStore.fetchLiens();
  slidesStore.fetchSlides();
  mediasStore.fetchMedias();

  data.hasNavbar = !route?.name?.includes('visionner');

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


const appReady = computed(() => {
  if (slidesStore.liens === null) return;
  if (slidesStore.slides === null) return;
  if (ecransStore.ecrans === null) return;
  if (mediasStore.medias === null) return;
  // console.log(typeof slidesStore.liens, typeof slidesStore.slides, typeof ecransStore.ecrans, typeof mediasStore.medias)
  // console.log(slidesStore.liens?.length || 0, slidesStore.slides?.length || 0, ecransStore.ecrans?.length || 0, mediasStore.medias?.length || 0)
  return true;
})
</script>

<template>
  <template v-if="appReady">
    <template v-if="data.hasNavbar">
      <nav-bar />
      <div class="container ml-5 mr-5 mt-5">
        <div class="content">
          <router-view />
        </div>
      </div>
    </template>
    <template v-else>
      <router-view />
    </template>
  </template>
</template>

<style scoped></style>

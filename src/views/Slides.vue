<template>
    <h1 class="title">Liste des slides</h1>
    <SlideItem v-for="slide in ecransStore.slides" :slide="slide" />
</template>
<script setup>
import { useEcransStore } from '@/stores/ecrans'
import SlideItem from '@/components/Slides/SlideItem.vue'
import { onMounted } from 'vue';

const ecransStore = useEcransStore();
onMounted(() => {
    ecransStore.fetchSlides();
})
</script>
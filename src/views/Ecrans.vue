<template>
    <h1 class="title">Liste des écrans disponibles</h1>
    <p class="subtitle">Pour ajouter un écran, consulter la documentation</p>
    <EcranItem v-for="ecran in ecransStore.ecrans" :ecran="ecran" />
</template>
<script setup>
import { useEcransStore } from '@/stores/ecrans'
import EcranItem from '@/components/Ecrans/EcranItem.vue'
import { onMounted } from 'vue';

const ecransStore = useEcransStore();
onMounted(() => {
    ecransStore.fetchEcrans();
})
</script>
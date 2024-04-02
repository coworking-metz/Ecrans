<template>

    <h1 class="title mt-5 ">Liste des écrans disponibles</h1>
    <div class="field has-addons mb-5">
        <p class="control">
            <button class="button is-small is-success" @click="newSlide">
                <span class="icon is-small">
                    <i class="fas fa-plus"></i>
                </span>
                <span>Ajouter un écran</span>
            </button>
        </p>
    </div>

    <EcranItem v-for="ecran in ecransStore.ecrans" :ecran="ecran" />
</template>
<script setup>
import { useEcransStore } from '@/stores/ecrans'
import EcranItem from '@/components/Ecrans/EcranItem.vue'
import { onMounted } from 'vue';

const ecransStore = useEcransStore();
onMounted(() => {
})
</script>
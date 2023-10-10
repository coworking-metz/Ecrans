<template>
    {{ data.ecran.slug }}
</template>
<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'


const data = reactive({
    ecran: false
})
const route = useRoute()
const ecransStore = useEcransStore();

onMounted(async () => {
    const response = await ecransStore.fetchEcran(route.params.id);
    data.ecran = response
    pageTitle('Ecran', data.ecran.name);
});
</script>
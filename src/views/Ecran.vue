<template></template>
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

onMounted(() => {
    ecransStore.fetchEcran(route.params.id).then(response => {
        data.ecran = response[0]
        pageTitle('Ecran', data.ecran.name);
    })

});
</script>
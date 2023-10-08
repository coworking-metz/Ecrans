<template></template>
<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'


const data = reactive({
    slide: false
})
const route = useRoute()
const ecransStore = useEcransStore();

onMounted(() => {
    ecransStore.fetchSlide(route.params.id).then(response => {
        data.slide = response[0]
        pageTitle('Slide', data.slide.name);
    })

});
</script>
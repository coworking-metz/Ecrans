<template>
    <div class="visionner" ref="visionner" v-if="data.slide">
        <div class="slides">

            <div class="slide">
                <SlideRender :slide="data.slide" />
            </div>

        </div>
    </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import { pageTitle } from '@/utils'
import SlideRender from '@/components/Slides/SlideRender.vue';
import supabase, { SUPABASE_URL } from "@/supabase";

const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();
const visionner = ref(null);

const data = reactive({
    slide: false,
})

onMounted(async () => {
    const response = await slidesStore.fetchSlide(route.params.id)
    data.slide = response[0];



});



</script>
<style scoped></style>
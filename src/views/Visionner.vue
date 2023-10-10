<template>
    <div class="slides">

        <template v-for="slide in data.slides" :key="slide.id">
            <Transition>
                <div class="slide" v-if="data.currentSlide.id == slide.id">
                    <template v-if="slide.type == 'image'">
                        <SlideImage :slide="slide" />
                    </template>
                    <template v-if="slide.type == 'url'">
                        <SlideUrl :slide="slide" />
                    </template>
                </div>
            </Transition>
        </template>

    </div>
</template>
<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'
import SlideImage from '@/components/Slides/SlideImage.vue';
import SlideUrl from '@/components/Slides/SlideUrl.vue';


let timeout = false;

const data = reactive({
    index: 0,
    currentSlide: false,
    ecran: false,
    slides: []
})
const route = useRoute()
const ecransStore = useEcransStore();

onMounted(async () => {
    const response = await ecransStore.fetchEcran(route.params.slug);
    data.ecran = response;
    pageTitle('Visionner', data.ecran.name);
    await loadSlides();
    avancer();

    document.body.addEventListener('keyup', (e) => { 
        console.log(e.code);
        if (e.code == 'ArrowRight') {
            clearTimeout(timeout);
            avancer(1)
        } else
            if (e.code == 'ArrowLeft') {

                clearTimeout(timeout);
                avancer(-1)
            }

    })
});
async function loadSlides() {
    data.slides = await ecransStore.ecranSlides(data.ecran.id);
}
function avancer(delta = 1) {
    data.currentSlide = data.slides[data.index];
    data.index += delta;
    if (data.index >= data.slides.length) {
        data.index = 0;
        loadSlides();
    }

    const duration = data.currentSlide.duration * 1000;
    timeout = setTimeout(avancer, duration);
}




</script>
<style scoped>
.slides:before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: transparent;
    z-index:999
}
.slides {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: black;
}

.slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}

.v-enter-active,
.v-leave-active {
    transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>
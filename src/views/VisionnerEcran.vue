<template>
    <div class="visionner" v-if="data.ecran">
        <div class="slides">

            <template v-for="slide in slides" :key="slide.id">
                <Transition>
                    <div class="slide" v-if="data.currentSlide && data.currentSlide.id == slide.id">
                        <SlideRender :slide="slide" />
                    </div>
                </Transition>
            </template>

        </div>
    </div>
</template>
<script setup>
import { onMounted, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import { pageTitle } from '@/utils'
import SlideRender from '@/components/Slides/SlideRender.vue';
const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();


let timeout = false;

const data = reactive({
    index: 0,
    currentSlide: false,
    ecran: false,
})

const slides = computed(() => {
    const ids = [];
    slidesStore.liens.forEach(lien => {
        if (lien.ecran_id == data.ecran.id) {
            ids.push(lien.slide_id);
        }
    })
    const tmpSlides = slidesStore.slides.filter(slide => ids.includes(slide.id))
    if (data.ecran.slideSort) {
        const out = [];
        data.ecran.slideSort.forEach(id => {
            tmpSlides.forEach(slide => {
                if (id == slide.id) {
                    out.push(slide);
                }
            })
        })
        return out;
    } else return tmpSlides;

})

onMounted(() => {
    const response = ecransStore.getEcranBySlug(route.params.slug);
    data.ecran = response;
    pageTitle('Visionner', data.ecran.name);
    // await loadSlides();
    window.bus.emit('loadSlides');
    avancer();
    handleShortcuts()
});

function avancer(delta = 1) {
    data.currentSlide = slides.value[data.index];
    console.log(slides.value, data.index)
    data.index += delta;
    if (data.index >= slides.value.length) {
        data.index = 0;
        // loadSlides();
    }

    const duration = (data.currentSlide?.duration || 0) * 1000;
    timeout = setTimeout(avancer, duration);
}


function handleShortcuts() {
    if (document.body.dataset.shortcuts) return;
    document.body.dataset.shortcuts = true;
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

}


</script>

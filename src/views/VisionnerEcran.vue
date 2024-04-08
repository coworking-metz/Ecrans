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
import supabase from "@/supabase";

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
    updated_at:false
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
        const out = sortSlidesByIds(tmpSlides, data.ecran.slideSort);
        const actifs = out.filter(slide => slide.active);
        console.log(actifs);
        return actifs;
    } else return tmpSlides;

})

function sortSlidesByIds(slides, ids) {
    const slidesMap = new Map(slides.map(slide => [slide.id, slide]));
    const sortedSlides = ids.map(id => slidesMap.get(id)).filter(slide => slide !== undefined);
    const remainingSlides = slides.filter(slide => !ids.includes(slide.id));
    return [...sortedSlides, ...remainingSlides];
}




onMounted(() => {
    chargerEcran();
    pageTitle('Visionner', data.ecran.name);
    // await loadSlides();
    window.bus.emit('loadSlides');
    avancer();
    handleShortcuts()
    if (window.refreshInterval) {
        clearTimeout(window.refreshInterval);
    }
    window.refreshInterval = setInterval(async () => {
        const response = await supabase
            .from('slides')
            .select('updated_at')
            .not('updated_at', 'is', null) // Filtre pour exclure les valeurs null
            .order('updated_at', { ascending: false })
            .limit(1);

            const updated_at = response.data[0].updated_at || false;
            console.log('updated_at',updated_at);
            if(data.updated_at) {
                if(data.updated_at != updated_at) {
                    // chargerEcran();
                    document.location.reload(true)
                }
            }
            data.updated_at = updated_at;
    }, 60000);
});

function chargerEcran() {
    const response = ecransStore.getEcranBySlug(route.params.slug);
    data.ecran = response;
    console.log('chargerEcran',slides.value.length, 'slides')
}
function avancer(delta = 1) {
    data.currentSlide = slides.value[data.index];
    // console.log(slides.value, data.index)
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

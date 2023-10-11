<template>
    <!-- <h1 class="title">{{ data.ecran.slug }}</h1> -->
    <div class="editeur">
        <div class="apercu">
            ok </div>
        <div class="slides" ref="slidesDiv">
            <div>
                <template v-for="slide in slides">
                    <SlidePreview :slide="slide" />
                </template>
                <template v-for="slide in slides">
                    <SlidePreview :slide="slide" />
                </template>
            </div>
        </div>
    </div>
</template>
<script setup>
import SlidePreview from '@/components/Slides/SlidePreview.vue'
import { onMounted, reactive, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSlidesStore } from '@/stores/slides'

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'


const data = reactive({
    ecran: false
})
const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();

const slidesDiv = ref(null);

const slides = computed(() => {
    return slidesStore.slides.filter(filterSlides)
})
function filterSlides(slide) {
    const liens = slidesStore.getLiens(slide.id);
    for (const lien of liens) {
        if (lien.ecran_id == data.ecran.id) {
            return true
        }
    }
}

onMounted(() => {
    const response = ecransStore.getEcran(route.params.id);
    data.ecran = response
    pageTitle('Ecran', data.ecran.name);

    if (!slidesDiv.value.dataset.scroll == true) {
        slidesDiv.value.dataset.scroll = true
        slidesDiv.value.addEventListener('wheel', function (e) {
            if (e.deltaX !== 0) {
                return; // Ne fait rien si le défilement est horizontal
            }
            e.preventDefault();
            slidesDiv.value.scrollLeft += e.deltaY;
        });
    }

});
</script>
<style scoped>
.editeur {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.editeur .apercu {
    flex: 1;
}

.editeur .slides {
    flex: 0 0 15vh;
    overflow-x: auto;
    /* mask: linear-gradient(90deg, transparent, white 20%, white 80%, transparent); */
}

.editeur .slides>div {
    width: max-content;
    flex-wrap: nowrap;
    display: flex;
    gap: 1vw;
    height: 100%;
    padding-bottom: 1vw;
}

.editeur .slides>div>div {
    height: 100%;
}
</style>
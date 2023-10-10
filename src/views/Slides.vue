<template>
    <h1 class="title">{{ pageTitle }} ({{ slides.length }})</h1>


    <div class="field has-addons">
        <template v-if="data.isTrash">
            <p class="control">
                <router-link to="/slides" class="button is-small" @click="newSlide">
                    <span class="icon is-small">
                        <i class="fas fa-arrow-left"></i>
                    </span>
                    <span>Retour aux slides</span>
                </router-link>
            </p>
        </template>
        <template v-else>
            <p class="control">
                <button class="button is-small is-success" @click="newSlide">
                    <span class="icon is-small">
                        <i class="fas fa-plus"></i>
                    </span>
                    <span>Créer un nouveau slide</span>
                </button>
            </p>
            <p class="control">
                <router-link to="/slides/trash" class="button is-small" @click="newSlide">
                    <span class="icon is-small">
                        <i class="fas fa-trash"></i>
                    </span>
                    <span>Corbeille</span>
                </router-link>
            </p>
        </template>
    </div>

    <SlideItem v-for="slide in slides" :slide="slide" />
</template>
<script setup>
import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import SlideItem from '@/components/Slides/SlideItem.vue'
import { onMounted, reactive, computed } from 'vue';
import supabase from "@/supabase";

import { useRoute } from 'vue-router'
const route = useRoute()
const slidesStore = useSlidesStore();
const ecransStore = useEcransStore();


const data = reactive({
    isTrash: false,
    ecran: false,
    ecranId: false
})
const slides = computed(() => {
    return slidesStore.slides.filter((slide) => {
        if (data.ecranId) {
            console.log(data.ecranId);
            if (slidesStore.checkEcran(slide.id, data.ecranId)) {
                return true
            }
        } else return true;
    })
})
const pageTitle = computed(() => {
    if (data.ecran) return `Slide de l'écran "${data.ecran.name}"`;

    if (data.isTrash) return 'Corbeille des slides';
    return 'Liste des slides';

})
onMounted(loadSlides)
async function loadSlides() {
    await slidesStore.fetchLiens();
    data.isTrash = route.name == 'slides-trash';
    data.ecranId = Number(route.params.id);
    if (data.ecranId) {
        data.ecran = await ecransStore.fetchEcran(data.ecranId);
    }
    await slidesStore.fetchSlides(data.isTrash);
}
window.bus.on('loadSlides', loadSlides);
async function newSlide() {
    const nb = await getnbSlidesVides();
    const { data, error } = await supabase
        .from('slides')
        .insert([
            { name: `Nouveau slide vide (${nb + 1})` }
        ]);
    loadSlides()

}
async function getnbSlidesVides() {
    const { data, error } = await supabase
        .from('slides')
        .select('*')
        .ilike('name', 'Nouveau slide vide%');
    let nb = 0;
    if (!error) {
        nb = data.length;
    }
    return nb;
}
</script>
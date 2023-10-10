<template>
    <h1 class="title">{{ pageTitle }} ({{ slides.length }})</h1>

    <div class="field has-addons">
        <template v-if="data.isTrash">
            <p class="control">
                <router-link to="/slides" class="button is-small">
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
            <p class="control" v-if="data.ecranId && data.ecran.name">
                <router-link :to="{ name: 'ecran', params: { id: data.ecranId } }" class="button is-small is-link">
                    <span class="icon is-small">
                        <i class="fas fa-tv"></i>
                    </span>
                    <span>{{ data.ecran.name }}</span>
                </router-link>
            </p>
            <p class="control">
                <router-link to="/slides/trash" class="button is-small">
                    <span class="icon is-small">
                        <i class="fas fa-trash"></i>
                    </span>
                    <span>Corbeille</span>
                </router-link>
            </p>
        </template>
    </div>

    <button v-if="data.isLoading" class="button is-loading" style="border:none;width:100%">Chargement en cours</button>
    <template v-else>
        <SlideItem v-for="slide in slides" :slide="slide" />
    </template>
</template>
<script setup>
import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import SlideItem from '@/components/Slides/SlideItem.vue'
import { onMounted, reactive, computed, watch } from 'vue';
import supabase from "@/supabase";

import { useRoute } from 'vue-router'
import router from '../router';
const route = useRoute()
const slidesStore = useSlidesStore();
const ecransStore = useEcransStore();


const data = reactive({
    isLoading: false,
    isTrash: false,
    ecran: false,
    ecranId: false
})
const slides = computed(() => {
    console.log('computed')
    if (data.isTrash) {
        return slidesStore.trash
    } else {
        return slidesStore.slides.filter(filterSlides)
    }
})

function filterSlides(slide) {
    if (data.ecranId) {
        const liens = slidesStore.getLiens(slide.id);
        for (const lien of liens) {
            if (lien.ecran_id == data.ecranId) {
                return true
            }
        }
    } else {
        return true;
    }
}
const pageTitle = computed(() => {
    if (data.ecran) return `Slide de l'écran "${data.ecran.name}"`;

    if (data.isTrash) return 'Corbeille des slides';
    return 'Liste des slides';

})
onMounted(start)
async function start() {
    data.isLoading = true;
    console.log('start')
    data.isTrash = route.name == 'slides-trash';
    data.ecranId = Number(route.params.id);
    if (data.ecranId) {
        data.ecran = await ecransStore.fetchEcran(data.ecranId);
    }
    watch(() => route.params, start)
    watch(() => route.name, start)

    setTimeout(() => data.isLoading = false, 1000);
}

async function newSlide() {
    const nb = await getnbSlidesVides();
    const { data, error } = await supabase
        .from('slides')
        .insert([
            { name: `Nouveau slide vide (${nb + 1})` }
        ]).select();
    router.push({
        name: 'slide',
        params: { id: data[0].id },
    })
    // window.bus.emit('loadSlides')
}
async function getnbSlidesVides() {
    const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('trash', false)
        .ilike('name', 'Nouveau slide vide%');
    let nb = 0;
    if (!error) {
        nb = data.length;
    }
    return nb;
}
</script>
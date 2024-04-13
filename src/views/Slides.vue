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
            <template v-if="data.ecranId && data.ecran.name">
                <p class="control">
                    <router-link :to="{ name: 'visionner-ecran', params: { slug: data.ecran.slug } }" target="_blank" class="button is-small is-link">
                        <span class="icon is-small">
                            <i class="fas fa-tv"></i>
                        </span>
                        <span>{{ data.ecran.name }}</span>
                    </router-link>
                </p>
                <p class="control">
                    <a @click="refreshEcran" target="_blank" class="button is-small">
                        <span class="icon is-small">
                            <i class="fas fa-sync"></i>
                        </span>
                        <span>Recharger</span>
                    </a>
                </p>
                <p class="control">
                    <a @click="avancerSlideEcran" target="_blank" class="button is-small">
                        <span class="icon is-small">
                            <i class="fas fa-arrow-right"></i>
                        </span>
                        <span>Avancer</span>
                    </a>
                </p>
            </template>
            <p class="control">
                <router-link to="/slides/trash" class="button is-small is-danger">
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
        <div>
            <SlideItem v-for="slide in slides" :ecranId="data.ecranId" :slide="slide" />
        </div>
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

function refreshEcran() {
    window.ws.send({ name: "refresh-ecran", id: data.ecranId });
}
function avancerSlideEcran() {
    window.ws.send({ name: "avancer-ecran", id: data.ecranId });
}


const data = reactive({
    isLoading: false,
    isTrash: false,
    ecran: false,
    ecranId: false
})
const slides = computed(() => {
    if (data.isTrash) {
        return slidesStore.trash
    } else {

        const tmpSlides = slidesStore.slides.filter(filterSlides)

        if (data.ecran.slideSort) {
            const out = [];
            data.ecran.slideSort.forEach(id => {
                tmpSlides.forEach(slide => {
                    if (id == slide.id) {
                        out.push(slide);
                    }
                })
            })
            tmpSlides.forEach(tmpSlide => {
                let trouve = false;
                out.forEach(slide => {
                    if (slide.id == tmpSlide.id) {
                        trouve = true;
                    }
                })
                if (!trouve) {
                    out.push(tmpSlide)
                }
            })
            // console.log(out)
            return out;
        }


        return tmpSlides;
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
    if (data.ecran) return `Slides de l'écran "${data.ecran.name}"`;

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

    setTimeout(() => {
        data.isLoading = false
    }, 1000);
}
window.bus.on('save-sort', () => {
    if (!slides) return;
    if (!data.ecran) return;
    const slideSort = slides.value.map(slide => slide.id);
    supabase
        .from('ecrans')
        .update({ slideSort: slideSort })
        .eq('id', data.ecran.id).then(response => {
            // console.log(response)
            data.ecran.slideSort = slideSort
        })
});



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



window.bus.on('update-sort', args => {
    const slideSort = data.ecran.slideSort;

    if (!slideSort) {
        slideSort = []
        slides.value.forEach(slide => {
            slideSort.push(slide.id)
        })
    }

    const srcIndex = slideSort.indexOf(args.srcId);
    const targetIndex = slideSort.indexOf(args.targetId);

    if (srcIndex !== -1) {
        slideSort.splice(srcIndex, 1);
    }

    const newIndex = slideSort.indexOf(args.targetId) + (srcIndex < targetIndex ? 1 : 0);

    slideSort.splice(newIndex, 0, args.srcId);

    data.ecran.slideSort = slideSort.map(id => Number(id)).filter((value, index, array) => array.indexOf(value) === index);

    window.bus.emit('save-sort');

    // supabase
    //     .from('ecrans')
    //     .update({ slideSort: data.ecran.slideSort })
    //     .eq('id', data.ecran.id).then(response => {
    //         console.log(response)
    //     })


});




</script>
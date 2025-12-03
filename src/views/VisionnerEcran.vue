<template>
    <audio ref="audioPlayer" style="display: none;"></audio>
    <div class="visionner" v-if="data.ecran">
        <iframe v-if="show_side" :src="data.ecran.side_url" class="side"></iframe>

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
import { onMounted, reactive, computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import supabase from "@/supabase";

import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import { pageTitle, isInTimeRange } from '@/utils'
import SlideRender from '@/components/Slides/SlideRender.vue';
import { hasPriority, isAlways } from '../utils';
const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();


let timeout = false;

const data = reactive({
    index: 0,
    currentSlide: false,
    ecran: false,
    updated_at: false
})
const audioPlayer = ref(null) // Référence vers le lecteur audio
const show_side = computed(() => {
    if (!data.ecran.show_side) return;

    if (!isInTimeRange(data.ecran.side_times)) return;

    return true;
})
const slides = computed(() => {
    const ids = [];
    slidesStore.liens.forEach(lien => {
        if (lien.ecran_id == data.ecran.id) {
            ids.push(lien.slide_id);
        }
    });

    const tmpSlides = slidesStore.slides;
    let actifs;
    if (data.ecran.slideSort) {
        const out = sortSlidesByIds(tmpSlides, data.ecran.slideSort);
        actifs = out.filter(slide => slide.active);
    } else {
        actifs = tmpSlides.filter(slide => slide.active);
    }

    const now = new Date();

    const eligibleSlides = actifs.filter(slide => {
        if (!ids.includes(slide.id)) return false;
        if (!isInTimeRange(slide)) return false;

        // if (slide.display_times) {
            // }
            
            const publicationDate = slide.publication ? new Date(slide.publication) : null;
            const expirationDate = slide.expiration ? new Date(slide.expiration) : null;
            
            if (publicationDate && publicationDate > now) return false;
            console.log('slide_json',JSON.stringify(slide));
            if (expirationDate && expirationDate < now) return false;
            
        return true;
    });
            console.log('slide_json','-----------------------------------------------------');

    const hasAnyPriority = eligibleSlides.some(slide => hasPriority(slide));
    const out = eligibleSlides.filter(slide => !hasAnyPriority || hasPriority(slide) || isAlways(slide));

    console.log(out.length, { slides: out }, 'slides actifs');
    return out;
});


function sortSlidesByIds(slides, ids) {
    const slidesMap = new Map(slides.map(slide => [slide.id, slide]));
    const sortedSlides = ids.map(id => slidesMap.get(id)).filter(slide => slide !== undefined);
    const remainingSlides = slides.filter(slide => !ids.includes(slide.id));
    return [...sortedSlides, ...remainingSlides];
}



watch(() => data.ecran, (newVal, oldVal) => {
    if (!data.ecran?.playlist_on) return;
    if (!data.ecran?.playlist) return;
    const playlist = data.ecran.playlist.split("\n").map(url => url.trim())
    console.log({ playlist })
    setupPlaylist(playlist)
})


/**
 * Fonction pour configurer la playlist
 */
function setupPlaylist(playlist) {

    if (playlist.length > 0) {
        // Mélange aléatoire des URLs
        const shuffledPlaylist = shuffleArray(playlist);
        console.log({ shuffledPlaylist })
        // Configure et démarre la lecture
        playPlaylist(shuffledPlaylist);
    }
}

/**
 * Fonction pour lire la playlist aléatoire
 * @param {Array} playlist - Liste des URLs MP3
 */
function playPlaylist(playlist) {
    let currentIndex = 0;

    // Fonction pour jouer la piste actuelle
    function playNext() {
        if (currentIndex < playlist.length) {
            audioPlayer.value.src = playlist[currentIndex];
            audioPlayer.value.play();
            currentIndex++;
        } else {
            // Redémarrer la playlist une fois terminée
            currentIndex = 0;
            playNext();
        }
    }
    // Événement lorsque la piste est terminée
    audioPlayer.value.addEventListener('ended', playNext);
    audioPlayer.value.volume = parseFloat(data.ecran.playlist_volume / 100);
    // Démarre la première piste
    playNext();
}
/**
 * Mélange un tableau
 * @param {Array} array - Tableau à mélanger
 * @returns {Array} - Tableau mélangé
 */
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}
onMounted(() => {
    chargerEcran();
    pageTitle('Visionner', data.ecran.name);
    handleShortcuts()
    // await loadSlides();
    window.bus.emit('loadSlides');
    doAvancer();

});

let timer;
window.bus.on('refresh-ecran', payload => {
    if (payload?.id == data.ecran?.id) {
        if (timer) {
            clearTimeout(timer);
            document.location.reload(true)
        } else {
            timer = setTimeout(() => document.location.reload(), 3000);
        }
    }
})
window.bus.on('avancer-ecran', payload => {
    if (payload?.id == data.ecran?.id) {
        clearTimeout(timeout);
        doAvancer()
    }
})
function chargerEcran() {
    const response = ecransStore.getEcranBySlug(route.params.slug);
    data.ecran = response;
    console.log('chargerEcran', slides.value.length, 'slides')
}
function doAvancer(delta = 1) {
    console.log('avancer', delta)
    data.currentSlide = slides.value[data.index];
    // console.log(slides.value, data.index)
    data.index += delta;
    if (data.index >= slides.value.length) {
        data.index = 0;
        // loadSlides();
    }

    const duration = (data.currentSlide?.duration || 0) * 1000;
    timeout = setTimeout(doAvancer, duration);
}


function handleShortcuts() {
    if (document.body.dataset.shortcuts) return;
    document.body.dataset.shortcuts = true;
    document.addEventListener('keyup', (e) => {
        console.log(e.code);
        if (e.code == 'ArrowRight') {
            doAvancer(1)
            clearTimeout(timeout);
        } else
            if (e.code == 'ArrowLeft') {
                doAvancer(-1)
                clearTimeout(timeout);
            }

    })

}


</script>
<style>
html,
body {
    overflow: hidden;
}
</style>
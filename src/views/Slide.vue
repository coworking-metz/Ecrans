<template>
    <div class="field has-addons">
        <p class="control">
            <router-link to="/slides" class="button is-small">
                <span class="icon is-small">
                    <i class="fas fa-arrow-left"></i>
                </span>
                <span>Retour aux slides</span>
            </router-link>
        </p>
    </div>
    <form @submit.prevent="submitForm">
        <div class="columns">
            <div class="column">
                <div class="field">
                    <label class="label">Nom du slide</label>
                    <div class="control">
                        <input class="input" type="text" v-model="data.slide.name">
                    </div>
                    <p class="help">Définir un nom permet de retrouver plus facilement le slide par la suite</p>
                </div>


                <div class="columns">
                    <div class="column">
                        <div class="field">
                            <label class="label">Type de slide</label>
                            <div class="control">
                                <div class="select">
                                    <select v-model="data.slide.type">
                                        <template v-for="typeSlide in slidesStore.types" :key="typeSlide.slug">
                                            <option :value="typeSlide.slug">{{ typeSlide.name }}</option>
                                        </template>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="column">
                        <div class="field">
                            <label class="label">Durée du slide</label>
                            <div class="control">
                                <input class="input" type="text" v-model="data.slide.duration">
                            </div>
                            <p class="help">Durée d'affichage du slide en secondes</p>
                        </div>

                    </div>
                </div>
            </div>
            <div class="column column-tv">
                <SlidePreview :slide="data.slide" tv="true" />
                <div class="field">
                    <label class="label">Ecrans où diffuser ce slide</label>
                    <div class="control">
                        <div class="select is-multiple is-fullwidth">
                            <select multiple="multiple" v-model="data.ecransIds">
                                <option v-for="ecran in ecransStore.ecrans" :key="ecran.id" :value="ecran.id">{{
                                    ecran.name
                                }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <hr>
        <SlideDefaultForm v-if="data.slide.type == 'default'" :slide="data.slide" />
        <SlideImageForm v-if="data.slide.type == 'default' || data.slide.type == 'image'" :slide="data.slide" />
        <SlideVideoForm v-if="data.slide.type == 'video'" :slide="data.slide" />
        <SlideUrlForm v-if="data.slide.type == 'url'" :slide="data.slide" />
        <hr>
        <div class="field">
            <label class="label">Horaires d'affichage du slide</label>
            <div class="control">
                <textarea class="textarea is-small" v-model="data.slide.display_times"
                    :placeholder='display_times_placeholder'></textarea>
            </div>
        </div>
        <hr>
        <div class="buttons validation-bar box">
            <button class="button is-primary" :class="{ 'is-loading': data.isLoading }">Valider</button>
            <router-link to="/slides" class="button is-text">Annuler</router-link>
        </div>
        <p><small>Créé le {{ formatDateToFrench(data.slide.created_at) }} / Dernière modification le {{
            formatDateToFrench(data.slide.updated_at) }}</small></p>
        <p></p>
    </form>
</template>
<script setup>
import SlidePreview from '@/components/Slides/SlidePreview.vue'
import SlideUrlForm from '@/components/Slides/SlideUrlForm.vue'
import SlideImageForm from '@/components/Slides/SlideImageForm.vue'
import SlideVideoForm from '@/components/Slides/SlideVideoForm.vue'
import SlideDefaultForm from '@/components/Slides/SlideDefaultForm.vue'
import { computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { formatDateToFrench } from '@/utils'

import { useSlidesStore } from '@/stores/slides'
import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'
import supabase from "@/supabase";

const display_times_placeholder = computed(() => {
    return `[
    {"start":"10:00", "end":"11:00", "days":["monday","tuesday"]},
    {"start":"15:00","end":"16:00"}
]`
})


const data = reactive({
    slide: false,
    isLoading: false,
    ecrans: [],
    ecransIds: []
})
const route = useRoute()
const slidesStore = useSlidesStore();
const ecransStore = useEcransStore();

onMounted(async () => {

    const response = await slidesStore.fetchSlide(route.params.id)

    data.slide = response[0];
    if (!data.slide.meta) {
        data.slide.meta = {};
    }
    data.ecrans = await slidesStore.getEcrans(data.slide.id)
    data.ecransIds = data.ecrans.map(ecran => ecran.id);
    pageTitle(data.slide.name, 'Slide');

});
window.bus.on('loadedIframe', slide => {

})
window.bus.on('setSlideMeta', meta => {
    console.table(meta)
    for (const key in meta) {
        const value = meta[key];
        data.slide.meta[key] = value;
    }
})



async function submitForm() {
    window.bus.emit('closeMediaSelector')
    data.isLoading = true;

    await supabase
        .from('liens_ecrans_slides')
        .delete()
        .eq('slide_id', data.slide.id);

    const liens = data.ecransIds.map(ecranId => ({
        slide_id: data.slide.id,
        ecran_id: ecranId
    }));

    await supabase
        .from('liens_ecrans_slides')
        .insert(liens);


    const { d, e } = await supabase
        .from('slides')
        .update(data.slide)
        .eq('id', data.slide.id);
    window.bus.emit('updateSlidePreview');

    const response = await slidesStore.fetchSlide(route.params.id)
    data.slide = response[0];

    setTimeout(() => data.isLoading = false, 2000);
}
</script>
<style>
.column-tv {
    flex: 0 0 300px;
}
</style>
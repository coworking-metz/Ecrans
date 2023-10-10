<template>
    <form @submit.prevent="submitForm">
        <div class="field">
            <label class="label">Nom du slide</label>
            <div class="control">
                <input class="input" type="text" v-model="data.slide.name">
            </div>
            <p class="help">Définir un nom permet de retrouver plus facilement le slide par la suite</p>
        </div>

        <div class="field">
            <label class="label">Durée du slide</label>
            <div class="control">
                <input class="input" type="text" v-model="data.slide.duration">
            </div>
            <p class="help">Durée d'affichage du slide en secondes</p>
        </div>

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
        <hr>
        <SlideDefaultForm v-if="data.slide.type == 'default'" :slide="data.slide" />
        <SlideImageForm v-if="data.slide.type == 'default' || data.slide.type == 'image'" :slide="data.slide" />
        <SlideUrlForm v-if="data.slide.type == 'url'" :slide="data.slide" />
        <hr>
        <div class="buttons validation-bar">
            <button class="button is-primary" :class="{ 'is-loading': data.isLoading }">Valider</button>
            <router-link to="/slides" class="button is-text">Annuler</router-link>
        </div>
    </form>
</template>
<script setup>
import SlideUrlForm from '@/components/Slides/SlideUrlForm.vue'
import SlideImageForm from '@/components/Slides/SlideImageForm.vue'
import SlideDefaultForm from '@/components/Slides/SlideDefaultForm.vue'
import { onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'

import { useSlidesStore } from '@/stores/slides'
import { pageTitle } from '@/utils'
import supabase from "@/supabase";


const data = reactive({
    slide: false,
    isLoading: false
})
const route = useRoute()
const slidesStore = useSlidesStore();

onMounted(() => {
    slidesStore.fetchSlide(route.params.id).then(response => {
        data.slide = response[0];
        if (!data.slide.meta) {
            data.slide.meta = {};
        }
        pageTitle('Slide', data.slide.name);
    })

});

window.bus.on('setSlideMeta', meta => {
    for (const key in meta) {
        const value = meta[key];
        data.slide.meta[key] = value;
    }
})

async function submitForm() {
    window.bus.emit('closeMediaSelector')

    data.isLoading = true;
    const { d, e } = await supabase
        .from('slides')
        .update(data.slide)
        .eq('id', data.slide.id);
    setTimeout(() => data.isLoading = false, 2000);
}
</script>
<template>
    <div class="field has-addons">
        <p class="control">
            <router-link to="/" class="button is-small">
                <span class="icon is-small">
                    <i class="fas fa-arrow-left"></i>
                </span>
                <span>Retour aux écrans</span>
            </router-link>
        </p>
    </div>
    <form @submit.prevent="submitForm">
        <div class="columns">
            <div class="column">
                <div class="field">
                    <label class="label">Nom de l'écran</label>
                    <div class="control">
                        <input class="input" type="text" v-model="data.ecran.name">
                    </div>
                    <p class="help">Définir un nom permet de retrouver plus facilement cet écran</p>
                </div>
                <div class="field" v-if="data.ecran.slug">
                    <label class="label">Slug de l'écran</label>
                    <div class="control">
                        <input class="input" type="text" v-model="data.ecran.slug">
                    </div>
                </div>
            </div>
            <div class="column">
                <div class="field">
                    <label class="label">Image associée</label>
                    <template v-if="data.ecran.image">
                        <div class="apercu">
                            <img :src="imageThumbnail">
                        </div>
                    </template>

                    <MediaSelector name="image" />
                </div>
            </div>
        </div>
        <label class="checkbox">
            <input type="checkbox" v-model="data.ecran.show_side" />
            Afficher une barre latérale sur cet écran
        </label>

        <template v-if="data.ecran.show_side">
            <div class="field">
                <label class="label">Url de la barre latérale</label>
                <p class="control has-icons-left">
                    <input class="input" type="url" placeholder="Url de la page" v-model="data.ecran.side_url">
                    <span class="icon is-small is-left">
                        <i class="fas fa-globe"></i>
                    </span>
                </p>
            </div>

            <div class="field">
                <label class="label">Heures d'affichages de la barre latérale</label>
                <div class="control">
                    <textarea class="textarea is-small" v-model="data.ecran.side_times"
                        :placeholder='slide_times_placeholder'></textarea>
                </div>
            </div>
        </template>
        <hr>
        <div class="buttons validation-bar">
            <button class="button is-primary" :class="{ 'is-loading': data.isLoading }">Valider</button>
            <router-link to="/ecrans" class="button is-text">Annuler</router-link>
        </div>

        <nav class="level is-mobile">
            <div class="level-left">
                <a class="level-item" @click="deleteEcran">
                    <span class="icon is-small"><i class="fas fa-trash"></i></span>
                    Effacer
                </a>
            </div>
        </nav>


    </form>
</template>
<script setup>
import MediaSelector from '@/components/Medias/MediaSelector.vue'

import { onMounted, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMediasStore } from '@/stores/medias'

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'
import supabase from "@/supabase";
import router from '../router';


const data = reactive({
    isLoading: false,
    ecran: [],
})
const route = useRoute()
const ecransStore = useEcransStore();
const mediasStore = useMediasStore();

const slide_times_placeholder = computed(() => {
    return `[
    {"start":"10:00", "end":"11:00", "days":["monday","tuesday"]},
    {"start":"15:00", "end":"16:00"}
]`
})
onMounted(async () => {


    data.ecran = await ecransStore.getEcran(route.params.id)


});

window.bus.on(`updateMedia`, (params) => {
    const media = mediasStore.fetchMedia(params.id);
    data.ecran[params.name] = media.url
});


const imageThumbnail = computed(() => {
    return supabaseMediaUrl(data.ecran.image.replace('medias/medias/', 'medias/thumbnails/'))
})


async function deleteEcran() {
    if (!confirm('EFfacer cet écran ? Les slides associés ne seront pas effacés')) return;
    await supabase
        .from('ecrans')
        .delete()
        .eq('id', data.ecran.id);
    router.push('/')

}
async function submitForm() {
    window.bus.emit('closeMediaSelector')
    console.log(data)


    supabase
        .from('ecrans')
        .update(data.ecran)
        .eq('id', data.ecran.id).then(response => {
            console.log(response)
        })



}
</script>
<style></style>
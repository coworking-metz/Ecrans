<template>
    <article class="media mb-2">
        <figure class="media-left">
            <p class="image">
                <img :src="ecranImage">
            </p>
        </figure>
        <div class="media-content">
            <div class="content">
                <p>
                    <strong>
                        <router-link :to="{ name: 'ecran-slides', params: { id: ecran.id } }">{{ ecran.name
                            }}</router-link>
                    </strong> &nbsp; <small class="tag">
                        {{ ecran.nb_slides }} slide(s)
                    </small>
                </p>
            </div>
            <nav class="level is-mobile">
                <div class="level-left">
                    <router-link v-if="ecran.slug" :to="{ name: 'visionner-ecran', params: { slug: ecran.slug } }"
                        title="Visionner cet écran" class="level-item" target="_blank">
                        <span class="icon is-small"><i class="fas fa-tv"></i></span>
                    </router-link>
                    <router-link :to="{ name: 'ecran-slides', params: { id: ecran.id } }" title="Slides de l'écran"
                        class="level-item">
                        <span class="icon is-small"><i class="fas fa-images"></i></span>
                    </router-link>
                    <router-link :to="{ name: 'ecran', params: { id: ecran.id } }" title="Editer cet écran"
                        class="level-item">
                        <span class="icon is-small"><i class="fas fa-pen"></i></span>
                    </router-link>
                    <a @click="refresh" title="Rafraichir cet écran" class="level-item">
                        <span class="icon is-small"><i class="fas fa-sync"></i></span>
                    </a>
                </div>
            </nav>
        </div>
        <div class="media-right">
        </div>
    </article>
</template>
<script setup>
import { computed } from 'vue';

const props = defineProps(['ecran'])

const ecranImage = computed(() => {
    return supabaseMediaUrl(props.ecran.image)
})
function refresh() {
    window.ws.send({ name: "refresh-ecran", id: props.ecran.id });
}
</script>
<style scoped>
.image img {
    width: 64px;
    height: 64px;
    object-fit: cover;
}
</style>
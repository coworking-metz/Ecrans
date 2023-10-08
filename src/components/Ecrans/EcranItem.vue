<template>
    <router-link :to="{ name: 'ecran', params: { id: ecran.id } }" class="card box mb-2">
            <!-- <span class="card-image">
            <figure class="image is-4by3">
                <img src="https://bulma.io/images/placeholders/1280x960.png" alt="Placeholder image">
            </figure>
        </span> -->
            <span class="card-content">
                <span class="media">
                    <span class="media-left">
                        <figure class="image is-48x48">
                            <img src="https://bulma.io/images/placeholders/96x96.png" alt="Placeholder image">
                        </figure>
                    </span>
                    <span class="media-content">
                        <p class="title is-4">{{ ecran.name }}</p>
                    </span>
                </span>

        </span>
    </router-link>
</template>
<script setup>
const props = defineProps(['ecran'])
</script>
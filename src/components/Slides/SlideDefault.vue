<template>
    <template v-if="props.slide.meta">
        <div :style="'background:' + props.slide.meta.backgroundColor">

            <img :src="slideImage"
                :style="'object-fit:' + props.slide.meta.fit + ';opacity:' + props.slide.meta.opacity">

            <div class="contenu">
                <div class="image"><img :src="imagePrincipale"></div>
                <div class="texte" :style="'color:' + props.slide.meta.color">
                    <h1>{{ props.slide.meta.titre }}</h1>
                    <div v-html="texte"></div>
                </div>

            </div>


            <div class="qr" v-if="props.slide.meta.url">
                <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + props.slide.meta.url">
            </div>
        </div>
    </template>
</template>
<script setup>
import { computed, ref } from 'vue'
const props = defineProps(['slide'])

const texte = computed(() => {
    return props.slide.meta.texte.replaceAll('\n', '<br>');
})
const slideImage = computed(() => {
    return supabaseMediaUrl(props.slide.meta.image, {w:1600})
});
const imagePrincipale = computed(() => {
    return supabaseMediaUrl(props.slide.meta.imagePrincipale, {w:500})
})

</script>
<style>
div {
    width: 100%;
    height: 100%;

}

div>img {
    position: absolute;
    z-index: 0;
    width: 100%;
    height: 100%;
}

.contenu {
    padding: 10vh;
    position: absolute;
    z-index: 1;
    display: flex;
    gap: 10vh;
    flex-direction: column;
    max-width: 60vw;
    left: 50%;
    transform: translateX(-50%);
}

.texte {
    display: flex;
    flex-direction: column;
    gap: 5vh;
    text-align: center;
    font-variant: small-caps;
}

.texte div {
    font-family: 'evelethclean_thin', 'Arial';
    font-size: 2.1vw;
    line-height: 1.1;
    display: flex;
    flex-direction: column;
    gap: 0.5vw
}

.texte div p {
    margin: 0;
}

.ql-font-monospace {
    font-family: monospace;
}

.ql-font-sans-serif {
    font-family: sans-serif;
}

.ql-font-serif {
    font-family: serif;
}

.texte div strong {
    font-family: 'evelethclean_regular', 'Arial black';
    color: inherit;
}

.texte div .ql-size-large {
    font-size: 2.8vw;
}

.texte div .ql-size-huge {
    font-size: 3.2vw;
}

.texte div .ql-size-small {
    font-size: 1.5vw;
}

.texte h1 {
    font-family: 'evelethclean_regular', 'Arial black';
    font-size: 4vw;
    line-height: 1;
}

.image>img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.qr {
    position: fixed;
    bottom: 2vw;
    right: 2vw;
    width: 10vw;
    height: 10vw;
    border: .5vw solid white;
}
</style>
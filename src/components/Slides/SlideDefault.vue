<template>
    <div :style="'background:' + props.slide.meta.backgroundColor">

        <img :src="props.slide.meta.image"
            :style="'object-fit:' + props.slide.meta.fit + ';opacity:' + props.slide.meta.opacity">

        <div class="contenu">
            <div class="image"><img :src="props.slide.meta.imagePrincipale"></div>
            <div class="texte" v-html="texte" :style="'color:' + props.slide.meta.texteColor"></div>
        </div>
    </div>
</template>
<script setup>
import { computed, ref } from 'vue'
const props = defineProps(['slide'])

const texte = computed(() => {
    return props.slide.meta.textePrincipal.replaceAll('\n','<br>');
})

</script>
<style scoped>
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
    gap:10vh;
    flex-direction: column;
    max-width: 60vw;
    left: 50%;
    transform: translateX(-50%);
}

.texte {
    text-align: center;
    font-family: 'Arial black';
    font-size: 5vw;
    line-height: 1;
}
.image > img{
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>
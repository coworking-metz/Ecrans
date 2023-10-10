<template>
    <div :style="'background:' + props.slide.meta.backgroundColor"><img :src="props.slide.meta.image" :style="'object-fit:' + props.slide.meta.fit+';opacity:' + props.slide.meta.opacity"></div>
</template>
<script setup>
const props = defineProps(['slide'])


</script>
<style scoped>
div {
    width: 100%;
    height: 100%;

}

div>img {
    width: 100%;
    height: 100%;
}
</style>
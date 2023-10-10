<template>
    <div><iframe :src="props.slide.meta.url" frameborder="no"></iframe></div>
</template>
<script setup>
const props = defineProps(['slide'])


</script>
<style scoped>
div {
    width: 100%;
    height: 100%;

}

div>iframe {
    width: 100%;
    height: 100%;
    border: none;
    overflow: hidden;
}
</style>
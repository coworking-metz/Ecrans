<template>
    <div :style="'animation: shrinkWidth '+props.duration+'s forwards linear;'">

    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps(['duration'])

const duration = computed(() => {
    props.duration
})
</script>

<style scoped>
div {
    background-color: white;
    border-top: 1px solid black;
    border-right: 1px solid black;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 1vh;
    border-top-right-radius: .5vh;
    border-bottom-right-radius: .5vh;
}
</style>
<style>
@keyframes shrinkWidth {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}
</style>
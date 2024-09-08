<template>
    <div>
        <video ref="videoElement" preload="auto" @canplaythrough="handleCanPlayThrough">
            <source :src="mp4" type="video/mp4">
            <source :src="webm" type="video/webm">
        </video>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
const props = defineProps(['slide']);
const videoElement = ref(null);

const handleCanPlayThrough = () => {
};
const mp4 = computed(() => videoUrl('mp4'))
const webm = computed(() => videoUrl('webm'))

function videoUrl(format) {
    const url = 'https://tools.sopress.dev/convertVideo/?t=4&to=' + format + '&v=' + props.slide.meta.video
    return url;
}


onMounted(() => {
    if (videoElement.value) {
        videoElement.value.currentTime = 0; // Reset video start time
        videoElement.value.volume = 0; // Initialize volume to zero
        videoElement.value.play();
    }
});

onUnmounted(() => {
    if (videoElement.value) {
        videoElement.value.pause();
    }
});
</script>

<style scoped>
div {
    width: 100%;
    height: 100%;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>

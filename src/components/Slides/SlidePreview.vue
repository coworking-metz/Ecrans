<template>
  <template v-if="props.tv">

    <div id="vintage-tv">
      <a :href="src" target="_blank" id="vintage-tv"></a>
      <span class="antenna"></span>
      <span class="screen"><iframe :src="src" frameborder="0" ref="iframe" @load="loadedIframe"></iframe></span>
      <span class="controls-1"></span>
      <span class="controls-2"></span>
    </div>
  </template>
  <template v-else>
    <div class="iframe"><iframe :src="src" frameborder="0" ref="iframe" @load="loadedIframe"></iframe></div>
  </template>
</template>
<script setup>
import { computed, onMounted, ref, reactive } from 'vue'
const props = defineProps(['slide', 'tv'])
import { useRouter, useRoute } from 'vue-router';
import { useSlidesStore } from "@/stores/slides";

const router = useRouter();
const route = useRoute();

const iframe = ref(null);
const slidesStore = useSlidesStore();

const data = reactive({
  slide: null
});


onMounted(() => {
  if (route.params.slideId) {
    data.slide = slidesStore.getSlide(route.params.slideId)
  }
})
function loadedIframe() {



  // window.bus.emit('loadedIframe', props.slide);
}
window.bus.on('updateSlidePreview', () => {
  if (iframe.value) {
    iframe.value.contentWindow.location.reload();
  }
});

const src = computed(() => {
  let slideId;
  if (data.slide) slideId = data.slide.id;
  if (props.slide) slideId = props.slide.id || props.slide;
  if (!slideId) return;
  return router.resolve({
    name: 'visionner-slide',
    params: { id: slideId },
  }).href;
})
</script>
<style scoped>
.iframe {
  position: relative;
  aspect-ratio: 16/9;
}

.iframe iframe {
  position: absolute;
  height: 100%;
  width: 100%;
}

.iframe:before {
  z-index: 1;
  content: '';
  position: absolute;
  inset: 0;
  background-color: transparent;
}

#vintage-tv .screen>iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

#vintage-tv>a {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background-color: transparent;
}

#vintage-tv {
  -moz-border-radius: 5px;
  -webkit-border-radius: 5px;
  border-radius: 5px;
  position: relative;
  display: inline-block;
  background: #464646;
  z-index: 0;
  width: 100%;
  /* height: 163px; */
  aspect-ratio: 16/10;
}

#vintage-tv:before {
  -moz-border-radius: 2px 2px 0 0;
  -webkit-border-radius: 2px;
  border-radius: 2px 2px 0 0;
  content: " ";
  position: absolute;
  display: block;
  background: #464646;
  width: 52px;
  height: 3px;
  top: -3px;
  left: 23px;
}

#vintage-tv:after {
  -moz-border-radius: 2px 2px 0 0;
  -webkit-border-radius: 2px;
  border-radius: 2px 2px 0 0;
  content: " ";
  position: absolute;
  display: block;
  background: #464646;
  width: 26px;
  height: 4px;
  top: -7px;
  left: 36px;
}

#vintage-tv .screen {
  -moz-border-radius: 3px;
  -webkit-border-radius: 3px;
  border-radius: 3px;
  -moz-box-shadow: inset 0 0 20px 0 rgba(0, 0, 0, 0.05), inset 0 0 100px 0 rgba(0, 0, 0, 0.56), inset 0 -90px 100px 0 rgba(0, 0, 0, 0.23), inset 0 90px 100px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.43);
  -webkit-box-shadow: inset 0 0 20px 0 rgba(0, 0, 0, 0.05), inset 0 0 100px 0 rgba(0, 0, 0, 0.56), inset 0 -90px 100px 0 rgba(0, 0, 0, 0.23), inset 0 90px 100px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.43);
  box-shadow: inset 0 0 20px 0 rgba(0, 0, 0, 0.05), inset 0 0 100px 0 rgba(0, 0, 0, 0.56), inset 0 -90px 100px 0 rgba(0, 0, 0, 0.23), inset 0 90px 100px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.43);
  position: absolute;
  display: block;
  background: #2e2e2e;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  top: 8px;
  left: 8px;
}

#vintage-tv .antenna:before {
  -moz-transform: rotate(-15deg);
  -ms-transform: rotate(-15deg);
  -webkit-transform: rotate(-15deg);
  transform: rotate(-15deg);
  content: " ";
  position: absolute;
  display: block;
  background: #464646;
  width: 2px;
  height: 70px;
  top: -72px;
  left: 37px;
}

#vintage-tv .antenna:after {
  -moz-transform: rotate(35deg);
  -ms-transform: rotate(35deg);
  -webkit-transform: rotate(35deg);
  transform: rotate(35deg);
  content: " ";
  position: absolute;
  display: block;
  background: #464646;
  width: 2px;
  height: 50px;
  top: -52px;
  left: 66px;
}

#vintage-tv .controls-1 {
  -moz-border-radius: 2px;
  -webkit-border-radius: 2px;
  border-radius: 2px;
  position: absolute;
  display: block;
  background: #a49870;
  width: 37px;
  height: 82px;
  top: 8px;
  left: calc(100% - (234px - 189px));
  display: none;
}

#vintage-tv .controls-1:before {
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 50%;
  -moz-box-shadow: 0 38px 0 0 #eae9e9, 2px 40px 2px 0 #8a7e58, 2px 2px 2px 0 #8a7e58;
  -webkit-box-shadow: 0 38px 0 0 #eae9e9, 2px 40px 2px 0 #8a7e58, 2px 2px 2px 0 #8a7e58;
  box-shadow: 0 38px 0 0 #eae9e9, 2px 40px 2px 0 #8a7e58, 2px 2px 2px 0 #8a7e58;
  content: " ";
  position: absolute;
  display: block;
  background: #eae9e9;
  z-index: 1;
  width: 23px;
  height: 23px;
  top: 10px;
  left: 7px;
}

#vintage-tv .controls-1:after {
  -moz-transform: rotate(40deg);
  -ms-transform: rotate(40deg);
  -webkit-transform: rotate(40deg);
  transform: rotate(40deg);
  -moz-box-shadow: 24px 29px 0 0 #f4f5f5, 26px 29px 0 0 #e1e4e4, 2px 0 0 0 #e1e4e4;
  -webkit-box-shadow: 24px 29px 0 0 #f4f5f5, 26px 29px 0 0 #e1e4e4, 2px 0 0 0 #e1e4e4;
  box-shadow: 24px 29px 0 0 #f4f5f5, 26px 29px 0 0 #e1e4e4, 2px 0 0 0 #e1e4e4;
  content: " ";
  position: absolute;
  display: block;
  background: #f4f5f5;
  z-index: 10;
  width: 3px;
  height: 25px;
  top: 9px;
  left: 17px;
}

#vintage-tv .controls-2 {
  -moz-border-radius: 2px;
  -webkit-border-radius: 2px;
  border-radius: 2px;
  position: absolute;
  display: block;
  background: #a49870;
  width: 37px;
  height: 57px;
  top: 98px;
  left: calc(100% - (234px - 189px));
  display: none;
}

#vintage-tv .controls-2:before {
  -moz-border-radius: 50%;
  -webkit-border-radius: 50%;
  border-radius: 50%;
  content: " ";
  position: absolute;
  display: block;
  background: #444138;
  width: 17px;
  height: 31px;
  top: 13px;
  left: 10px;
}

#vintage-tv .controls-2:after {
  -moz-box-shadow: 0 3px 0 0 #aea178, 0 6px 0 0 #aea178, 0 9px 0 0 #aea178, 0 12px 0 0 #aea178, 0 15px 0 0 #aea178, 0 18px 0 0 #aea178, 0 21px 0 0 #aea178, 0 24px 0 0 #aea178, 0 27px 0 0 #aea178, 0 30px 0 0 #aea178, 0 33px 0 0 #aea178, 0 36px 0 0 #aea178, 0 39px 0 0 #aea178, 0 42px 0 0 #aea178, 0 45px 0 0 #aea178, 0 48px 0 0 #aea178, 0 51px 0 0 #aea178;
  -webkit-box-shadow: 0 3px 0 0 #aea178, 0 6px 0 0 #aea178, 0 9px 0 0 #aea178, 0 12px 0 0 #aea178, 0 15px 0 0 #aea178, 0 18px 0 0 #aea178, 0 21px 0 0 #aea178, 0 24px 0 0 #aea178, 0 27px 0 0 #aea178, 0 30px 0 0 #aea178, 0 33px 0 0 #aea178, 0 36px 0 0 #aea178, 0 39px 0 0 #aea178, 0 42px 0 0 #aea178, 0 45px 0 0 #aea178, 0 48px 0 0 #aea178, 0 51px 0 0 #aea178;
  box-shadow: 0 3px 0 0 #aea178, 0 6px 0 0 #aea178, 0 9px 0 0 #aea178, 0 12px 0 0 #aea178, 0 15px 0 0 #aea178, 0 18px 0 0 #aea178, 0 21px 0 0 #aea178, 0 24px 0 0 #aea178, 0 27px 0 0 #aea178, 0 30px 0 0 #aea178, 0 33px 0 0 #aea178, 0 36px 0 0 #aea178, 0 39px 0 0 #aea178, 0 42px 0 0 #aea178, 0 45px 0 0 #aea178, 0 48px 0 0 #aea178, 0 51px 0 0 #aea178;
  content: " ";
  position: absolute;
  display: block;
  background: #aea178;
  width: 37px;
  height: 1px;
  top: 3px;
  left: 0;
}
</style>
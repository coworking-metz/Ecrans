<template>
  <button  @click="choisir" class="slidePreview" :data-selected="props.selected" ref="bouton" :data-id="slide.id">
    <template v-if="props.slide.type == 'url'">
    </template>
    <template v-else>
      <img :src="src">
    </template>
    <span>{{ props.slide.name }}</span>
  </button>
</template>
<script setup>
import { computed, ref } from 'vue'
const props = defineProps(['slide', 'tv', 'selected'])
import supabase from "@/supabase";


const bouton = ref(null);

function dragstart(e){
  window.bus.emit('drag-start', e)
}
function dragend(e){
  window.bus.emit('drag-end', e)
}

const src = computed(() => {
  const { data } = supabase
    .storage
    .from('apercus')
    .getPublicUrl(props.slide.id + '.png');
  return supabaseMediaUrl(data.publicUrl);
})

function choisir() {
  window.bus.emit('choisir-slide',props.slide);
}
</script>
<style scoped>
.slidePreview {
  cursor: pointer;
  border: 1px solid black;
  position: relative;
  width:100%;
  aspect-ratio: 16/9;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: black;
}

.slidePreview[data-selected="true"] {
  border: 1px solid var(--orange);
}
.slidePreview>img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  object-fit: cover;
  opacity: .5;
}

.slidePreview>span {
  position: relative;
  z-index: 1;
  color: white;
  font-weight: bold;
}
</style>
<template>
    <div class="field">
        <label class="label">Url de la page à afficher</label>
        <p class="control has-icons-left">
            <input class="input" type="url" placeholder="Url de la page" v-model="data.meta.url" @input="setSlideMeta">
            <span class="icon is-small is-left">
                <i class="fas fa-globe"></i>
            </span>
        </p>
    </div>
</template>
<script setup>
import { reactive, defineProps, onMounted } from 'vue'
const props = defineProps(['slide'])

const data = reactive({ meta: { url: '' } });
onMounted(() => {
    data.meta.url = props.slide?.meta?.url || ''
})

function setSlideMeta() {
    window.bus.emit('setSlideMeta', data.meta)
}
</script>
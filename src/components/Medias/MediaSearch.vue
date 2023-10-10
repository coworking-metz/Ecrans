<template>
    <div class="field mt-5">
        <p class="control has-icons-right is-expanded">
            <input v-model="data.search" class="input" type="text" placeholder="Trouver un fichier media" @input="">
            <span class="icon is-small is-right">
                <i class="fas fa-search"></i>
            </span>
        </p>
    </div>
</template>
<script setup>
import { watch, reactive } from 'vue';


const data = reactive({
    search: ''
})

watch(() => data.search, (newVal, oldVal) => {
    window.bus.emit('searchMedia', newVal);
});
</script>
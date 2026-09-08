<script setup>
import { useMessages } from "@/composables/messages.js";

const { messages, retirer } = useMessages();

function declencher(msg) {
  retirer(msg.id);
  msg.action.onClick();
}
</script>

<template>
  <Teleport to="body">
    <div id="messages">
      <TransitionGroup name="message">
        <div v-for="msg in messages" :key="msg.id" class="notification" :class="`is-${msg.ton}`">
          <button class="delete" type="button" @click="retirer(msg.id)"></button>
          <span>{{ msg.texte }}</span>
          <button
            v-if="msg.action"
            class="button is-small is-white ml-3"
            type="button"
            @click="declencher(msg)"
          >
            {{ msg.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.message-enter-active,
.message-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.message-enter-from,
.message-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>

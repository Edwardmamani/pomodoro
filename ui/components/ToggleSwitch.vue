<template>
  <button
    type="button"
    class="w-8 h-4 rounded-full relative cursor-pointer flex items-center p-0.5 transition-colors"
    :class="modelValue ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'"
    role="switch"
    :aria-checked="modelValue"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <div class="w-3 h-3 bg-on-primary rounded-full shadow-xs"></div>
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="font-body-sm text-on-surface">{{ label }}</span>
    <div
      class="flex items-center gap-2 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/30"
    >
      <button
        type="button"
        class="text-outline hover:text-primary transition-colors text-[14px] flex items-center"
        @click="$emit('dec')"
      >
        -
      </button>
      <span
        class="font-label-mono text-primary font-medium px-1"
        >{{ String(value).padStart(2, '0') }} min</span
      >
      <button
        type="button"
        class="text-outline hover:text-primary transition-colors text-[14px] flex items-center"
        @click="$emit('inc')"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: Number
})
defineEmits(['dec', 'inc'])
</script>

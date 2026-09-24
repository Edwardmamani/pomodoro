<template>
  <span
    v-if="status === 'in_progress'"
    class="material-symbols-outlined leading-none"
    :style="iconStyle"
    >play_arrow</span
  >
  <span
    v-else-if="status === 'done'"
    class="material-symbols-outlined leading-none"
    :style="{ fontSize: size + 'px' }"
    >check</span
  >
  <span
    v-else-if="status === 'cancelled'"
    class="material-symbols-outlined leading-none"
    :style="{ fontSize: size + 'px' }"
    >close</span
  >
  <svg
    v-else-if="status === 'blocked'"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    class="block"
    aria-hidden="true"
  >
    <circle
      cx="8"
      cy="8"
      r="5.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-dasharray="2.5 2"
    />
  </svg>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    class="block"
    aria-hidden="true"
  >
    <circle
      cx="8"
      cy="8"
      r="5.5"
      stroke="currentColor"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  size: { type: Number, default: 14 }
})

const iconStyle = computed(() => ({
  fontSize: `${props.size}px`,
  fontVariationSettings: "'FILL' 1"
}))
</script>

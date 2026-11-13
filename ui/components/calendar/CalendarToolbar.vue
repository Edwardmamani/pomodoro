<template>
  <div class="flex flex-col gap-3 shrink-0">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
        <h2 class="font-headline-md text-on-surface tracking-tight">Calendario</h2>
      </div>
      <div class="flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/40">
        <button
          v-for="m in modes" :key="m.id" type="button"
          class="px-2.5 py-1 rounded-md text-[11px] font-label-md transition-colors cursor-pointer"
          :class="viewMode === m.id ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'"
          @click="emit('update:viewMode', m.id)"
        >{{ m.label }}</button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 bg-surface-container rounded-xl px-2.5 py-1.5">
      <div class="flex items-center gap-1">
        <button type="button" class="w-7 h-7 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer" title="Anterior" @click="emit('navigate', -1)">
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <button type="button" class="px-2 py-1 rounded-lg hover:bg-surface-container-high text-[11px] font-label-mono-sm text-primary cursor-pointer" @click="emit('today')">Hoy</button>
        <button type="button" class="w-7 h-7 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center cursor-pointer" title="Siguiente" @click="emit('navigate', 1)">
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
      <span class="font-label-md text-[12px] text-on-surface truncate capitalize">{{ title }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  viewMode: { type: String, required: true },
  title: { type: String, required: true }
})
const emit = defineEmits(['update:viewMode', 'navigate', 'today'])
const modes = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' }
]
</script>

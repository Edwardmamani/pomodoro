<template>
  <div class="flex flex-wrap items-center gap-1.5 shrink-0">
    <div class="relative flex-1 min-w-[110px]">
      <span class="material-symbols-outlined absolute left-2 top-1.5 text-[14px] text-outline pointer-events-none">label</span>
      <select
        :value="modelValue.tag"
        class="w-full h-7 pl-6 pr-2 rounded-lg bg-surface-container border border-outline-variant/30 text-[11px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
        aria-label="Filtrar por etiqueta"
        @change="update('tag', $event.target.value)"
      >
        <option value="">Todas las etiquetas</option>
        <option v-for="t in tags" :key="t" :value="t">#{{ t }}</option>
      </select>
    </div>

    <div class="flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/30">
      <button
        v-for="opt in routineOpts" :key="opt.id" type="button"
        class="px-2 py-0.5 rounded-md text-[10.5px] font-label-md transition-colors cursor-pointer"
        :class="modelValue.routineType === opt.id ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:text-on-surface'"
        @click="update('routineType', opt.id)"
      >{{ opt.label }}</button>
    </div>

    <button
      type="button"
      class="h-7 px-2 rounded-lg border text-[10.5px] font-label-md inline-flex items-center gap-1 transition-colors cursor-pointer"
      :class="modelValue.showCompleted ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface'"
      :title="modelValue.showCompleted ? 'Ocultar tareas completadas' : 'Mostrar tareas completadas'"
      @click="update('showCompleted', !modelValue.showCompleted)"
    >
      <span class="material-symbols-outlined text-[13px]">{{ modelValue.showCompleted ? 'check_circle' : 'visibility_off' }}</span>
      <span>Completadas</span>
    </button>

    <button
      v-if="hasFilters" type="button"
      class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center cursor-pointer"
      title="Limpiar filtros"
      @click="emit('reset')"
    >
      <span class="material-symbols-outlined text-[14px]">filter_alt_off</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  tags: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'reset'])
const routineOpts = [
  { id: 'all', label: 'Todas' },
  { id: 'routine', label: 'Rutinas' },
  { id: 'non_routine', label: 'Normales' }
]
const hasFilters = computed(() => Boolean(props.modelValue.tag || props.modelValue.routineType !== 'all' || !props.modelValue.showCompleted))
const update = (key, val) => emit('update:modelValue', { ...props.modelValue, [key]: val })
</script>

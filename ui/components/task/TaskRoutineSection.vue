<template>
  <div class="p-3.5 rounded-xl bg-[#242426] border border-white/10 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <span class="material-symbols-outlined text-[18px]">cached</span>
        </div>
        <div class="flex flex-col">
          <span class="text-white text-[13px] font-medium leading-tight">Tarea rutinaria</span>
          <span class="text-on-surface-variant text-[11px] leading-tight">Repetir según días de la semana</span>
        </div>
      </div>
      <ToggleSwitch v-model="form.is_routine" />
    </div>

    <div v-if="form.is_routine" class="flex flex-col gap-2.5 pt-2.5 border-t border-white/5">
      <div class="flex items-center justify-between">
        <span class="font-label-mono-sm text-on-surface-variant text-[11px] uppercase tracking-wider">Días activos</span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="px-2 py-0.5 rounded-md text-[10px] font-label-mono-sm transition-colors border border-white/10 hover:border-white/20 cursor-pointer"
            :class="isWeekdaysSelected ? 'bg-primary/20 text-primary border-primary/40 font-medium' : 'text-on-surface-variant hover:text-white'"
            @click="form.days_of_week = [1, 2, 3, 4, 5]"
          >Lun a Vie</button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md text-[10px] font-label-mono-sm transition-colors border border-white/10 hover:border-white/20 cursor-pointer"
            :class="isAllDaysSelected ? 'bg-primary/20 text-primary border-primary/40 font-medium' : 'text-on-surface-variant hover:text-white'"
            @click="form.days_of_week = [1, 2, 3, 4, 5, 6, 7]"
          >Todos</button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1.5">
        <button
          v-for="d in WEEK_DAYS"
          :key="d.id"
          type="button"
          class="h-8 rounded-lg font-label-mono text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
          :class="form.days_of_week.includes(d.id)
            ? 'bg-primary text-on-primary shadow-sm ring-1 ring-white/20 font-bold'
            : 'bg-[#1a1a1c] text-on-surface-variant hover:text-white hover:bg-white/10 border border-white/10'"
          :title="d.name"
          @click="toggleDay(d.id)"
        >{{ d.label }}</button>
      </div>

      <span class="text-[11px] text-outline font-body-sm">{{ routineDaysSummary }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const WEEK_DAYS = [
  { id: 1, label: 'L', name: 'Lunes' },
  { id: 2, label: 'M', name: 'Martes' },
  { id: 3, label: 'X', name: 'Miércoles' },
  { id: 4, label: 'J', name: 'Jueves' },
  { id: 5, label: 'V', name: 'Viernes' },
  { id: 6, label: 'S', name: 'Sábado' },
  { id: 7, label: 'D', name: 'Domingo' }
]

const props = defineProps({ form: { type: Object, required: true } })

function toggleDay(id) {
  const idx = props.form.days_of_week.indexOf(id)
  if (idx >= 0) props.form.days_of_week.splice(idx, 1)
  else { props.form.days_of_week.push(id); props.form.days_of_week.sort((a, b) => a - b) }
}

const isWeekdaysSelected = computed(() => props.form.days_of_week.length === 5 && [1, 2, 3, 4, 5].every((v) => props.form.days_of_week.includes(v)))
const isAllDaysSelected = computed(() => props.form.days_of_week.length === 7)
const routineDaysSummary = computed(() => {
  if (!props.form.days_of_week.length) return 'Selecciona al menos un día'
  if (isAllDaysSelected.value) return 'Todos los días de la semana'
  if (isWeekdaysSelected.value) return 'Lunes a Viernes (días laborables)'
  return props.form.days_of_week.map((id) => WEEK_DAYS.find((w) => w.id === id)?.name).filter(Boolean).join(', ')
})
</script>

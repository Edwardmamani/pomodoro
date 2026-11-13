<template>
  <div class="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
    <div
      v-for="day in weekDays" :key="day.iso"
      class="rounded-xl border p-2.5 transition-colors"
      :class="day.isToday ? 'bg-primary/8 border-primary/40' : 'bg-surface-container/60 border-outline-variant/25'"
    >
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <button type="button" class="flex items-center gap-2 text-left cursor-pointer hover:text-primary transition-colors" @click="emit('open-day', day.iso)">
          <span class="font-label-mono-sm text-[11px] uppercase" :class="day.isToday ? 'text-primary font-semibold' : 'text-on-surface-variant'">
            {{ WEEK_NAMES[day.weekday - 1] }} {{ day.dayNum }}
          </span>
          <span v-if="day.isToday" class="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-label-mono-sm">HOY</span>
        </button>
        <div class="flex items-center gap-1.5">
          <span class="font-label-mono-sm text-[10px] text-outline">{{ tasksFor(day.iso).length }}</span>
          <button type="button" class="w-5 h-5 rounded hover:bg-surface-container-high text-outline hover:text-primary flex items-center justify-center cursor-pointer" title="Añadir tarea" @click="emit('add-task', day.iso)">
            <span class="material-symbols-outlined text-[14px]">add</span>
          </button>
        </div>
      </div>

      <div v-if="tasksFor(day.iso).length" class="flex flex-col gap-1">
        <button
          v-for="t in tasksFor(day.iso)" :key="t.id" type="button"
          class="w-full text-left px-2 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center gap-2 cursor-pointer transition-colors"
          :class="{ 'opacity-55': t.status === 'done' || t.status === 'cancelled' }"
          @click="emit('select-task', t)"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="PriorityScoreHelper.dotClass(t.priority_score)"></span>
          <span class="text-[12px] text-on-surface truncate flex-1" :class="{ 'line-through': t.status === 'done' }">{{ t.title }}</span>
          <span v-if="t.is_routine" class="material-symbols-outlined text-[12px] text-primary shrink-0">cached</span>
        </button>
      </div>
      <p v-else class="text-[11px] text-outline/60 px-1">Sin tareas</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWeekDays } from '@/lib/calendar-dates'
import { PriorityScoreHelper } from '@/lib/priority-score'

const props = defineProps({
  anchorDate: { type: String, required: true },
  today: { type: String, required: true },
  byDate: { type: Map, required: true }
})
const emit = defineEmits(['select-task', 'add-task', 'open-day'])
const WEEK_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const weekDays = computed(() => getWeekDays(props.anchorDate, props.today))
const tasksFor = (iso) => props.byDate.get(iso) || []
</script>

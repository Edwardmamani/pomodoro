<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <div class="grid grid-cols-7 gap-1 pb-1.5 shrink-0">
      <span v-for="w in WEEK_HDR" :key="w" class="text-center font-label-mono-sm text-[10px] text-outline uppercase">{{ w }}</span>
    </div>

    <div class="grid grid-cols-7 auto-rows-fr gap-1 flex-1 min-h-0 overflow-y-auto">
      <div
        v-for="cell in gridDays" :key="cell.iso"
        class="group rounded-lg border p-1 flex flex-col min-h-[64px] overflow-hidden transition-colors cursor-pointer"
        :class="[
          cell.isToday ? 'bg-primary/10 border-primary/50' : 'bg-surface-container/50 border-outline-variant/20 hover:bg-surface-container',
          !cell.inMonth ? 'opacity-40' : ''
        ]"
        @click="emit('open-day', cell.iso)"
      >
        <div class="flex items-center justify-between gap-0.5 mb-0.5 shrink-0">
          <span class="font-label-mono-sm text-[10.5px] leading-none px-1 py-0.5 rounded" :class="cell.isToday ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant'">
            {{ cell.dayNum }}
          </span>
          <button
            type="button"
            class="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-white/10 text-outline hover:text-primary flex items-center justify-center transition-opacity cursor-pointer"
            title="Añadir tarea"
            @click.stop="emit('add-task', cell.iso)"
          >
            <span class="material-symbols-outlined text-[12px]">add</span>
          </button>
        </div>

        <div class="flex flex-col gap-0.5 min-h-0 overflow-hidden">
          <button
            v-for="t in tasksFor(cell.iso).slice(0, 2)" :key="t.id" type="button"
            class="w-full text-left px-1 py-0.5 rounded bg-surface-container-high/80 hover:bg-surface-container-highest flex items-center gap-1 cursor-pointer"
            :class="{ 'opacity-50 line-through': t.status === 'done' }"
            @click.stop="emit('select-task', t)"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="PriorityScoreHelper.dotClass(t.priority_score)"></span>
            <span class="text-[10px] text-on-surface truncate">{{ t.title }}</span>
          </button>
          <span v-if="tasksFor(cell.iso).length > 2" class="text-[9.5px] font-label-mono-sm text-primary px-1">
            +{{ tasksFor(cell.iso).length - 2 }} más
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getMonthGridDays } from '@/lib/calendar-dates'
import { PriorityScoreHelper } from '@/lib/priority-score'

const props = defineProps({
  anchorDate: { type: String, required: true },
  today: { type: String, required: true },
  byDate: { type: Map, required: true }
})
const emit = defineEmits(['select-task', 'add-task', 'open-day'])
const WEEK_HDR = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const gridDays = computed(() => getMonthGridDays(props.anchorDate, props.today))
const tasksFor = (iso) => props.byDate.get(iso) || []
</script>

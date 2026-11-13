<template>
  <div class="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-0.5">
    <div class="flex items-center justify-between px-1 shrink-0">
      <span class="font-label-mono-sm text-outline uppercase tracking-wider">
        {{ dayTasks.length }} {{ dayTasks.length === 1 ? 'tarea' : 'tareas' }} · {{ doneCount }} completada{{ doneCount === 1 ? '' : 's' }}
      </span>
      <button type="button" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-[11px] font-label-md cursor-pointer transition-colors" @click="emit('add-task', anchorDate)">
        <span class="material-symbols-outlined text-[14px]">add</span>Añadir
      </button>
    </div>

    <div v-if="!dayTasks.length" class="rounded-xl border border-dashed border-outline-variant/50 p-6 text-center text-on-surface-variant font-body-sm">
      No hay tareas programadas para este día.
    </div>

    <button
      v-for="t in dayTasks" :key="t.id" type="button"
      class="w-full text-left rounded-xl p-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 transition-colors cursor-pointer flex items-start gap-2.5"
      :class="{ 'opacity-60': t.status === 'done' || t.status === 'cancelled' }"
      @click="emit('select-task', t)"
    >
      <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" :class="PriorityScoreHelper.dotClass(t.priority_score)"></span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <span class="font-body-md text-on-surface truncate" :class="{ 'line-through': t.status === 'done' }">{{ t.title }}</span>
          <span v-if="t.is_routine" class="material-symbols-outlined text-[14px] text-primary shrink-0" :title="t.is_projected ? 'Rutina proyectada' : 'Rutina'">cached</span>
        </div>
        <div class="flex items-center gap-2 mt-1 text-[11px] font-label-mono-sm text-on-surface-variant flex-wrap">
          <span>{{ statusLabel(t.status) }}</span>
          <span v-if="t.accumulated_ms">· {{ formatAccumulated(t.accumulated_ms) }}</span>
          <span v-for="tag in (t.tags || []).slice(0, 3)" :key="tag" class="px-1.5 py-0.2 rounded bg-white/5 text-on-surface-variant">#{{ tag }}</span>
        </div>
      </div>
    </button>

    <div v-if="unscheduled.length" class="pt-2 mt-1 border-t border-outline-variant/30">
      <button type="button" class="w-full flex items-center justify-between px-1 py-1 text-outline hover:text-on-surface cursor-pointer" @click="showUnscheduled = !showUnscheduled">
        <span class="font-label-mono-sm uppercase tracking-wider">Sin fecha ({{ unscheduled.length }})</span>
        <span class="material-symbols-outlined text-[16px]">{{ showUnscheduled ? 'expand_less' : 'expand_more' }}</span>
      </button>
      <div v-if="showUnscheduled" class="flex flex-col gap-1.5 mt-2">
        <button
          v-for="t in unscheduled" :key="t.id" type="button"
          class="w-full text-left rounded-lg px-2.5 py-2 bg-surface-container/60 hover:bg-surface-container flex items-center gap-2 cursor-pointer"
          @click="emit('select-task', t)"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="PriorityScoreHelper.dotClass(t.priority_score)"></span>
          <span class="text-[12px] text-on-surface truncate flex-1">{{ t.title }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PriorityScoreHelper } from '@/lib/priority-score'
import { formatAccumulated } from '@/lib/format-accumulated'

const props = defineProps({
  anchorDate: { type: String, required: true },
  byDate: { type: Map, required: true },
  unscheduled: { type: Array, default: () => [] }
})
const emit = defineEmits(['select-task', 'add-task'])
const showUnscheduled = ref(false)
const dayTasks = computed(() => props.byDate.get(props.anchorDate) || [])
const doneCount = computed(() => dayTasks.value.filter((t) => t.status === 'done').length)
const LABELS = { todo: 'Pendiente', in_progress: 'En progreso', blocked: 'Bloqueada', done: 'Completada', cancelled: 'Cancelada' }
const statusLabel = (s) => LABELS[s] || s
</script>

<template>
  <Teleport to="body">
    <div v-if="task" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md" @click.self="emit('close')" @keydown.escape="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1e20] shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true">
        <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#252528]/80">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="PriorityScoreHelper.dotClass(task.priority_score)"></span>
            <h3 class="font-headline-md text-[16px] text-white truncate">{{ task.title }}</h3>
          </div>
          <button type="button" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-on-surface-variant hover:text-white flex items-center justify-center cursor-pointer shrink-0" @click="emit('close')">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div class="p-5 flex flex-col gap-3 text-[13px] text-on-surface-variant">
          <div class="flex items-center justify-between">
            <span>Estado</span>
            <span class="px-2 py-0.5 rounded-md bg-white/8 text-on-surface font-label-mono-sm text-[11px]">{{ statusLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Fecha programada</span>
            <span class="text-on-surface font-label-mono-sm">{{ task.due_date || 'Sin fecha' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Prioridad</span>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-label-mono-sm" :class="PriorityScoreHelper.chipClass(task.priority_score)">
              Score {{ task.priority_score ?? '—' }}
            </span>
          </div>
          <div v-if="!task.is_projected" class="flex items-center justify-between">
            <span>Tiempo acumulado</span>
            <span class="text-on-surface font-label-mono-sm">{{ formatAccumulated(task.accumulated_ms || 0) }}</span>
          </div>
          <div v-if="task.is_routine" class="flex items-center justify-between">
            <span>Rutina</span>
            <span class="text-primary font-label-mono-sm text-[11px]">{{ TaskCardHelper.daysSummaryLabel(task.days_of_week) }}</span>
          </div>
          <div v-if="task.tags?.length" class="flex flex-wrap gap-1.5 pt-1">
            <span v-for="tag in task.tags" :key="tag" class="px-2 py-0.5 rounded-full bg-white/8 text-on-surface text-[11px]">#{{ tag }}</span>
          </div>
        </div>

        <div class="px-5 py-3.5 border-t border-white/10 flex items-center justify-end gap-2 bg-[#1a1a1c]">
          <button v-if="!task.is_projected" type="button" class="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[12px] font-label-md flex items-center gap-1.5 cursor-pointer" @click="emit('activate', task.id)">
            <span class="material-symbols-outlined text-[15px]">play_arrow</span>Enfocar
          </button>
          <button v-if="!task.is_projected" type="button" class="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[12px] font-label-md flex items-center gap-1.5 cursor-pointer" @click="emit('notes', task.id)">
            <span class="material-symbols-outlined text-[15px]">description</span>Notas
          </button>
          <button type="button" class="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-fixed-dim text-white text-[12px] font-label-md flex items-center gap-1.5 cursor-pointer" @click="emit('edit', task)">
            <span class="material-symbols-outlined text-[15px]">edit</span>Editar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { PriorityScoreHelper } from '@/lib/priority-score'
import { TaskCardHelper } from '@/lib/task-card-helper'
import { formatAccumulated } from '@/lib/format-accumulated'

const props = defineProps({ task: { type: Object, default: null } })
const emit = defineEmits(['close', 'edit', 'notes', 'activate'])
const LABELS = { todo: 'Pendiente', in_progress: 'En progreso', blocked: 'Bloqueada', done: 'Completada', cancelled: 'Cancelada' }
const statusLabel = computed(() => (props.task?.is_projected ? 'Rutina programada' : LABELS[props.task?.status] || props.task?.status))
</script>

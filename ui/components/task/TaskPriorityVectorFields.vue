<template>
  <div class="p-3.5 rounded-xl bg-[#242426] border border-white/10 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="font-label-mono text-primary font-semibold text-[13px]">Vector de Prioridad</span>
        <span class="font-label-mono-sm text-on-surface-variant text-[11px]">t⃗ = [I, U, E, D, R]</span>
      </div>
      <div class="px-2.5 py-1 rounded-full font-label-mono text-xs font-semibold flex items-center gap-1.5" :class="badgeClass">
        <span>Puntaje P:</span>
        <span class="text-[13px] font-bold">{{ score.toFixed(2) }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2.5 pt-1">
      <div v-for="field in FIELDS" :key="field.key" class="flex items-center justify-between text-xs" :class="field.hidden ? 'hidden' : ''">
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="text-white font-medium">{{ field.title }}</span>
            <span v-if="field.dynamic" class="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-primary/20 text-primary border border-primary/30">Dinámica</span>
          </div>
          <span class="text-on-surface-variant text-[10px]">{{ field.dynamic ? urgencyHint : field.subtitle }}</span>
        </div>
        <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
          <button
            v-for="val in [1, 2, 3, 4, 5]"
            :key="`${field.key}-${val}`"
            type="button"
            class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
            :class="form[field.key] === val ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
            @click="form[field.key] = val"
          >{{ val }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getUrgencyHint } from '@/lib/urgency'
import { TaskFormController } from '@/lib/task-form-controller'

const FIELDS = [
  { key: 'impact', title: 'I · Impacto', subtitle: 'Valor aportado' },
  { key: 'urgency', title: 'U · Urgencia', dynamic: true, hidden: true },
  { key: 'effort', title: 'E · Esfuerzo', subtitle: 'Tiempo y recursos requeridos' },
  { key: 'dependencies', title: 'D · Dependencias', subtitle: 'Otras tareas bloqueadas por esta' },
  { key: 'risk', title: 'R · Riesgo', subtitle: 'Consecuencias de postergar' }
]

const props = defineProps({ form: { type: Object, required: true } })
const score = computed(() => TaskFormController.calculateScore(props.form))
const badgeClass = computed(() => TaskFormController.scoreBadgeClass(score.value))
const urgencyHint = computed(() => getUrgencyHint(props.form.due_date))
</script>

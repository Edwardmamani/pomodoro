<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
      role="presentation"
      @click.self="close"
      @keydown.escape="close"
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1e1e20] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <!-- Apple Sheet Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252528]/80 shrink-0"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-medium"
            >
              <span class="material-symbols-outlined text-[18px]">add_task</span>
            </div>
            <h2
              id="task-form-title"
              class="font-headline-md text-[18px] text-white tracking-tight"
            >
              Nueva tarea
            </h2>
          </div>
          <button
            type="button"
            class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-on-surface-variant hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar"
            @click="close"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form class="px-6 py-4 flex flex-col gap-4 overflow-y-auto min-h-0" @submit.prevent="submit">
          <!-- Título -->
          <label class="flex flex-col gap-1.5">
            <span class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]"
              >Título de la tarea</span
            >
            <input
              ref="titleInput"
              v-model="form.title"
              type="text"
              required
              maxlength="200"
              placeholder="¿Qué vas a realizar?"
              class="h-10 px-3.5 rounded-xl bg-[#28282b] border border-white/10 text-white font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
            />
          </label>

          <!-- Vector de Priorización Apple HIG -->
          <div class="p-3.5 rounded-xl bg-[#242426] border border-white/10 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-label-mono text-primary font-semibold text-[13px]">Vector de Prioridad</span>
                <span class="font-label-mono-sm text-on-surface-variant text-[11px]">t⃗ = [I, U, E, D, R]</span>
              </div>
              <div
                class="px-2.5 py-1 rounded-full font-label-mono text-xs font-semibold flex items-center gap-1.5"
                :class="scoreBadgeClass"
              >
                <span>Puntaje P:</span>
                <span class="text-[13px] font-bold">{{ computedScore.toFixed(2) }}</span>
              </div>
            </div>

            <!-- Formula display -->
            <div class="hidden px-3 py-1.5 rounded-lg bg-black/30 border border-white/5 font-label-mono-sm text-on-surface-variant text-[11px] flex items-center justify-between">
              <span>Fórmula: P = (I×U + D×R) / E</span>
              <span class="text-white/90">
                ({{ form.impact }}×{{ form.urgency }} + {{ form.dependencies }}×{{ form.risk }}) / {{ form.effort }}
              </span>
            </div>

            <!-- 5 Variables Steppers / Segmented controls -->
            <div class="flex flex-col gap-2.5 pt-1">
              <!-- Impacto -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex flex-col">
                  <span class="text-white font-medium">I · Impacto</span>
                  <span class="text-on-surface-variant text-[10px]">Valor aportado</span>
                </div>
                <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
                  <button
                    v-for="val in [1, 2, 3, 4, 5]"
                    :key="'i-' + val"
                    type="button"
                    class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
                    :class="form.impact === val ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                    @click="form.impact = val"
                  >{{ val }}</button>
                </div>
              </div>

              <!-- Urgencia (Dinámica según fecha de finalización) -->
              <div class="flex items-center justify-between text-xs hidden">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span class="text-white font-medium">U · Urgencia</span>
                    <span class="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-primary/20 text-primary border border-primary/30">
                      Dinámica
                    </span>
                  </div>
                  <span class="text-on-surface-variant text-[10px]">{{ urgencyHint }}</span>
                </div>
                <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
                  <button
                    v-for="val in [1, 2, 3, 4, 5]"
                    :key="'u-' + val"
                    type="button"
                    class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
                    :class="form.urgency === val ? 'bg-primary text-white shadow-sm ring-1 ring-white/20' : 'text-on-surface-variant hover:text-white'"
                    :title="form.due_date ? 'Calculada automáticamente según fecha de finalización' : 'Sin fecha límite'"
                    @click="form.urgency = val"
                  >{{ val }}</button>
                </div>
              </div>

              <!-- Esfuerzo (Denominador E >= 1) -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex flex-col">
                  <span class="text-white font-medium">E · Esfuerzo</span>
                  <span class="text-on-surface-variant text-[10px]">Tiempo y recursos requeridos</span>
                </div>
                <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
                  <button
                    v-for="val in [1, 2, 3, 4, 5]"
                    :key="'e-' + val"
                    type="button"
                    class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
                    :class="form.effort === val ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                    @click="form.effort = val"
                  >{{ val }}</button>
                </div>
              </div>

              <!-- Dependencias -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex flex-col">
                  <span class="text-white font-medium">D · Dependencias</span>
                  <span class="text-on-surface-variant text-[10px]">Otras tareas bloqueadas por esta</span>
                </div>
                <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
                  <button
                    v-for="val in [1, 2, 3, 4, 5]"
                    :key="'d-' + val"
                    type="button"
                    class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
                    :class="form.dependencies === val ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                    @click="form.dependencies = val"
                  >{{ val }}</button>
                </div>
              </div>

              <!-- Riesgo -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex flex-col">
                  <span class="text-white font-medium">R · Riesgo</span>
                  <span class="text-on-surface-variant text-[10px]">Consecuencias de postergar</span>
                </div>
                <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
                  <button
                    v-for="val in [1, 2, 3, 4, 5]"
                    :key="'r-' + val"
                    type="button"
                    class="w-7 h-6 rounded-md font-label-mono-sm text-xs font-medium transition-colors"
                    :class="form.risk === val ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                    @click="form.risk = val"
                  >{{ val }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Fecha límite -->
          <label class="flex flex-col gap-1.5">
            <span class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]"
              >Fecha de finalización</span
            >
            <div class="relative">
              <span
                class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant pointer-events-none"
                >event</span
              >
              <input
                v-model="form.due_date"
                type="date"
                class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#28282b] border border-white/10 text-white font-body-sm focus:outline-none focus:border-primary [color-scheme:dark]"
              />
            </div>
          </label>

          <!-- Tarea rutinaria (Repetitiva) -->
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
                <span class="font-label-mono-sm text-on-surface-variant text-[11px] uppercase tracking-wider">
                  Días activos
                </span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md text-[10px] font-label-mono-sm transition-colors border border-white/10 hover:border-white/20 cursor-pointer"
                    :class="isWeekdaysSelected ? 'bg-primary/20 text-primary border-primary/40 font-medium' : 'text-on-surface-variant hover:text-white'"
                    @click="selectWeekdays"
                  >
                    Lun a Vie
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md text-[10px] font-label-mono-sm transition-colors border border-white/10 hover:border-white/20 cursor-pointer"
                    :class="isAllDaysSelected ? 'bg-primary/20 text-primary border-primary/40 font-medium' : 'text-on-surface-variant hover:text-white'"
                    @click="selectAllDays"
                  >
                    Todos
                  </button>
                </div>
              </div>

              <!-- Selector de días L, M, X, J, V, S, D -->
              <div class="grid grid-cols-7 gap-1.5">
                <button
                  v-for="d in WEEK_DAYS"
                  :key="d.id"
                  type="button"
                  class="h-8 rounded-lg font-label-mono text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                  :class="
                    form.days_of_week.includes(d.id)
                      ? 'bg-primary text-on-primary shadow-sm ring-1 ring-white/20 font-bold'
                      : 'bg-[#1a1a1c] text-on-surface-variant hover:text-white hover:bg-white/10 border border-white/10'
                  "
                  :title="d.name"
                  @click="toggleDay(d.id)"
                >
                  {{ d.label }}
                </button>
              </div>

              <span class="text-[11px] text-outline font-body-sm">
                {{ routineDaysSummary }}
              </span>
            </div>
          </div>

          <!-- Etiquetas -->
          <div class="flex flex-col gap-1.5">
            <span
              id="tag-field-label"
              class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]"
              >Etiquetas</span
            >
            <div class="relative">
              <div
                class="min-h-10 px-2 py-1.5 rounded-xl bg-[#28282b] border border-white/10 flex flex-wrap items-center gap-1.5 focus-within:border-primary transition-colors cursor-text"
                @click="focusTagInput"
              >
                <span
                  v-for="(name, index) in selectedTags"
                  :key="`${name}-${index}`"
                  class="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-lg bg-white/10 text-white font-body-sm max-w-full"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: tagDotColor(name) }"
                    aria-hidden="true"
                  ></span>
                  <span class="truncate">{{ name }}</span>
                  <button
                    type="button"
                    class="w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
                    :title="`Quitar ${name}`"
                    @click.stop="removeTag(index)"
                  >
                    <span class="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </span>

                <input
                  id="tag-input"
                  ref="tagInput"
                  v-model="tagQuery"
                  type="text"
                  maxlength="40"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="tag-suggestions"
                  :aria-expanded="showSuggestions"
                  :aria-activedescendant="
                    activeSuggestion >= 0
                      ? `tag-option-${activeSuggestion}`
                      : undefined
                  "
                  aria-labelledby="tag-field-label"
                  :placeholder="
                    selectedTags.length
                      ? 'Añadir otra…'
                      : 'Separadas por espacio · Ej. Urgente'
                  "
                  autocomplete="off"
                  class="flex-1 min-w-[7rem] h-7 px-1 bg-transparent border-0 text-white font-body-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0"
                  @focus="tagFocused = true"
                  @blur="onTagBlur"
                  @keydown="onTagKeydown"
                  @input="onTagInput"
                />
              </div>

              <ul
                v-if="showSuggestions"
                id="tag-suggestions"
                role="listbox"
                class="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#252528] shadow-xl py-1 backdrop-blur-md"
              >
                <li
                  v-for="(name, index) in suggestions"
                  :id="`tag-option-${index}`"
                  :key="name"
                  role="option"
                  :aria-selected="index === activeSuggestion"
                  class="px-3 py-2 font-body-sm cursor-pointer transition-colors flex items-center gap-2"
                  :class="
                    index === activeSuggestion
                      ? 'bg-primary/20 text-primary'
                      : 'text-white hover:bg-white/10'
                  "
                  @mousedown.prevent="applySuggestion(name)"
                  @mouseenter="activeSuggestion = index"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: tagDotColor(name) }"
                    aria-hidden="true"
                  ></span>
                  {{ name }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Bottom Actions (Apple style) -->
          <div
            class="pt-3 mt-1 border-t border-white/10 flex items-center justify-end gap-3 shrink-0"
          >
            <button
              type="button"
              class="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-label-md transition-colors cursor-pointer"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="h-9 px-5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-white font-label-md flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              :disabled="submitting || !form.title.trim()"
            >
              <span class="material-symbols-outlined text-[18px]">check</span>
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { suggestTags } from '@/lib/levenshtein'
import { tagDotColor } from '@/lib/tag-color'
import { calculateUrgencyFromDueDate, getUrgencyHint } from '@/lib/urgency'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

const WEEK_DAYS = [
  { id: 1, label: 'L', name: 'Lunes' },
  { id: 2, label: 'M', name: 'Martes' },
  { id: 3, label: 'X', name: 'Miércoles' },
  { id: 4, label: 'J', name: 'Jueves' },
  { id: 5, label: 'V', name: 'Viernes' },
  { id: 6, label: 'S', name: 'Sábado' },
  { id: 7, label: 'D', name: 'Domingo' }
]

const tasks = useTasksStore()
const titleInput = ref(null)
const tagInput = ref(null)
const submitting = ref(false)
const knownTags = ref([])
const selectedTags = ref([])
const tagQuery = ref('')
const tagFocused = ref(false)
const activeSuggestion = ref(-1)

const form = reactive({
  title: '',
  due_date: '',
  is_routine: false,
  days_of_week: [1, 2, 3, 4, 5],
  impact: 3,
  urgency: 1,
  effort: 3,
  dependencies: 1,
  risk: 1
})

function toggleDay(id) {
  const idx = form.days_of_week.indexOf(id)
  if (idx >= 0) {
    form.days_of_week.splice(idx, 1)
  } else {
    form.days_of_week.push(id)
    form.days_of_week.sort((a, b) => a - b)
  }
}

function selectWeekdays() {
  form.days_of_week = [1, 2, 3, 4, 5]
}

function selectAllDays() {
  form.days_of_week = [1, 2, 3, 4, 5, 6, 7]
}

const isWeekdaysSelected = computed(() => {
  const d = form.days_of_week
  return d.length === 5 && [1, 2, 3, 4, 5].every((val) => d.includes(val))
})

const isAllDaysSelected = computed(() => form.days_of_week.length === 7)

const routineDaysSummary = computed(() => {
  if (!form.days_of_week.length) return 'Selecciona al menos un día'
  if (isAllDaysSelected.value) return 'Todos los días de la semana'
  if (isWeekdaysSelected.value) return 'Lunes a Viernes (días laborables)'
  const names = form.days_of_week
    .map((id) => WEEK_DAYS.find((w) => w.id === id)?.name)
    .filter(Boolean)
  return names.join(', ')
})

const urgencyHint = computed(() => getUrgencyHint(form.due_date))

watch(
  () => form.due_date,
  (val) => {
    form.urgency = calculateUrgencyFromDueDate(val)
  }
)

const computedScore = computed(() => {
  const i = Math.max(1, Math.min(5, Number(form.impact) || 3))
  const u = Math.max(1, Math.min(5, Number(form.urgency) || 1))
  const e = Math.max(1, Math.min(5, Number(form.effort) || 3))
  const d = Math.max(1, Math.min(5, Number(form.dependencies) || 1))
  const r = Math.max(1, Math.min(5, Number(form.risk) || 1))
  return Number((((i * u) + (d * r)) / e).toFixed(2))
})

const scoreBadgeClass = computed(() => {
  const s = computedScore.value
  if (s >= 12) return 'bg-error/20 text-error border border-error/30'
  if (s >= 6) return 'bg-secondary/20 text-secondary border border-secondary/30'
  if (s >= 3) return 'bg-primary/20 text-primary border border-primary/30'
  return 'bg-white/10 text-on-surface-variant border border-white/10'
})

const suggestions = computed(() =>
  suggestTags(tagQuery.value, knownTags.value, {
    limit: 6,
    exclude: selectedTags.value
  })
)

const showSuggestions = computed(
  () => tagFocused.value && suggestions.value.length > 0
)

watch(suggestions, () => {
  activeSuggestion.value = suggestions.value.length ? 0 : -1
})

async function loadKnownTags() {
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) knownTags.value = res.data || []
}

function resetForm() {
  form.title = ''
  form.due_date = ''
  form.is_routine = false
  form.days_of_week = [1, 2, 3, 4, 5]
  form.impact = 3
  form.urgency = 1
  form.effort = 3
  form.dependencies = 1
  form.risk = 1
  selectedTags.value = []
  tagQuery.value = ''
  tagFocused.value = false
  activeSuggestion.value = -1
}

function close() {
  open.value = false
  resetForm()
}

function focusTagInput() {
  tagInput.value?.focus()
}

function commitTag(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return false
  const exists = selectedTags.value.some(
    (t) => t.toLowerCase() === name.toLowerCase()
  )
  if (!exists) selectedTags.value.push(name)
  tagQuery.value = ''
  activeSuggestion.value = -1
  return true
}

function removeTag(index) {
  selectedTags.value.splice(index, 1)
  focusTagInput()
}

function applySuggestion(name) {
  commitTag(name)
  tagFocused.value = true
  nextTick(() => tagInput.value?.focus())
}

function onTagInput() {
  const q = tagQuery.value
  if (q.endsWith(' ') || q.endsWith(',')) {
    const raw = q.slice(0, -1).trim()
    if (raw) commitTag(raw)
  }
}

function onTagBlur() {
  setTimeout(() => {
    if (tagQuery.value.trim()) {
      commitTag(tagQuery.value)
    }
    tagFocused.value = false
  }, 180)
}

function onTagKeydown(e) {
  if (e.key === 'Backspace' && !tagQuery.value && selectedTags.value.length) {
    selectedTags.value.pop()
    return
  }

  if (e.key === 'Tab') {
    if (tagQuery.value.trim()) {
      e.preventDefault()
      commitTag(tagQuery.value)
    }
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeSuggestion.value =
      (activeSuggestion.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeSuggestion.value =
      (activeSuggestion.value - 1 + suggestions.value.length) %
      suggestions.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (activeSuggestion.value >= 0) {
      applySuggestion(suggestions.value[activeSuggestion.value])
    } else if (tagQuery.value.trim()) {
      commitTag(tagQuery.value)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    tagFocused.value = false
    activeSuggestion.value = -1
  }
}

async function submit() {
  const title = form.title.trim()
  if (!title || submitting.value) return
  submitting.value = true
  try {
    if (tagQuery.value.trim()) commitTag(tagQuery.value)
    const tags = [...selectedTags.value]
    const payload = {
      title,
      due_date: form.due_date || null,
      impact: form.impact,
      urgency: form.urgency,
      effort: form.effort,
      dependencies: form.dependencies,
      risk: form.risk,
      tags,
      status: 'todo'
    }
    if (form.is_routine && form.days_of_week.length > 0) {
      payload.is_routine = true
      payload.days_of_week = [...form.days_of_week].sort((a, b) => a - b)
    }
    const res = await tasks.create(payload)
    if (res?.ok) {
      emit('created', res.data)
      close()
    }
  } finally {
    submitting.value = false
  }
}

watch(open, async (v) => {
  if (v) {
    resetForm()
    await loadKnownTags()
    await nextTick()
    titleInput.value?.focus()
  }
})
</script>

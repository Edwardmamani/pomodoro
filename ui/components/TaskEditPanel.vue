<template>
  <div class="flex flex-col flex-1 min-h-0 mt-4">
    <div class="flex items-center gap-2.5 shrink-0 mb-4">
      <button
        type="button"
        class="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
        title="Volver a la lista"
        @click="emit('close')"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
      </button>
      <h3 class="font-headline-md text-[17px] text-on-surface tracking-tight truncate">
        Editar tarea
      </h3>
    </div>

    <form
      v-if="task"
      class="flex flex-col flex-1 min-h-0 gap-3.5 overflow-y-auto pr-0.5"
      @submit.prevent="submit"
    >
      <div class="flex flex-col gap-1.5">
        <span class="font-label-mono-sm uppercase tracking-wider text-outline"
          >Estado</span
        >
        <TaskStatusMenu
          variant="field"
          :task-id="task.id"
          :status="task.status"
          :accent="task.id === tasks.activeTaskId"
        />
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="font-label-mono-sm uppercase tracking-wider text-outline"
          >Título</span
        >
        <input
          ref="titleInput"
          v-model="form.title"
          type="text"
          required
          maxlength="200"
          placeholder="¿Qué quieres hacer?"
          class="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-body-md placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Prioridad</span
          >
          <select
            v-model="form.priority"
            class="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="font-label-mono-sm uppercase tracking-wider text-outline"
            >Pomodoros est.</span
          >
          <input
            v-model.number="form.estimated_pomodoros"
            type="number"
            min="0"
            max="99"
            class="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </label>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="font-label-mono-sm uppercase tracking-wider text-outline"
          >Fecha de finalización</span
        >
        <div class="relative">
          <span
            class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline pointer-events-none"
            >event</span
          >
          <input
            v-model="form.due_date"
            type="date"
            class="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]"
          />
        </div>
      </label>

      <div class="flex flex-col gap-1.5">
        <span
          id="edit-tag-field-label"
          class="font-label-mono-sm uppercase tracking-wider text-outline"
          >Etiquetas</span
        >
        <div class="relative">
          <div
            class="min-h-10 px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 flex flex-wrap items-center gap-1.5 focus-within:border-primary/50 transition-colors cursor-text"
            @click="focusTagInput"
          >
            <span
              v-for="(name, index) in selectedTags"
              :key="`${name}-${index}`"
              class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-surface-container-high text-on-surface font-body-sm max-w-full"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: tagDotColor(name) }"
                aria-hidden="true"
              ></span>
              <span class="truncate">{{ name }}</span>
              <button
                type="button"
                class="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors flex-shrink-0"
                :title="`Quitar ${name}`"
                :aria-label="`Quitar etiqueta ${name}`"
                @click.stop="removeTag(index)"
              >
                <span class="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>

            <input
              id="edit-tag-input"
              ref="tagInput"
              v-model="tagQuery"
              type="text"
              maxlength="40"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="edit-tag-suggestions"
              :aria-expanded="showSuggestions"
              :aria-activedescendant="
                activeSuggestion >= 0
                  ? `edit-tag-option-${activeSuggestion}`
                  : undefined
              "
              aria-labelledby="edit-tag-field-label"
              :placeholder="
                selectedTags.length
                  ? 'Añadir otra…'
                  : 'Separadas por espacio · Ej. Idiomas'
              "
              autocomplete="off"
              class="flex-1 min-w-[7rem] h-7 px-1 bg-transparent border-0 text-on-surface font-body-sm placeholder:text-outline focus:outline-none focus:ring-0"
              @focus="tagFocused = true"
              @blur="onTagBlur"
              @keydown="onTagKeydown"
              @input="onTagInput"
            />
          </div>

          <ul
            v-if="showSuggestions"
            id="edit-tag-suggestions"
            role="listbox"
            class="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-40 overflow-y-auto rounded-lg border border-outline-variant/40 bg-surface-container-high shadow-lg py-1"
          >
            <li
              v-for="(name, index) in suggestions"
              :id="`edit-tag-option-${index}`"
              :key="name"
              role="option"
              :aria-selected="index === activeSuggestion"
              class="px-3 py-2 font-body-sm cursor-pointer transition-colors flex items-center gap-2"
              :class="
                index === activeSuggestion
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface hover:bg-surface-container-highest'
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

      <div
        class="px-3 py-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/20 font-label-mono-sm text-outline flex flex-wrap gap-x-3 gap-y-1"
      >
        <span class="inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">timer</span>
          {{ task.completed_pomodoros }}/{{ task.estimated_pomodoros }} pomos
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">schedule</span>
          {{ formatMinutes(task.accumulated_ms) }} acumulados
        </span>
      </div>

      <div
        class="mt-auto pt-3 shrink-0 flex flex-col gap-2 border-t border-outline-variant/20"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex-1 h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md transition-colors"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 h-10 px-4 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-40 disabled:pointer-events-none"
            :disabled="submitting || !form.title.trim() || !dirty"
          >
            <span class="material-symbols-outlined text-[18px]">check</span>
            Guardar
          </button>
        </div>
        <button
          type="button"
          class="h-10 px-4 rounded-xl text-error hover:bg-error/10 font-label-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          :disabled="submitting"
          @click="confirmDelete = true"
        >
          <span class="material-symbols-outlined text-[18px]">delete</span>
          Eliminar tarea
        </button>
      </div>
    </form>

    <ConfirmModal
      v-model:open="confirmDelete"
      title="Eliminar tarea"
      :message="`¿Eliminar «${task?.title || ''}»? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useTasksStore } from '../stores/tasks.store'
import { suggestTags } from '../lib/levenshtein'
import { tagDotColor } from '../lib/tag-color'
import TaskStatusMenu from './TaskStatusMenu.vue'
import ConfirmModal from './ConfirmModal.vue'

const props = defineProps({
  taskId: { type: [Number, String], required: true }
})

const emit = defineEmits(['close', 'saved', 'deleted'])

const tasks = useTasksStore()
const titleInput = ref(null)
const tagInput = ref(null)
const submitting = ref(false)
const confirmDelete = ref(false)
const knownTags = ref([])
const selectedTags = ref([])
const tagQuery = ref('')
const tagFocused = ref(false)
const activeSuggestion = ref(-1)
const baseline = ref(null)

const form = reactive({
  title: '',
  priority: 'medium',
  estimated_pomodoros: 1,
  due_date: ''
})

const task = computed(
  () => tasks.tasks.find((t) => t.id === props.taskId) || null
)

const suggestions = computed(() =>
  suggestTags(tagQuery.value, knownTags.value, {
    limit: 6,
    exclude: selectedTags.value
  })
)

const showSuggestions = computed(
  () => tagFocused.value && suggestions.value.length > 0
)

const dirty = computed(() => {
  if (!baseline.value) return false
  const tagsNow = [...selectedTags.value].map((t) => t.toLowerCase()).sort()
  const tagsBase = [...baseline.value.tags].map((t) => t.toLowerCase()).sort()
  return (
    form.title.trim() !== baseline.value.title ||
    form.priority !== baseline.value.priority ||
    Number(form.estimated_pomodoros) !== baseline.value.estimated_pomodoros ||
    (form.due_date || '') !== (baseline.value.due_date || '') ||
    tagsNow.join('\0') !== tagsBase.join('\0')
  )
})

watch(suggestions, () => {
  activeSuggestion.value = suggestions.value.length ? 0 : -1
})

async function loadKnownTags() {
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) knownTags.value = res.data || []
}

function loadFromTask(t) {
  if (!t) return
  form.title = t.title || ''
  form.priority = t.priority || 'medium'
  form.estimated_pomodoros = t.estimated_pomodoros ?? 1
  form.due_date = t.due_date || ''
  selectedTags.value = [...(t.tags || [])]
  tagQuery.value = ''
  tagFocused.value = false
  activeSuggestion.value = -1
  baseline.value = {
    title: form.title.trim(),
    priority: form.priority,
    estimated_pomodoros: Number(form.estimated_pomodoros) || 0,
    due_date: form.due_date || '',
    tags: [...selectedTags.value]
  }
}

function formatMinutes(ms) {
  const m = Math.round((ms || 0) / 60000)
  return `${m}m`
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
  if (/\s/.test(tagQuery.value)) {
    const parts = tagQuery.value.split(/\s+/)
    const last = parts.pop() ?? ''
    for (const part of parts) commitTag(part)
    tagQuery.value = last
  }
}

function onTagBlur() {
  setTimeout(() => {
    tagFocused.value = false
    activeSuggestion.value = -1
  }, 120)
}

function onTagKeydown(e) {
  if (e.key === 'Backspace' && !tagQuery.value && selectedTags.value.length) {
    e.preventDefault()
    selectedTags.value.pop()
    return
  }

  if (!showSuggestions.value) {
    if (e.key === 'ArrowDown' && suggestions.value.length) {
      tagFocused.value = true
      activeSuggestion.value = 0
      e.preventDefault()
    } else if (e.key === 'Enter' && tagQuery.value.trim()) {
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
  if (!title || submitting.value || !task.value) return
  submitting.value = true
  try {
    if (tagQuery.value.trim()) commitTag(tagQuery.value)
    const res = await tasks.update(task.value.id, {
      title,
      priority: form.priority,
      estimated_pomodoros: Number(form.estimated_pomodoros) || 0,
      due_date: form.due_date || null,
      tags: [...selectedTags.value]
    })
    if (res?.ok) {
      emit('saved', res.data)
      emit('close')
    }
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!task.value || submitting.value) return
  submitting.value = true
  try {
    const res = await tasks.remove(task.value.id)
    if (res?.ok) {
      emit('deleted')
      emit('close')
    }
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.taskId,
  async (id) => {
    if (!id) return
    await loadKnownTags()
    const t = tasks.tasks.find((x) => x.id === id)
    loadFromTask(t)
    await nextTick()
    titleInput.value?.focus()
  },
  { immediate: true }
)

watch(task, (t) => {
  if (!t) {
    emit('close')
    return
  }
  // Si cambia por refresh externo y no hay cambios locales, resincronizar
  if (!dirty.value) loadFromTask(t)
})
</script>

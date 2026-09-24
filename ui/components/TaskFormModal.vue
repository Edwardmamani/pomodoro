<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 p-4 backdrop-blur-[2px]"
      role="presentation"
      @click.self="close"
      @keydown.escape="close"
    >
      <div
        class="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-[18px]">add_task</span>
            </div>
            <h2
              id="task-form-title"
              class="font-headline-md text-[18px] text-on-surface tracking-tight"
            >
              Nueva tarea
            </h2>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
            title="Cerrar"
            @click="close"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form class="px-5 py-4 flex flex-col gap-3.5" @submit.prevent="submit">
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
              class="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-md placeholder:text-outline focus:outline-none focus:border-primary/50 transition-colors"
            />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1.5">
              <span
                class="font-label-mono-sm uppercase tracking-wider text-outline"
                >Prioridad</span
              >
              <select
                v-model="form.priority"
                class="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5">
              <span
                class="font-label-mono-sm uppercase tracking-wider text-outline"
                >Pomodoros est.</span
              >
              <input
                v-model.number="form.estimated_pomodoros"
                type="number"
                min="0"
                max="99"
                class="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50"
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
                class="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-sm focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
            <span class="font-label-mono-sm text-outline"
              >Opcional · formato local YYYY-MM-DD</span
            >
          </label>

          <div class="flex flex-col gap-1.5">
            <span
              id="tag-field-label"
              class="font-label-mono-sm uppercase tracking-wider text-outline"
              >Etiquetas</span
            >
            <div class="relative">
              <div
                class="min-h-10 px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-wrap items-center gap-1.5 focus-within:border-primary/50 transition-colors cursor-text"
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
                    <span class="material-symbols-outlined text-[14px]"
                      >close</span
                    >
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
                id="tag-suggestions"
                role="listbox"
                class="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-40 overflow-y-auto rounded-lg border border-outline-variant/40 bg-surface-container-high shadow-lg py-1"
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
            class="pt-2 mt-1 border-t border-outline-variant/30 flex items-center justify-end gap-2"
          >
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-label-md transition-colors"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="h-10 px-4 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md flex items-center gap-1.5 shadow-sm transition-colors"
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
import { useTasksStore } from '../stores/tasks.store'
import { suggestTags } from '../lib/levenshtein'
import { tagDotColor } from '../lib/tag-color'

const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created'])

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
  priority: 'medium',
  estimated_pomodoros: 1,
  due_date: ''
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
  form.priority = 'medium'
  form.estimated_pomodoros = 1
  form.due_date = ''
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
  // Espacio confirma el tag actual y abre espacio para el siguiente
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
  if (!title || submitting.value) return
  submitting.value = true
  try {
    if (tagQuery.value.trim()) commitTag(tagQuery.value)
    const tags = [...selectedTags.value]
    const res = await tasks.create({
      title,
      priority: form.priority,
      estimated_pomodoros: Number(form.estimated_pomodoros) || 0,
      due_date: form.due_date || null,
      tags,
      status: 'todo'
    })
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

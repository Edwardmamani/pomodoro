<template>
  <div
    class="relative rounded-xl p-3 transition-all w-full"
    :class="[
      isActive
        ? 'bg-surface-container-high text-on-surface shadow-sm'
        : 'hover:bg-surface-container',
      navigateOnSelect ? 'cursor-pointer' : ''
    ]"
    :role="navigateOnSelect ? 'button' : undefined"
    :tabindex="navigateOnSelect ? 0 : undefined"
    @click="onCardClick"
    @keydown.enter.prevent="onCardClick"
  >
    <div class="flex items-start gap-3">

      <!-- Menú de estado de tarea  ["Bloqueado", "Por hacer","En curso", "Hecha", "Cancelada"] -->
      <div class="mt-0.5 flex-shrink-0" @click.stop>
        <TaskStatusMenu :task-id="task.id" :status="task.status" />
      </div>

      <!-- Otros campos: título, prioridad, etiquetas, fecha, pomodoros, acumulado -->
      <div class="flex-1 min-w-0 pr-8">
        <div class="flex items-center justify-between gap-1">
          <input
            v-model="titleDraft"
            type="text"
            maxlength="200"
            class="flex-1 min-w-0 bg-transparent border-0 p-0 truncate text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 cursor-text"
            :class="isActive ? 'font-label-md' : 'font-body-md'"
            placeholder="Título"
            @click.stop
            @focus="titleFocused = true"
            @blur="saveTitle"
            @keydown.enter.prevent="blurActive"
          />
          <div @click.stop>
            <TaskPriorityMenu
              :task-id="task.id"
              :priority="task.priority"
            />
          </div>
        </div>

        <div
          class="flex items-center gap-2 mt-1.5 text-on-surface-variant font-label-mono-sm flex-wrap"
        >
          <div
            class="relative flex items-center gap-1.5 flex-wrap min-w-0"
            @click.stop
          >
            <span
              v-for="(name, index) in task.tags || []"
              :key="`${name}-${index}`"
              class="group/tag relative inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded bg-surface-container text-outline"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: tagDotColor(name) }"
                aria-hidden="true"
              ></span>
              <span class="max-w-[7rem] truncate">{{ name }}</span>
              <button
                type="button"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-surface-container-highest text-outline opacity-0 group-hover/tag:opacity-100 hover:text-error hover:bg-error/15 flex items-center justify-center shadow-sm transition-opacity"
                :title="`Quitar ${name}`"
                :aria-label="`Quitar etiqueta ${name}`"
                @click="removeTag(index)"
              >
                <span class="material-symbols-outlined text-[8px] leading-none">close</span>
              </button>
            </span>
            <button
              v-if="!addingTag"
              type="button"
              class="w-5 h-5 rounded-md bg-surface-container-highest text-on-surface-variant hover:text-primary hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors"
              title="Añadir etiqueta"
              aria-label="Añadir etiqueta"
              @click="startAddTag"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
            </button>
            <div v-else class="relative">
              <input
                ref="tagInput"
                v-model="tagQuery"
                type="text"
                maxlength="40"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="open-tag-suggestions"
                :aria-expanded="showSuggestions"
                :aria-activedescendant="
                  activeSuggestion >= 0
                    ? `open-tag-option-${activeSuggestion}`
                    : undefined
                "
                autocomplete="off"
                placeholder="Etiqueta"
                class="w-[5.5rem] h-5 px-1.5 rounded-md bg-surface-container-highest text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary/40"
                @focus="tagFocused = true"
                @keydown="onTagKeydown"
                @blur="onTagBlur"
              />
              <ul
                v-if="showSuggestions"
                id="open-tag-suggestions"
                role="listbox"
                class="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[9rem] max-h-40 overflow-y-auto rounded-lg border border-outline-variant/40 bg-surface-container-high shadow-lg py-1"
              >
                <li
                  v-for="(name, index) in suggestions"
                  :id="`open-tag-option-${index}`"
                  :key="name"
                  role="option"
                  :aria-selected="index === activeSuggestion"
                  class="px-2.5 py-1.5 font-label-mono-sm cursor-pointer transition-colors flex items-center gap-1.5"
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

          <button
            type="button"
            class="inline-flex items-center gap-0.5 relative cursor-pointer"
            :class="
              task.due_date
                ? ['px-1.5 py-0.5 rounded bg-surface-container', dueDateClass]
                : 'text-outline hover:text-on-surface-variant'
            "
            :title="task.due_date ? 'Finaliza ' + task.due_date : 'Sin fecha'"
            @click.stop="openDatePicker"
          >
            <span class="material-symbols-outlined text-[11px] pointer-events-none"
              >event</span
            >
            <span v-if="task.due_date" class="pointer-events-none">{{
              formatDueDate(task.due_date)
            }}</span>
            <input
              ref="dueDateInput"
              class="absolute left-0 top-0 w-full h-full opacity-0 pointer-events-none"
              type="date"
              tabindex="-1"
              :value="task.due_date || ''"
              @change="saveDueDate($event.target.value)"
            />
          </button>

          <span class="pointer-events-none">·</span>
          <span class="inline-flex items-center gap-0.5" @click.stop>
            <span :class="isActive ? 'text-primary' : ''">{{
              task.completed_pomodoros
            }}</span>
            <span>/</span>
            <input
              type="number"
              min="0"
              max="99"
              class="w-8 h-5 px-0.5 bg-transparent border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none focus:ring-0"
              :class="isActive ? 'text-primary' : ''"
              :value="task.estimated_pomodoros"
              title="Pomodoros estimados"
              @change="saveEstimated($event.target.value)"
            />
            <span :class="isActive ? 'text-primary' : ''">pomos</span>
          </span>
          <span class="pointer-events-none">·</span>
          <span
            class="pointer-events-none"
            :class="isActive ? 'text-primary' : ''"
            >{{ formatAccumulated(liveAccumulated) }}</span
          >
        </div>
      </div>
    </div>
    
    <!-- Botón de eliminar tarea -->
    <div class="absolute bottom-2 right-2" @click.stop>
      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-outline/70 hover:text-error hover:bg-error/10 transition-colors"
        title="Eliminar tarea"
        :aria-label="`Eliminar ${task.title}`"
        :disabled="removing"
        @click="confirmDelete = true"
      >
        <span class="material-symbols-outlined text-[16px]">delete</span>
      </button>
    </div>
  </div>

  <ConfirmModal
    v-model:open="confirmDelete"
    title="Eliminar tarea"
    :message="`¿Eliminar «${task.title}»? Esta acción no se puede deshacer.`"
    confirm-label="Eliminar"
    @confirm="onDelete"
  />
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { useTimerStore } from '@/stores/timer.store'
import { formatAccumulated } from '@/lib/format-accumulated'
import { suggestTags } from '@/lib/levenshtein'
import { tagDotColor } from '@/lib/tag-color'
import TaskStatusMenu from '@/components/TaskStatusMenu.vue'
import TaskPriorityMenu from '@/components/TaskPriorityMenu.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const props = defineProps({
  task: { type: Object, required: true },
  navigateOnSelect: { type: Boolean, default: true }
})

const emit = defineEmits(['select'])

function onCardClick() {
  if (!props.navigateOnSelect) return
  emit('select', props.task.id)
}

const tasks = useTasksStore()
const timer = useTimerStore()
const confirmDelete = ref(false)
const removing = ref(false)
const titleDraft = ref(props.task.title || '')
const titleFocused = ref(false)
const tagQuery = ref('')
const addingTag = ref(false)
const tagInput = ref(null)
const dueDateInput = ref(null)
const knownTags = ref([])
const tagFocused = ref(false)
const activeSuggestion = ref(-1)

const suggestions = computed(() =>
  suggestTags(tagQuery.value, knownTags.value, {
    limit: 6,
    exclude: props.task.tags || []
  })
)

const showSuggestions = computed(
  () => addingTag.value && tagFocused.value && suggestions.value.length > 0
)

watch(suggestions, () => {
  activeSuggestion.value = suggestions.value.length ? 0 : -1
})

const isActive = computed(() => props.task.id === tasks.activeTaskId)

const liveAccumulated = computed(() => {
  const task = props.task
  const base = task.accumulated_ms || 0
  const bindingId = timer.state.bindingTaskId
  if (bindingId == null || Number(task.id) !== Number(bindingId)) return base
  return base + timer.segmentElapsedMs
})

const dueDateClass = computed(() => {
  const task = props.task
  if (!task.due_date || ['done', 'cancelled'].includes(task.status)) {
    return 'text-outline'
  }
  const today = todayLocal()
  if (task.due_date < today) return 'text-error bg-error/10'
  if (task.due_date === today) return 'text-secondary bg-secondary/10'
  return 'text-outline'
})

watch(
  () => props.task.title,
  (title) => {
    if (!titleFocused.value) titleDraft.value = title || ''
  }
)

async function saveTitle() {
  titleFocused.value = false
  const title = titleDraft.value.trim()
  if (!title) {
    titleDraft.value = props.task.title || ''
    return
  }
  if (title === props.task.title) return
  await tasks.update(props.task.id, { title })
}

async function openDatePicker() {
  const input = dueDateInput.value
  if (!input) return
  try {
    if (typeof input.showPicker === 'function') {
      await input.showPicker()
      return
    }
  } catch {
    /* fallback abajo */
  }
  input.focus()
  input.click()
}

async function saveDueDate(value) {
  const due_date = value || null
  if ((due_date || '') === (props.task.due_date || '')) return
  await tasks.update(props.task.id, { due_date })
}

async function saveEstimated(raw) {
  const estimated_pomodoros = Math.min(99, Math.max(0, Number(raw) || 0))
  if (estimated_pomodoros === Number(props.task.estimated_pomodoros)) return
  await tasks.update(props.task.id, { estimated_pomodoros })
}

async function saveTags(nextTags) {
  await tasks.update(props.task.id, { tags: nextTags })
}

async function loadKnownTags() {
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) knownTags.value = res.data || []
}

function commitTag(rawName) {
  const name = String(rawName || '').trim()
  tagQuery.value = ''
  addingTag.value = false
  tagFocused.value = false
  activeSuggestion.value = -1
  if (!name) return
  const current = [...(props.task.tags || [])]
  const exists = current.some((t) => t.toLowerCase() === name.toLowerCase())
  if (exists) return
  void saveTags([...current, name])
}

function removeTag(index) {
  const next = [...(props.task.tags || [])]
  next.splice(index, 1)
  void saveTags(next)
}

function applySuggestion(name) {
  commitTag(name)
}

async function startAddTag() {
  addingTag.value = true
  tagFocused.value = true
  activeSuggestion.value = -1
  await loadKnownTags()
  await nextTick()
  tagInput.value?.focus()
}

function onTagBlur() {
  setTimeout(() => {
    tagFocused.value = false
    activeSuggestion.value = -1
    if (!addingTag.value) return
    if (tagQuery.value.trim()) commitTag(tagQuery.value)
    else addingTag.value = false
  }, 120)
}

function onTagKeydown(e) {
  // Vaciar el borrador no debe borrar etiquetas ya guardadas.
  if (e.key === 'Backspace' && !tagQuery.value) {
    e.preventDefault()
    addingTag.value = false
    tagFocused.value = false
    activeSuggestion.value = -1
    return
  }

  if (!showSuggestions.value) {
    if (e.key === 'ArrowDown' && suggestions.value.length) {
      tagFocused.value = true
      activeSuggestion.value = 0
      e.preventDefault()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commitTag(tagQuery.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      tagQuery.value = ''
      addingTag.value = false
      tagFocused.value = false
      activeSuggestion.value = -1
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
  } else if (e.key === ' ') {
    e.preventDefault()
    commitTag(tagQuery.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    tagFocused.value = false
    activeSuggestion.value = -1
    if (!tagQuery.value.trim()) {
      addingTag.value = false
    }
  }
}

async function onDelete() {
  if (removing.value) return
  removing.value = true
  try {
    await tasks.remove(props.task.id)
  } finally {
    removing.value = false
  }
}

function blurActive() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDueDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}`
}
</script>

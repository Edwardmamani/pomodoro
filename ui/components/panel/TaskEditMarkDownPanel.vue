<template>
  <aside
    class="h-full w-full bg-surface-container-low p-5 flex flex-col overflow-hidden"
  >
    <div class="flex items-center gap-2.5 shrink-0 mb-3">
      <button
        type="button"
        class="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
        title="Volver a la lista"
        @click="goBack"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
      </button>
      <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <h3
            class="font-headline-md text-[17px] text-on-surface tracking-tight truncate"
          >
            Notas
          </h3>
          <span
            v-if="task?.routine_id"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tracking-wide shrink-0"
            title="Archivo de notas compartido para todas las instancias de esta rutina"
          >
            <span class="material-symbols-outlined text-[13px]">cached</span>
            <span>Nota compartida de rutina</span>
          </span>
        </div>
        <span
          v-if="noteStatus"
          class="font-label-mono-sm text-outline/80 shrink-0"
          >{{ noteStatus }}</span
        >
      </div>
    </div>

    <TaskOpenItem
      v-if="task"
      class="shrink-0"
      :task="task"
      :navigate-on-select="false"
    />

    <div
      class="task-note-editor mt-3 rounded-lg border border-outline-variant/30 bg-surface-container overflow-hidden flex-1 min-h-0 flex flex-col"
    >
      <MarkdownPreviewKit
        ref="noteKitRef"
        v-model="noteContent"
        :document-path="noteFilePath"
        @change="onNoteChange"
        @command="onNoteCommand"
      />
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  MarkdownPreviewKit,
  createDocument
} from '@edward-dev/editor-markdown-vue'
import '@edward-dev/editor-markdown-vue/editor.css'
import { useTasksStore } from '@/stores/tasks.store'
import TaskOpenItem from '@/components/TaskOpenItem.vue'

const props = defineProps({
  taskId: { type: [Number, String], required: true }
})

const router = useRouter()
const tasks = useTasksStore()

const task = computed(
  () =>
    tasks.tasks.find((t) => String(t.id) === String(props.taskId)) || null
)

const noteKitRef = ref(null)
const noteContent = ref('')
const noteFilePath = ref(null)
const noteStatus = ref('')
const noteLoading = ref(false)
let noteSaveTimer = null
let noteLoadToken = 0

const noteDoc = createDocument({
  async load() {
    const res = await window.pomodoroAPI.notes.load(props.taskId)
    if (!res?.ok) return null
    return { content: res.data.content ?? '', filePath: res.data.filePath }
  },
  async save({ content }) {
    const res = await window.pomodoroAPI.notes.save(props.taskId, content ?? '')
    if (!res?.ok) return null
    return { filePath: res.data.filePath }
  }
})

function goBack() {
  router.push('/')
}

function clearNoteSaveTimer() {
  if (noteSaveTimer != null) {
    clearTimeout(noteSaveTimer)
    noteSaveTimer = null
  }
}

async function loadNote() {
  clearNoteSaveTimer()
  const token = ++noteLoadToken
  noteLoading.value = true
  noteStatus.value = ''
  try {
    const result = await noteDoc.load()
    if (token !== noteLoadToken) return
    noteContent.value = result?.content ?? ''
    noteFilePath.value = result?.filePath ?? null
  } catch {
    if (token !== noteLoadToken) return
    noteContent.value = ''
    noteFilePath.value = null
    noteStatus.value = 'No se pudo cargar'
  } finally {
    if (token === noteLoadToken) noteLoading.value = false
  }
}

function onNoteChange() {
  noteDoc.setContent(noteContent.value)
  noteStatus.value = 'Sin guardar'
  clearNoteSaveTimer()
  noteSaveTimer = setTimeout(() => {
    void persistNote()
  }, 450)
}

async function persistNote() {
  clearNoteSaveTimer()
  if (noteLoading.value || !props.taskId) return
  noteDoc.setContent(noteContent.value)
  if (!noteDoc.isDirty()) return
  noteStatus.value = 'Guardando…'
  try {
    const result = await noteDoc.save()
    if (result?.filePath) noteFilePath.value = result.filePath
    noteStatus.value = 'Guardado'
  } catch {
    noteStatus.value = 'Error al guardar'
  }
}

async function onNoteCommand(name, arg) {
  if (name !== 'image' || arg) return
  const res = await window.pomodoroAPI.notes.pickAsset(props.taskId)
  if (!res?.ok || !res.data?.relativePath) return
  noteKitRef.value?.runCommand('image', res.data.relativePath)
}

watch(
  () => props.taskId,
  (id) => {
    if (id) void loadNote()
  },
  { immediate: true }
)

watch(task, (t) => {
  // Solo volver si la lista ya cargó y la tarea desapareció (borrada / id inválido).
  if (!t && tasks.tasks.length > 0) goBack()
})

onBeforeUnmount(() => {
  clearNoteSaveTimer()
  if (noteDoc.isDirty()) void persistNote()
})
</script>

<style scoped>
.task-note-editor :deep(.md-preview-kit) {
  --bg: #1b2027;
  --panel: #252a32;
  --border: #3f4942;
  --text: #dee2ec;
  --muted: #88938b;
  --accent: #7ed8ab;
  --accent-strong: #7ed8ab;
  height: 100%;
  min-height: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.task-note-editor :deep(.editing-toolbar) {
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: #171c23;
}

.task-note-editor :deep(.editing-toolbar button) {
  padding: 0.3rem 0.55rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  background: #1b2027;
}

.task-note-editor :deep(.md-preview-kit__pane) {
  flex: 1 1 auto;
  min-height: 0;
  background: #1b2027;
}

.task-note-editor :deep(.cm-host),
.task-note-editor :deep(.cm-editor) {
  height: 100%;
  min-height: 0;
}

.task-note-editor :deep(.cm-editor),
.task-note-editor :deep(.cm-content) {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.task-note-editor :deep(.cm-content) {
  padding: 0.75rem 0.9rem;
  min-height: 100%;
  caret-color: #7ed8ab;
}
</style>

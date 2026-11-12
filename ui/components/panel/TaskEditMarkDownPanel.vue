<template>
  <aside class="h-full w-full bg-surface-container-low p-5 flex flex-col overflow-hidden">
    <div class="flex items-center gap-2.5 shrink-0 mb-3">
      <button type="button" class="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Volver a la lista" @click="goBack">
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
      </button>
      <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="font-headline-md text-[17px] text-on-surface tracking-tight truncate">Notas</h3>
          <span v-if="task?.routine_id" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tracking-wide shrink-0" title="Archivo de notas compartido para todas las instancias de esta rutina">
            <span class="material-symbols-outlined text-[13px]">cached</span>
            <span>Nota compartida de rutina</span>
          </span>
        </div>
        <span v-if="noteStatus" class="font-label-mono-sm text-outline/80 shrink-0">{{ noteStatus }}</span>
      </div>
    </div>

    <TaskOpenItem v-if="task" class="shrink-0" :task="task" :navigate-on-select="false" />

    <div class="task-note-editor mt-3 rounded-lg border border-outline-variant/30 bg-surface-container overflow-hidden flex-1 min-h-0 flex flex-col">
      <MarkdownPreviewKit
        ref="noteKitRef" v-model="noteContent" :document-path="noteFilePath"
        @change="editor.onChange()" @command="(n, a) => editor.handleCommand(n, a, noteKitRef)"
      />
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MarkdownPreviewKit } from '@edward-dev/editor-markdown-vue'
import '@edward-dev/editor-markdown-vue/editor.css'
import '@/styles/note-editor.css'
import { useTasksStore } from '@/stores/tasks.store'
import { NoteEditorController } from '@/lib/note-editor-controller'
import TaskOpenItem from '@/components/TaskOpenItem.vue'

const props = defineProps({ taskId: { type: [Number, String], required: true } })
const router = useRouter()
const tasks = useTasksStore()
const task = computed(() => tasks.tasks.find((t) => String(t.id) === String(props.taskId)) || null)

const noteKitRef = ref(null)
const noteContent = ref('')
const noteFilePath = ref(null)
const noteStatus = ref('')
const noteLoading = ref(false)
const editor = new NoteEditorController(() => props.taskId, {
  content: noteContent, filePath: noteFilePath, status: noteStatus, loading: noteLoading
})

const goBack = () => router.push('/')
watch(() => props.taskId, (id) => { if (id) void editor.load() }, { immediate: true })
watch(task, (t) => { if (!t && tasks.tasks.length > 0) goBack() })
onBeforeUnmount(() => editor.destroy())
</script>

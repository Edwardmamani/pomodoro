<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md" role="presentation" @click.self="close" @keydown.escape="close">
      <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1e1e20] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252528]/80 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-medium">
              <span class="material-symbols-outlined text-[18px]">{{ isEditing ? (isRoutineTask ? 'cached' : 'edit') : 'add_task' }}</span>
            </div>
            <h2 id="task-form-title" class="font-headline-md text-[18px] text-white tracking-tight">{{ modalTitle }}</h2>
          </div>
          <button type="button" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-on-surface-variant hover:text-white flex items-center justify-center transition-colors cursor-pointer" title="Cerrar" @click="close">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form class="px-6 py-4 flex flex-col gap-4 overflow-y-auto min-h-0" @submit.prevent="submit">
          <label class="flex flex-col gap-1.5">
            <span class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Título de la tarea</span>
            <input ref="titleInput" v-model="form.title" type="text" required maxlength="200" placeholder="¿Qué vas a realizar?" class="h-10 px-3.5 rounded-xl bg-[#28282b] border border-white/10 text-white font-body-md placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors" />
          </label>

          <TaskPriorityVectorFields :form="form" />

          <label class="flex flex-col gap-1.5">
            <span class="font-label-mono-sm uppercase tracking-wider text-on-surface-variant text-[11px]">Fecha de finalización</span>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant pointer-events-none">event</span>
              <input v-model="form.due_date" type="date" class="w-full h-10 pl-10 pr-3 rounded-xl bg-[#28282b] border border-white/10 text-white font-body-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
            </div>
          </label>

          <TaskRoutineSection :form="form" />
          <TaskTagChipsInput ref="tagsRef" v-model="selectedTags" v-model:query="tagQuery" :known-tags="knownTags" />

          <div class="pt-3 mt-1 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button type="button" class="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-label-md transition-colors cursor-pointer" @click="close">Cancelar</button>
            <button type="submit" class="h-9 px-5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-white font-label-md flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none" :disabled="submitting || !form.title.trim()">
              <span class="material-symbols-outlined text-[18px]">{{ isEditing ? 'save' : 'check' }}</span>
              {{ isEditing ? 'Guardar cambios' : 'Crear tarea' }}
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
import { calculateUrgencyFromDueDate } from '@/lib/urgency'
import { TaskFormController } from '@/lib/task-form-controller'
import TaskPriorityVectorFields from '@/components/task/TaskPriorityVectorFields.vue'
import TaskRoutineSection from '@/components/task/TaskRoutineSection.vue'
import TaskTagChipsInput from '@/components/task/TaskTagChipsInput.vue'

const props = defineProps({
  editTask: { type: Object, default: null },
  defaultDueDate: { type: String, default: '' }
})
const open = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['created', 'updated'])

const tasks = useTasksStore()
const titleInput = ref(null)
const tagsRef = ref(null)
const submitting = ref(false)
const knownTags = ref([])
const selectedTags = ref([])
const tagQuery = ref('')
const form = reactive(TaskFormController.createDefaults())

const isEditing = computed(() => Boolean(props.editTask))
const isRoutineTask = computed(() => TaskFormController.isRoutineTask(props.editTask))
const modalTitle = computed(() => (!isEditing.value ? 'Nueva tarea' : isRoutineTask.value ? 'Editar tarea rutinaria' : 'Editar tarea'))
watch(() => form.due_date, (val) => { form.urgency = calculateUrgencyFromDueDate(val) })

function close() {
  open.value = false
  Object.assign(form, TaskFormController.createDefaults())
  selectedTags.value = []; tagsRef.value?.reset()
}

async function submit() {
  if (!form.title.trim() || submitting.value) return
  submitting.value = true
  try {
    const pending = tagQuery.value.trim()
    if (pending && !selectedTags.value.some((t) => t.toLowerCase() === pending.toLowerCase())) {
      selectedTags.value.push(pending)
    }
    const payload = TaskFormController.buildPayload(form, selectedTags.value, props.editTask)
    const res = await TaskFormController.save(tasks, props.editTask, payload)
    if (res?.ok) { emit(isEditing.value ? 'updated' : 'created', res.data); close() }
  } finally { submitting.value = false }
}

watch(open, async (v) => {
  if (!v) return
  selectedTags.value = await TaskFormController.hydrate(form, props.editTask, tasks, props.defaultDueDate)
  tagsRef.value?.reset()
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) knownTags.value = res.data || []
  await nextTick(); titleInput.value?.focus()
})
</script>

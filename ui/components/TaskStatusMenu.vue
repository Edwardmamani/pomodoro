<template>
  <div
    class="relative flex-shrink-0"
  >

    <!-- Botón de cambiar estado de tarea -->
    <button
      ref="triggerEl"
      type="button"
      class="w-4 h-4 flex items-center justify-center rounded-full transition-colors"
      :class="glyphClass"
      :title="'Cambiar estado · ' + currentLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click.stop="toggle"
    >
      <StatusGlyph :status="status" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-40"
        aria-hidden="true"
        @click="close"
        @contextmenu.prevent="close"
      ></div>
      <div
        v-if="open"
        role="listbox"
        class="fixed z-50 min-w-[11.5rem] py-1 rounded-lg bg-surface-container-highest border border-outline-variant/40 shadow-xl"
        :style="menuStyle"
      >
        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          type="button"
          role="option"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-selected="opt.value === status"
          @click.stop="select(opt.value)"
        >
          <!-- Icono de estado de tarea -->
          <span
            class="w-4 h-4 flex items-center justify-center shrink-0"
            :class="optionIconClass(opt.value)"
          >
            <StatusGlyph :status="opt.value" />
          </span>
          <!-- Texto del estado de tarea -->
          <span class="flex-1">{{ opt.label }}</span>
          <!-- Icono de check condicional al estado seleccionado -->
          <span
            v-if="opt.value === status"
            class="material-symbols-outlined text-[14px] text-primary"
            >check</span
          >
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import StatusGlyph from '@/components/StatusGlyph.vue'

const OPTIONS = [
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hecha' },
  { value: 'cancelled', label: 'Cancelada' }
]

const props = defineProps({
  taskId: { type: [Number, String], required: true },
  status: { type: String, required: true }
})

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})

const currentLabel = computed(
  () => OPTIONS.find((o) => o.value === props.status)?.label || props.status
)

const glyphClass = computed(() => {
  if (props.status === 'in_progress') {
    return 'bg-primary text-on-primary hover:brightness-110'
  }
  if (props.status === 'done') {
    return 'bg-primary/20 text-primary hover:bg-primary/30'
  }
  if (props.status === 'cancelled') {
    return 'text-outline hover:bg-surface-container-high'
  }
  if (props.status === 'blocked') {
    return 'text-secondary hover:bg-surface-container-high'
  }
  return 'text-outline hover:bg-surface-container-high hover:text-on-surface-variant'
})

function optionIconClass(status) {
  if (status === 'in_progress') return 'text-primary'
  if (status === 'done') return 'text-primary'
  if (status === 'cancelled') return 'text-outline'
  if (status === 'blocked') return 'text-secondary'
  return 'text-on-surface-variant'
}

function placeMenu() {
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const menuW = 184
  const menuH = OPTIONS.length * 32 + 8
  const pad = 8
  let top = rect.bottom + 4
  let left = rect.left
  if (top + menuH > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - menuH - 4)
  }
  if (left + menuW > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - menuW - pad)
  }
  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

async function toggle() {
  if (open.value) {
    close()
    return
  }
  open.value = true
  await nextTick()
  placeMenu()
}

function close() {
  open.value = false
}

async function select(status) {
  close()
  if (status === props.status) return
  await tasks.updateStatus(props.taskId, status)
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

function onScroll() {
  if (open.value) placeMenu()
}

watch(open, (v) => {
  if (v) {
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', placeMenu)
  } else {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', placeMenu)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', placeMenu)
})
</script>

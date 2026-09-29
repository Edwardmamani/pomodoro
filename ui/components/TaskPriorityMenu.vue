<template>
  <div class="relative flex-shrink-0">
    <button
      ref="triggerEl"
      type="button"
      class="font-label-mono-sm px-1.5 py-0.2 rounded shrink-0 inline-flex items-center transition-colors"
      :class="chipClass"
      :title="'Prioridad · ' + currentLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click.stop="toggle"
    >
      <span>{{ currentLabel }}</span>
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
        class="fixed z-50 min-w-[9.5rem] py-1 rounded-lg bg-surface-container-highest border border-outline-variant/40 shadow-xl"
        :style="menuStyle"
      >
        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          type="button"
          role="option"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-selected="opt.value === priority"
          @click.stop="select(opt.value)"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="opt.dot"
            aria-hidden="true"
          ></span>
          <span class="flex-1">{{ opt.label }}</span>
          <span
            v-if="opt.value === priority"
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
import { useTasksStore } from '../stores/tasks.store'

const OPTIONS = [
  { value: 'high', label: 'Alta', dot: 'bg-secondary' },
  { value: 'medium', label: 'Media', dot: 'bg-on-surface-variant' },
  { value: 'low', label: 'Baja', dot: 'bg-outline' }
]

const props = defineProps({
  taskId: { type: [Number, String], required: true },
  priority: { type: String, required: true }
})

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})

const currentLabel = computed(
  () => OPTIONS.find((o) => o.value === props.priority)?.label || props.priority
)

const chipClass = computed(() => {
  if (props.priority === 'high')
    return 'bg-secondary-container text-on-secondary-container'
  if (props.priority === 'medium')
    return 'bg-surface-container-highest text-on-surface-variant'
  return 'bg-surface-container-highest text-outline'
})

function placeMenu() {
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const menuW = 152
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

async function select(priority) {
  close()
  if (priority === props.priority) return
  await tasks.update(props.taskId, { priority })
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

<template>
  <div class="relative flex-shrink-0">
    <button
      ref="triggerEl" type="button"
      class="w-4 h-4 flex items-center justify-center rounded-full transition-colors"
      :class="glyphClass" :title="'Cambiar estado · ' + currentLabel"
      :aria-expanded="open" aria-haspopup="listbox" @click.stop="toggle"
    >
      <StatusGlyph :status="status" />
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" aria-hidden="true" @click="close" @contextmenu.prevent="close"></div>
      <div
        v-if="open" role="listbox"
        class="fixed z-50 min-w-[11.5rem] py-1 rounded-lg bg-surface-container-highest border border-outline-variant/40 shadow-xl"
        :style="menuStyle"
      >
        <button
          v-for="opt in OPTIONS" :key="opt.value" type="button" role="option"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-selected="opt.value === status" @click.stop="select(opt.value)"
        >
          <span class="w-4 h-4 flex items-center justify-center shrink-0" :class="optionIconClass(opt.value)">
            <StatusGlyph :status="opt.value" />
          </span>
          <span class="flex-1">{{ opt.label }}</span>
          <span v-if="opt.value === status" class="material-symbols-outlined text-[14px] text-primary">check</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import StatusGlyph from '@/components/StatusGlyph.vue'
import { FloatingMenuPositioner } from '@/lib/floating-menu-positioner'

const OPTIONS = [
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hecha' },
  { value: 'cancelled', label: 'Cancelada' }
]
const STATUS_GLYPH_MAP = {
  in_progress: 'bg-primary text-on-primary hover:brightness-110',
  done: 'bg-primary/20 text-primary hover:bg-primary/30',
  cancelled: 'text-outline hover:bg-surface-container-high',
  blocked: 'text-secondary hover:bg-surface-container-high'
}
const OPTION_ICON_MAP = {
  in_progress: 'text-primary', done: 'text-primary', cancelled: 'text-outline', blocked: 'text-secondary'
}

const props = defineProps({
  taskId: { type: [Number, String], required: true },
  status: { type: String, required: true }
})

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})
const positioner = new FloatingMenuPositioner(triggerEl, menuStyle, { width: 184, height: OPTIONS.length * 32 + 8 })

const currentLabel = computed(() => OPTIONS.find((o) => o.value === props.status)?.label || props.status)
const glyphClass = computed(() => STATUS_GLYPH_MAP[props.status] ?? 'text-outline hover:bg-surface-container-high hover:text-on-surface-variant')
const optionIconClass = (s) => OPTION_ICON_MAP[s] ?? 'text-on-surface-variant'

const close = () => { open.value = false }
const toggle = async () => { if (open.value) return close(); open.value = true; await nextTick(); positioner.place() }
const select = async (s) => { close(); if (s !== props.status) await tasks.updateStatus(props.taskId, s) }
const onKey = (e) => { if (e.key === 'Escape') close() }
const onScroll = () => { if (open.value) positioner.place() }
const onResize = () => positioner.place()

const bind = (on) => {
  const fn = on ? window.addEventListener : window.removeEventListener
  fn('keydown', onKey); fn('scroll', onScroll, true); fn('resize', onResize)
}
watch(open, (v) => bind(v))
onBeforeUnmount(() => bind(false))
</script>

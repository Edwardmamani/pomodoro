<template>
  <div class="relative flex-shrink-0">
    <button
      ref="triggerEl"
      type="button"
      class="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
      :class="
        open || tasks.hasActiveFilters
          ? 'bg-surface-container-high text-on-surface'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      "
      :title="
        tasks.hasActiveFilters
          ? `${tasks.activeFilterCount} filtro${tasks.activeFilterCount === 1 ? '' : 's'} activo${tasks.activeFilterCount === 1 ? '' : 's'}`
          : 'Filtrar tareas'
      "
      :aria-expanded="open"
      aria-haspopup="menu"
      @click.stop="toggle"
    >
      <span class="material-symbols-outlined text-[18px]">tune</span>
      <span
        v-if="tasks.activeFilterCount"
        class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-on-primary font-label-mono-sm text-[10px] leading-4 flex items-center justify-center"
        >{{ tasks.activeFilterCount }}</span
      >
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
        role="menu"
        class="fixed z-50 w-[15.5rem] max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl bg-surface-container-highest border border-outline-variant/40 shadow-xl py-1.5"
        :style="menuStyle"
      >
        <!-- Prioridad -->
        <button
          v-for="opt in PRIORITY_OPTIONS"
          :key="'p-' + opt.value"
          type="button"
          role="menuitemcheckbox"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-checked="tasks.filters.priority === opt.value"
          @click.stop="pick('priority', opt.value)"
        >
          <span
            class="w-4 h-4 flex items-center justify-center shrink-0 text-on-surface-variant"
            aria-hidden="true"
          >
            <svg
              :width="14"
              :height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <rect
                x="2"
                y="10"
                width="2.5"
                height="4"
                rx="0.5"
                :opacity="opt.bars >= 1 ? 1 : 0.25"
              />
              <rect
                x="6.75"
                y="6.5"
                width="2.5"
                height="7.5"
                rx="0.5"
                :opacity="opt.bars >= 2 ? 1 : 0.25"
              />
              <rect
                x="11.5"
                y="3"
                width="2.5"
                height="11"
                rx="0.5"
                :opacity="opt.bars >= 3 ? 1 : 0.25"
              />
            </svg>
          </span>
          <span class="flex-1">{{ opt.label }}</span>
          <span
            v-if="tasks.filters.priority === opt.value"
            class="material-symbols-outlined text-[16px] text-primary"
            >check</span
          >
        </button>

        <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>

        <!-- Estado -->
        <div
          class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5"
        >
          <StatusGlyph status="blocked" :size="12" />
          Estado
        </div>
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="'s-' + opt.value"
          type="button"
          role="menuitemcheckbox"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-checked="tasks.filters.status === opt.value"
          @click.stop="pick('status', opt.value)"
        >
          <span
            class="w-4 h-4 flex items-center justify-center shrink-0"
            :class="statusIconClass(opt.value)"
          >
            <StatusGlyph :status="opt.value" />
          </span>
          <span class="flex-1">{{ opt.label }}</span>
          <span
            v-if="tasks.filters.status === opt.value"
            class="material-symbols-outlined text-[16px] text-primary"
            >check</span
          >
        </button>

        <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>

        <!-- Fecha -->
        <div
          class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5"
        >
          <span class="material-symbols-outlined text-[12px]">event</span>
          Fecha
        </div>
        <button
          v-for="opt in DUE_OPTIONS"
          :key="'d-' + opt.value"
          type="button"
          role="menuitemcheckbox"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-checked="tasks.filters.due === opt.value"
          @click.stop="pick('due', opt.value)"
        >
          <span
            class="material-symbols-outlined text-[16px] shrink-0"
            :class="opt.iconClass"
            >{{ opt.icon }}</span
          >
          <span class="flex-1">{{ opt.label }}</span>
          <span
            v-if="tasks.filters.due === opt.value"
            class="material-symbols-outlined text-[16px] text-primary"
            >check</span
          >
        </button>

        <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>

        <!-- Tipo / Rutinas -->
        <div
          class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5"
        >
          <span class="material-symbols-outlined text-[12px]">repeat</span>
          Tipo
        </div>
        <button
          type="button"
          role="menuitemcheckbox"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
          :aria-checked="tasks.filters.routine === true"
          @click.stop="pick('routine', true)"
        >
          <span
            class="material-symbols-outlined text-[16px] shrink-0 text-primary"
            >repeat</span
          >
          <span class="flex-1">Solo rutinarias</span>
          <span
            v-if="tasks.filters.routine"
            class="material-symbols-outlined text-[16px] text-primary"
            >check</span
          >
        </button>

        <template v-if="tags.length">
          <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>

          <div
            class="px-2.5 py-1 font-label-mono-sm uppercase tracking-wider text-outline flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[12px]">sell</span>
            Etiqueta
          </div>
          <button
            v-for="name in tags"
            :key="'t-' + name"
            type="button"
            role="menuitemcheckbox"
            class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm text-on-surface hover:bg-surface-container-high transition-colors"
            :aria-checked="tasks.filters.tag === name"
            @click.stop="pick('tag', name)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: tagDotColor(name) }"
              aria-hidden="true"
            ></span>
            <span class="flex-1 truncate">{{ name }}</span>
            <span
              v-if="tasks.filters.tag === name"
              class="material-symbols-outlined text-[16px] text-primary"
              >check</span
            >
          </button>
        </template>

        <div class="my-1.5 mx-2 border-t border-outline-variant/30"></div>

        <button
          type="button"
          role="menuitem"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left font-body-sm transition-colors"
          :class="
            tasks.hasActiveFilters
              ? 'text-on-surface hover:bg-surface-container-high'
              : 'text-outline cursor-default'
          "
          :disabled="!tasks.hasActiveFilters"
          @click.stop="onClear"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
          <span class="flex-1">Limpiar</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { tagDotColor } from '@/lib/tag-color'
import StatusGlyph from '@/components/StatusGlyph.vue'

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta', bars: 3 },
  { value: 'medium', label: 'Media', bars: 2 },
  { value: 'low', label: 'Baja', bars: 1 }
]

const STATUS_OPTIONS = [
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hecha' },
  { value: 'cancelled', label: 'Cancelada' }
]

const DUE_OPTIONS = [
  {
    value: 'overdue',
    label: 'Vencidas',
    icon: 'event_busy',
    iconClass: 'text-error'
  },
  {
    value: 'today',
    label: 'Hoy',
    icon: 'today',
    iconClass: 'text-secondary'
  },
  {
    value: 'upcoming',
    label: 'Próximas (48 h)',
    icon: 'event_upcoming',
    iconClass: 'text-primary'
  },
  {
    value: 'set',
    label: 'Con fecha',
    icon: 'event',
    iconClass: 'text-on-surface-variant'
  },
  {
    value: 'none',
    label: 'Sin fecha',
    icon: 'block',
    iconClass: 'text-outline'
  }
]

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})
const tags = ref([])

function statusIconClass(status) {
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
  const menuW = 248
  const pad = 8
  let top = rect.bottom + 6
  let left = rect.right - menuW
  if (left < pad) left = pad
  if (left + menuW > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - menuW - pad)
  }
  if (top + 320 > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - 320 - 6)
  }
  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

async function loadTags() {
  const res = await window.pomodoroAPI.tasks.listTags()
  if (res?.ok) tags.value = res.data || []
}

async function toggle() {
  if (open.value) {
    close()
    return
  }
  await loadTags()
  open.value = true
  await nextTick()
  placeMenu()
}

function close() {
  open.value = false
}

async function pick(key, value) {
  await tasks.setFilter(key, value)
}

async function onClear() {
  if (!tasks.hasActiveFilters) return
  await tasks.clearFilters()
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

onMounted(loadTags)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', placeMenu)
})
</script>

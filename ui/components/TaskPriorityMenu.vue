<template>
  <div class="relative flex-shrink-0" @click.stop>
    <!-- Priority Score Chip -->
    <button
      ref="triggerEl"
      type="button"
      class="font-label-mono-sm px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
      :class="chipClass"
      :title="'Puntaje de prioridad P = ((I×U) + (D×R)) / E: ' + scoreDisplay"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="dotClass"></span>
      <span class="font-bold">P: {{ scoreDisplay }}</span>
    </button>

    <!-- Apple Popover Sheet for Vector Editing -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        aria-hidden="true"
        @click="close"
        @contextmenu.prevent="close"
      ></div>

      <div
        v-if="open"
        class="fixed z-50 w-72 p-3.5 rounded-2xl bg-[#242426] border border-white/10 shadow-2xl flex flex-col gap-3 text-white backdrop-blur-xl"
        :style="menuStyle"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-white/10">
          <div class="flex items-center gap-1.5">
            <span class="font-label-mono text-primary font-bold text-xs">Vector t⃗</span>
            <span class="font-label-mono-sm text-on-surface-variant text-[11px]">[I, U, E, D, R]</span>
          </div>
          <div
            class="px-2 py-0.5 rounded-full font-label-mono text-xs font-bold"
            :class="chipClass"
          >
            P = {{ liveScore.toFixed(2) }}
          </div>
        </div>

        <!-- Formula display -->
        <div class="hidden px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 font-label-mono-sm text-on-surface-variant text-[10.5px] text-center">
          ({{ draft.impact }}×{{ draft.urgency }} + {{ draft.dependencies }}×{{ draft.risk }}) / {{ draft.effort }} = <strong class="text-white">{{ liveScore.toFixed(2) }}</strong>
        </div>

        <!-- 5 Vector Variables -->
        <div class="flex flex-col gap-2">
          <!-- Impacto -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant font-medium">I · Impacto</span>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]"
                :key="'i-' + v"
                type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft.impact === v ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                @click="setVar('impact', v)"
              >{{ v }}</button>
            </div>
          </div>

          <!-- Urgencia (Dinámica según fecha de finalización) -->
          <div class="flex items-center justify-between text-xs hidden">
            <div class="flex flex-col">
              <div class="flex items-center gap-1">
                <span class="text-on-surface-variant font-medium">U · Urgencia</span>
                <span class="text-[9px] px-1 py-0.2 rounded bg-primary/20 text-primary font-semibold">Dinámica</span>
              </div>
              <span class="text-[9.5px] text-on-surface-variant/70">{{ menuUrgencyHint }}</span>
            </div>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]"
                :key="'u-' + v"
                type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft.urgency === v ? 'bg-primary text-white shadow-sm ring-1 ring-white/20' : 'text-on-surface-variant hover:text-white'"
                :title="task?.due_date ? 'Calculada según fecha de finalización' : 'Sin fecha límite'"
                @click="setVar('urgency', v)"
              >{{ v }}</button>
            </div>
          </div>

          <!-- Esfuerzo -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant font-medium">E · Esfuerzo</span>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]"
                :key="'e-' + v"
                type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft.effort === v ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                @click="setVar('effort', v)"
              >{{ v }}</button>
            </div>
          </div>

          <!-- Dependencias -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant font-medium">D · Dependencias</span>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]"
                :key="'d-' + v"
                type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft.dependencies === v ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                @click="setVar('dependencies', v)"
              >{{ v }}</button>
            </div>
          </div>

          <!-- Riesgo -->
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant font-medium">R · Riesgo</span>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]"
                :key="'r-' + v"
                type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft.risk === v ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                @click="setVar('risk', v)"
              >{{ v }}</button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-2 border-t border-white/10">
          <button
            type="button"
            class="px-3 py-1 rounded-lg bg-primary hover:bg-primary-fixed-dim text-white text-xs font-label-md font-semibold transition-all cursor-pointer"
            @click="close"
          >
            Listo
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { getUrgencyHint } from '@/lib/urgency'

const props = defineProps({
  taskId: { type: [Number, String], required: true },
  task: { type: Object, default: () => ({}) }
})

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})

const menuUrgencyHint = computed(() => getUrgencyHint(props.task?.due_date))

const draft = reactive({
  impact: 3,
  urgency: 3,
  effort: 3,
  dependencies: 1,
  risk: 1
})

function syncDraft() {
  draft.impact = props.task?.impact ?? 3
  draft.urgency = props.task?.urgency ?? 3
  draft.effort = props.task?.effort ?? 3
  draft.dependencies = props.task?.dependencies ?? 1
  draft.risk = props.task?.risk ?? 1
}

watch(() => props.task, syncDraft, { immediate: true })

const liveScore = computed(() => {
  const i = Math.max(1, Math.min(5, Number(draft.impact) || 3))
  const u = Math.max(1, Math.min(5, Number(draft.urgency) || 3))
  const e = Math.max(1, Math.min(5, Number(draft.effort) || 3))
  const d = Math.max(1, Math.min(5, Number(draft.dependencies) || 1))
  const r = Math.max(1, Math.min(5, Number(draft.risk) || 1))
  return Number((((i * u) + (d * r)) / e).toFixed(2))
})

const scoreDisplay = computed(() => {
  const sc = props.task?.priority_score != null ? Number(props.task.priority_score) : liveScore.value
  return sc.toFixed(1)
})

const chipClass = computed(() => {
  const sc = props.task?.priority_score != null ? Number(props.task.priority_score) : liveScore.value
  if (sc >= 12) return 'bg-error/15 text-error border border-error/30'
  if (sc >= 6) return 'bg-secondary/15 text-secondary border border-secondary/30'
  if (sc >= 3) return 'bg-primary/15 text-primary border border-primary/30'
  return 'bg-white/10 text-on-surface-variant border border-white/10'
})

const dotClass = computed(() => {
  const sc = props.task?.priority_score != null ? Number(props.task.priority_score) : liveScore.value
  if (sc >= 12) return 'bg-error'
  if (sc >= 6) return 'bg-secondary'
  if (sc >= 3) return 'bg-primary'
  return 'bg-outline'
})

function placeMenu() {
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const menuW = 288
  const menuH = 310
  const pad = 12

  let top = rect.bottom + 6
  let left = rect.left - 200

  if (top + menuH > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - menuH - 6)
  }
  if (left < pad) {
    left = pad
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
  syncDraft()
  open.value = true
  await nextTick()
  placeMenu()
}

function close() {
  open.value = false
}

async function setVar(key, val) {
  draft[key] = val
  await tasks.update(props.taskId, {
    impact: draft.impact,
    urgency: draft.urgency,
    effort: draft.effort,
    dependencies: draft.dependencies,
    risk: draft.risk
  })
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

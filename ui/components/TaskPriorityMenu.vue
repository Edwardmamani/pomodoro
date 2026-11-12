<template>
  <div class="relative flex-shrink-0" @click.stop>
    <button
      ref="triggerEl" type="button"
      class="font-label-mono-sm px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
      :class="chipClass" :title="'Puntaje de prioridad P = ((I×U) + (D×R)) / E: ' + scoreDisplay"
      :aria-expanded="open" @click.stop="toggle"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="dotClass"></span>
      <span class="font-bold">P: {{ scoreDisplay }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" aria-hidden="true" @click="close" @contextmenu.prevent="close"></div>
      <div v-if="open" class="fixed z-50 w-72 p-3.5 rounded-2xl bg-[#242426] border border-white/10 shadow-2xl flex flex-col gap-3 text-white backdrop-blur-xl" :style="menuStyle" @click.stop>
        <div class="flex items-center justify-between pb-2 border-b border-white/10">
          <div class="flex items-center gap-1.5">
            <span class="font-label-mono text-primary font-bold text-xs">Vector t⃗</span>
            <span class="font-label-mono-sm text-on-surface-variant text-[11px]">[I, U, E, D, R]</span>
          </div>
          <div class="px-2 py-0.5 rounded-full font-label-mono text-xs font-bold" :class="chipClass">P = {{ liveScore.toFixed(2) }}</div>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="f in VECTOR_FIELDS" :key="f.key" class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant font-medium">{{ f.label }}</span>
            <div class="inline-flex rounded-lg bg-[#1a1a1c] p-0.5 border border-white/10">
              <button
                v-for="v in [1, 2, 3, 4, 5]" :key="f.key + '-' + v" type="button"
                class="w-6 h-5 rounded font-label-mono-sm text-[11px] font-medium transition-colors"
                :class="draft[f.key] === v ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-white'"
                @click="setVar(f.key, v)"
              >{{ v }}</button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-2 border-t border-white/10">
          <button type="button" class="px-3 py-1 rounded-lg bg-primary hover:bg-primary-fixed-dim text-white text-xs font-label-md font-semibold transition-all cursor-pointer" @click="close">Listo</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useTasksStore } from '@/stores/tasks.store'
import { FloatingMenuPositioner } from '@/lib/floating-menu-positioner'
import { PriorityScoreHelper } from '@/lib/priority-score'

const VECTOR_FIELDS = [
  { key: 'impact', label: 'I · Impacto' },
  { key: 'effort', label: 'E · Esfuerzo' },
  { key: 'dependencies', label: 'D · Dependencias' },
  { key: 'risk', label: 'R · Riesgo' }
]

const props = defineProps({
  taskId: { type: [Number, String], required: true },
  task: { type: Object, default: () => ({}) }
})

const tasks = useTasksStore()
const open = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})
const positioner = new FloatingMenuPositioner(triggerEl, menuStyle, { width: 288, height: 310, align: 'right' })
const draft = reactive({ impact: 3, urgency: 3, effort: 3, dependencies: 1, risk: 1 })

const syncDraft = () => {
  draft.impact = props.task?.impact ?? 3; draft.urgency = props.task?.urgency ?? 3
  draft.effort = props.task?.effort ?? 3; draft.dependencies = props.task?.dependencies ?? 1
  draft.risk = props.task?.risk ?? 1
}
watch(() => props.task, syncDraft, { immediate: true })

const liveScore = computed(() => PriorityScoreHelper.calculate(draft))
const activeScore = computed(() => (props.task?.priority_score != null ? Number(props.task.priority_score) : liveScore.value))
const scoreDisplay = computed(() => activeScore.value.toFixed(1))
const chipClass = computed(() => PriorityScoreHelper.chipClass(activeScore.value))
const dotClass = computed(() => PriorityScoreHelper.dotClass(activeScore.value))

const close = () => { open.value = false }
const toggle = async () => { if (open.value) return close(); syncDraft(); open.value = true; await nextTick(); positioner.place() }
const setVar = async (key, val) => {
  draft[key] = val
  await tasks.update(props.taskId, { impact: draft.impact, urgency: draft.urgency, effort: draft.effort, dependencies: draft.dependencies, risk: draft.risk })
}

const onKey = (e) => { if (e.key === 'Escape') close() }
const onScroll = () => { if (open.value) positioner.place() }
const onResize = () => positioner.place()
const bind = (on) => { const fn = on ? window.addEventListener : window.removeEventListener; fn('keydown', onKey); fn('scroll', onScroll, true); fn('resize', onResize) }
watch(open, (v) => bind(v))
onBeforeUnmount(() => bind(false))
</script>

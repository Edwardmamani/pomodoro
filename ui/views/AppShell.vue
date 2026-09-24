<template>
  <div
    class="w-full h-screen grid grid-rows-[auto_1fr_auto] bg-surface text-on-surface overflow-hidden select-none"
  >
    <AppHeader :panel="panel" />

    <div ref="splitRow" class="min-h-0 flex overflow-hidden">
      <div class="min-w-0 min-h-0 flex-1 overflow-hidden">
        <TimerStage />
      </div>

      <div
        class="relative w-1.5 flex-shrink-0 cursor-col-resize group z-20"
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar panel lateral"
        :aria-valuenow="Math.round(sidebarWidth)"
        tabindex="0"
        @mousedown.prevent="onDragStart"
        @touchstart.prevent="onTouchStart"
        @keydown="onSplitterKey"
      >
        <div
          class="absolute inset-y-0 -left-1 -right-1"
          aria-hidden="true"
        ></div>
        <div
          class="h-full w-full bg-outline-variant/30 group-hover:bg-primary/50 group-active:bg-primary transition-colors"
          :class="{ 'bg-primary/60': dragging }"
        ></div>
      </div>

      <div
        class="min-h-0 flex-shrink-0 overflow-hidden"
        :style="{ width: `${sidebarWidth}px` }"
      >
        <TaskSidebar v-if="panel === 'tasks'" />
        <SettingsPanel v-else />
      </div>
    </div>

    <MusicFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import TimerStage from '../components/TimerStage.vue'
import TaskSidebar from '../components/TaskSidebar.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import MusicFooter from '../components/MusicFooter.vue'
import { useTimerStore } from '../stores/timer.store'
import { useTasksStore } from '../stores/tasks.store'
import { useSettingsStore } from '../stores/settings.store'
import { useStreakStore } from '../stores/streak.store'
import { useMusicStore } from '../stores/music.store'
import { playBell, unlockAudio } from '../lib/bell-sound'

const STORAGE_KEY = 'pomodoro.sidebarWidth'
const DEFAULT_WIDTH = 320
const MIN_SIDEBAR = 260
const MIN_TIMER = 420

const route = useRoute()
const panel = computed(() => route.meta.panel || 'tasks')

const timer = useTimerStore()
const tasks = useTasksStore()
const settings = useSettingsStore()
const streak = useStreakStore()
const music = useMusicStore()

const splitRow = ref(null)
const sidebarWidth = ref(DEFAULT_WIDTH)
const dragging = ref(false)

let unsubTasks = null
let unsubSound = null
let dragStartX = 0
let dragStartWidth = 0

function loadWidth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = Number(raw)
    if (Number.isFinite(n) && n >= MIN_SIDEBAR) {
      sidebarWidth.value = n
    }
  } catch {
    /* ignore */
  }
}

function saveWidth() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(sidebarWidth.value)))
  } catch {
    /* ignore */
  }
}

function clampWidth(width) {
  const rowW = splitRow.value?.clientWidth || window.innerWidth
  const max = Math.max(MIN_SIDEBAR, rowW - MIN_TIMER)
  return Math.min(max, Math.max(MIN_SIDEBAR, width))
}

function applyWidth(width) {
  sidebarWidth.value = clampWidth(width)
}

function onDragStart(e) {
  dragging.value = true
  dragStartX = e.clientX
  dragStartWidth = sidebarWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!dragging.value) return
  // Arrastrar a la izquierda → sidebar más ancha
  const delta = dragStartX - e.clientX
  applyWidth(dragStartWidth + delta)
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  saveWidth()
}

function onTouchStart(e) {
  const touch = e.touches[0]
  if (!touch) return
  dragging.value = true
  dragStartX = touch.clientX
  dragStartWidth = sidebarWidth.value
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e) {
  if (!dragging.value) return
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  const delta = dragStartX - touch.clientX
  applyWidth(dragStartWidth + delta)
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  saveWidth()
}

function onSplitterKey(e) {
  const step = e.shiftKey ? 40 : 16
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    applyWidth(sidebarWidth.value + step)
    saveWidth()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    applyWidth(sidebarWidth.value - step)
    saveWidth()
  }
}

function onWindowResize() {
  applyWidth(sidebarWidth.value)
}

onMounted(async () => {
  loadWidth()
  applyWidth(sidebarWidth.value)
  window.addEventListener('resize', onWindowResize)

  const unlockOnce = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', unlockOnce)
    window.removeEventListener('keydown', unlockOnce)
  }
  window.addEventListener('pointerdown', unlockOnce)
  window.addEventListener('keydown', unlockOnce)

  timer.subscribe()
  unsubTasks = tasks.subscribe()
  unsubSound = window.pomodoroAPI.sound.onPlay(({ volume }) => {
    playBell(volume ?? settings.settings.sound_volume)
  })
  await Promise.all([
    timer.refresh(),
    tasks.refresh(),
    settings.refresh(),
    streak.refresh(),
    music.refresh()
  ])
})

onUnmounted(() => {
  unsubTasks?.()
  unsubSound?.()
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})
</script>

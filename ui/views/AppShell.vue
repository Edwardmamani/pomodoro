<template>
  <div class="w-full h-screen grid grid-rows-[auto_1fr_auto] bg-surface text-on-surface overflow-hidden select-none">
    <AppHeader :panel="panel" />

    <div ref="splitRow" class="min-h-0 flex overflow-hidden">
      <div class="min-w-0 min-h-0 flex-1 overflow-hidden">
        <TimerStage />
      </div>

      <div
        class="relative w-1.5 flex-shrink-0 cursor-col-resize group z-20"
        role="separator" aria-orientation="vertical" aria-label="Redimensionar panel lateral"
        :aria-valuenow="Math.round(sidebarWidth)" tabindex="0"
        @mousedown.prevent="splitter.startMouse($event)"
        @touchstart.prevent="splitter.startTouch($event)"
        @keydown="splitter.handleKey($event)"
      >
        <div class="absolute inset-y-0 -left-1 -right-1" aria-hidden="true"></div>
        <div class="h-full w-full bg-outline-variant/30 group-hover:bg-primary/50 group-active:bg-primary transition-colors" :class="{ 'bg-primary/60': dragging }"></div>
      </div>

      <div class="min-h-0 flex-shrink-0 overflow-hidden" :style="{ width: `${sidebarWidth}px` }">
        <TaskPanel v-if="panel === 'tasks'" />
        <CalendarPanel v-else-if="panel === 'calendar'" />
        <TaskEditMarkDownPanel v-else-if="panel === 'task-edit'" :task-id="route.params.taskId" />
        <SettingsPanel v-else />
      </div>
    </div>

    <MusicFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import TimerStage from '@/components/TimerStage.vue'
import TaskPanel from '@/components/panel/TaskPanel.vue'
import CalendarPanel from '@/components/panel/CalendarPanel.vue'
import TaskEditMarkDownPanel from '@/components/panel/TaskEditMarkDownPanel.vue'
import SettingsPanel from '@/components/panel/SettingsPanel.vue'
import MusicFooter from '@/components/MusicFooter.vue'
import { useTimerStore } from '@/stores/timer.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useStreakStore } from '@/stores/streak.store'
import { useMusicStore } from '@/stores/music.store'
import { playBell, unlockAudio } from '@/lib/bell-sound'
import { SidebarSplitter, DEFAULT_WIDTH } from '@/lib/sidebar-splitter'

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
const splitter = new SidebarSplitter(splitRow, sidebarWidth, dragging)

let unsubTasks = null
let unsubSound = null

onMounted(async () => {
  splitter.mount()
  const unlockOnce = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', unlockOnce)
    window.removeEventListener('keydown', unlockOnce)
  }
  window.addEventListener('pointerdown', unlockOnce)
  window.addEventListener('keydown', unlockOnce)

  timer.subscribe()
  unsubTasks = tasks.subscribe()
  unsubSound = window.pomodoroAPI.sound.onPlay(({ volume }) => playBell(volume ?? settings.settings.sound_volume))
  await Promise.all([timer.refresh(), tasks.refresh(), settings.refresh(), streak.refresh(), music.refresh()])
})

onUnmounted(() => {
  unsubTasks?.()
  unsubSound?.()
  splitter.unmount()
})
</script>

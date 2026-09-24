<template>
  <div
    class="w-full h-screen grid grid-cols-12 grid-rows-[auto_1fr_auto] bg-surface text-on-surface overflow-hidden select-none"
  >
    <AppHeader :panel="panel" />
    <TimerStage />
    <TaskSidebar v-if="panel === 'tasks'" />
    <SettingsPanel v-else />
    <MusicFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
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

const route = useRoute()
const panel = computed(() => route.meta.panel || 'tasks')

const timer = useTimerStore()
const tasks = useTasksStore()
const settings = useSettingsStore()
const streak = useStreakStore()
const music = useMusicStore()

let unsubTasks = null

onMounted(async () => {
  timer.subscribe()
  unsubTasks = tasks.subscribe()
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
})
</script>

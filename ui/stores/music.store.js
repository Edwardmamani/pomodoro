import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMusicStore = defineStore('music', () => {
  const active = ref(null)

  async function refresh() {
    const res = await window.pomodoroAPI.music.getActive()
    if (res.ok) active.value = res.data
  }

  async function open() {
    return window.pomodoroAPI.music.open()
  }

  return { active, refresh, open }
})

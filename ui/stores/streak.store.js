import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStreakStore = defineStore('streak', () => {
  const days = ref(0)

  async function refresh() {
    const res = await window.pomodoroAPI.streak.get()
    if (res.ok) days.value = res.data.days
  }

  return { days, refresh }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    focus_minutes: 25,
    short_break_minutes: 5,
    long_break_minutes: 15,
    pomodoros_until_long_break: 4,
    sound_enabled: true,
    notifications_enabled: true,
    mcp_enabled: false,
    sound_volume: 75,
    do_not_disturb_auto: false,
    attenuate_on_break: false
  })

  const draft = ref({ ...settings.value })

  async function refresh() {
    const res = await window.pomodoroAPI.settings.get()
    if (res.ok) {
      settings.value = res.data
      draft.value = { ...res.data }
    }
  }

  async function save() {
    const payload = {
      focus_minutes: draft.value.focus_minutes,
      short_break_minutes: draft.value.short_break_minutes,
      long_break_minutes: draft.value.long_break_minutes,
      pomodoros_until_long_break: draft.value.pomodoros_until_long_break,
      sound_enabled: draft.value.sound_enabled,
      notifications_enabled: draft.value.notifications_enabled,
      mcp_enabled: draft.value.mcp_enabled,
      sound_volume: draft.value.sound_volume,
      do_not_disturb_auto: draft.value.do_not_disturb_auto,
      attenuate_on_break: draft.value.attenuate_on_break
    }
    const res = await window.pomodoroAPI.settings.set(payload)
    if (res.ok) {
      settings.value = res.data
      draft.value = { ...res.data }
    }
    return res
  }

  async function reset() {
    const res = await window.pomodoroAPI.settings.reset()
    if (res.ok) {
      settings.value = res.data
      draft.value = { ...res.data }
    }
    return res
  }

  return { settings, draft, refresh, save, reset }
})

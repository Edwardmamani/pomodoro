<template>
  <div class="p-4 bg-surface-container-lowest border-t border-outline-variant/30">
    <h4 class="font-label-md text-on-surface text-[12px] mb-2 flex items-center gap-1.5">
      <span class="material-symbols-outlined text-[16px] text-primary">add_circle</span>
      <span>Añadir playlist o lista de YouTube Music / YouTube</span>
    </h4>

    <form class="space-y-2.5" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input v-model="newName" type="text" placeholder="Nombre (ej. Lo-Fi Study Beats)" required class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary text-[12px]" />
        <input v-model="newUrl" type="text" placeholder="https://music.youtube.com/playlist?list=..." required class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary text-[12px]" />
      </div>
      <div class="flex items-center justify-between">
        <span class="font-label-mono-sm text-on-surface-variant text-[10px]">Introduce el enlace completo de la playlist de YouTube Music o YouTube.</span>
        <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-[12px] flex items-center gap-1 shadow cursor-pointer" :disabled="isSubmitting">
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Añadir y reproducir</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import { parseMediaUrl } from '@/lib/music-parser'

const props = defineProps({ serviceFilter: { type: String, default: 'youtube' } })
const emit = defineEmits(['added'])
const music = useMusicStore()
const newName = ref('')
const newUrl = ref('')
const isSubmitting = ref(false)

async function submit() {
  if (!newName.value.trim() || !newUrl.value.trim()) return
  isSubmitting.value = true
  try {
    const parsed = parseMediaUrl(newUrl.value)
    await music.addPlaylist({
      name: newName.value.trim(),
      external_url: newUrl.value.trim(),
      service: parsed?.service || props.serviceFilter,
      external_id: parsed?.id || null
    })
    newName.value = ''
    newUrl.value = ''
    emit('added')
  } finally {
    isSubmitting.value = false
  }
}
</script>

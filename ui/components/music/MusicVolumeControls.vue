<template>
  <div class="flex items-center gap-3 justify-end w-1/4">
    <button type="button" class="p-1.5 rounded-lg transition-colors cursor-pointer" :class="music.showMiniPlayer ? 'text-primary bg-primary/10' : 'text-outline hover:text-on-surface'" :title="music.showMiniPlayer ? 'Ocultar mini-reproductor' : 'Ver video/reproductor'" @click="music.toggleMiniPlayer">
      <span class="material-symbols-outlined text-[19px]">smart_display</span>
    </button>

    <div class="flex items-center gap-2">
      <button type="button" class="text-outline hover:text-on-surface transition-colors cursor-pointer" :title="music.isMuted ? 'Activar sonido' : 'Silenciar'" @click="music.toggleMute">
        <span class="material-symbols-outlined text-[18px]">{{ volumeIcon }}</span>
      </button>
      <div ref="volumeBar" class="w-16 md:w-20 h-1.5 bg-surface-container-high rounded-full overflow-hidden relative cursor-pointer group py-1 -my-1" @click="onVolumeClick">
        <div class="h-1.5 bg-surface-container-high rounded-full overflow-hidden relative">
          <div class="h-full bg-primary rounded-full transition-all group-hover:brightness-110" :style="{ width: `${music.isMuted ? 0 : music.volume}%` }"></div>
        </div>
      </div>
    </div>

    <button type="button" class="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container cursor-pointer" title="Abrir playlist en YouTube / navegador" @click="music.open">
      <span class="material-symbols-outlined text-[18px]">open_in_new</span>
    </button>
    <button type="button" class="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container cursor-pointer" title="Ver canciones de la lista y otras playlists" @click="music.openQueueModal()">
      <span class="material-symbols-outlined text-[19px]">queue_music</span>
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMusicStore } from '@/stores/music.store'

const music = useMusicStore()
const volumeBar = ref(null)
const volumeIcon = computed(() => (music.isMuted || music.volume === 0 ? 'volume_off' : music.volume < 40 ? 'volume_down' : 'volume_up'))

function onVolumeClick(e) {
  if (!volumeBar.value) return
  const rect = volumeBar.value.getBoundingClientRect()
  music.setVolume(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
}
</script>

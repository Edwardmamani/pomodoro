<template>
  <div class="flex flex-col items-center flex-1 max-w-xl px-4">
    <div class="flex items-center gap-4 mb-0.5">
      <button type="button" class="p-1 rounded-lg transition-colors cursor-pointer" :class="music.isShuffle ? 'text-primary' : 'text-outline hover:text-on-surface'" title="Modo aleatorio" @click="music.toggleShuffle">
        <span class="material-symbols-outlined text-[18px]">shuffle</span>
      </button>
      <button type="button" class="p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Pista anterior" @click="music.prev">
        <span class="material-symbols-outlined text-[20px]">skip_previous</span>
      </button>
      <button type="button" class="w-9 h-9 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary flex items-center justify-center shadow-md transition-all transform active:scale-90 cursor-pointer" :title="music.isPlaying ? 'Pausar' : 'Reproducir'" @click="music.togglePlay">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1">{{ music.isPlaying ? 'pause' : 'play_arrow' }}</span>
      </button>
      <button type="button" class="p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Siguiente pista" @click="music.next">
        <span class="material-symbols-outlined text-[20px]">skip_next</span>
      </button>
      <button type="button" class="p-1 rounded-lg transition-colors cursor-pointer" :class="music.isRepeat ? 'text-primary' : 'text-outline hover:text-on-surface'" title="Repetir pista" @click="music.toggleRepeat">
        <span class="material-symbols-outlined text-[18px]">repeat</span>
      </button>
    </div>

    <div class="w-full flex items-center gap-3 font-label-mono-sm text-outline select-none">
      <span class="text-on-surface-variant text-[11px] min-w-[35px] text-right">{{ currentTimeText }}</span>
      <div ref="progressBar" class="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden relative cursor-pointer group py-1 -my-1" @click="onProgressClick">
        <div class="h-1.5 bg-surface-container-high rounded-full overflow-hidden relative">
          <div class="h-full bg-primary rounded-full transition-all group-hover:brightness-110" :style="{ width: `${music.progressPercent}%` }"></div>
        </div>
      </div>
      <span class="text-on-surface-variant text-[11px] min-w-[35px]">{{ durationText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import { formatTime } from '@/lib/music-parser'

const music = useMusicStore()
const progressBar = ref(null)
const currentTimeText = computed(() => formatTime(music.currentTime))
const durationText = computed(() => (music.duration > 0 ? formatTime(music.duration) : '—'))

function onProgressClick(e) {
  if (!progressBar.value || music.duration <= 0) return
  const rect = progressBar.value.getBoundingClientRect()
  music.seekByPercent(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
}
</script>

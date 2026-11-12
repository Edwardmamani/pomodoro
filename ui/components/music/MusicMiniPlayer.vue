<template>
  <div v-if="music.showMiniPlayer && music.currentService === 'youtube'" class="fixed bottom-[65px] left-6 z-40 w-[340px] h-[195px] rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col animate-fade-in">
    <div class="relative w-full h-full flex flex-col justify-between p-4 bg-black/80 overflow-hidden">
      <img v-if="music.currentTrack?.videoId" :src="`https://i.ytimg.com/vi/${music.currentTrack.videoId}/hqdefault.jpg`" :alt="music.currentTrackTitle" class="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px] scale-105" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/40"></div>

      <div class="relative z-10 flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-label-mono-sm text-[11px] text-red-400">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>YouTube Music · Audio Directo</span>
        </div>
        <button type="button" class="w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer" title="Minimizar reproductor" @click="music.toggleMiniPlayer">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div class="relative z-10 flex items-center gap-3.5 my-auto">
        <img v-if="music.currentTrack?.videoId" :src="`https://i.ytimg.com/vi/${music.currentTrack.videoId}/mqdefault.jpg`" :alt="music.currentTrackTitle" class="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/15 flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="font-label-md text-white text-[14px] font-semibold truncate">{{ music.currentTrackTitle }}</p>
          <p class="font-label-mono-sm text-white/75 text-[11px] truncate mt-0.5">{{ music.currentTrack?.author || music.active?.name }}</p>
          <p v-if="music.playlistTracks.length > 1" class="font-label-mono-sm text-primary text-[10px] mt-1">
            Pista {{ (music.currentTrack?.index ?? 0) + 1 }} de {{ music.playlistTracks.length }}
          </p>
        </div>
      </div>

      <div class="relative z-10 flex items-center justify-between text-white/80 text-[11px] font-label-mono-sm">
        <span>{{ currentTimeText }} / {{ durationText }}</span>
        <button type="button" class="text-primary hover:underline flex items-center gap-1 cursor-pointer" @click="music.openQueueModal">
          <span class="material-symbols-outlined text-[14px]">queue_music</span>
          <span>Ver cola ({{ music.playlistTracks.length }})</span>
        </button>
      </div>
    </div>
  </div>

  <div v-if="music.showMiniPlayer && music.currentService === 'spotify' && music.parsedMedia?.embedUrl" class="fixed bottom-[65px] left-6 z-40 w-[340px] h-[195px] rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col animate-fade-in">
    <div class="px-3 py-1.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
      <div class="flex items-center gap-1.5 font-label-mono-sm text-[11px] text-emerald-400">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Spotify Embed</span>
      </div>
      <button type="button" class="w-6 h-6 rounded-full hover:bg-surface-container-high text-on-surface flex items-center justify-center cursor-pointer" @click="music.toggleMiniPlayer">
        <span class="material-symbols-outlined text-[15px]">close</span>
      </button>
    </div>
    <iframe :src="music.parsedMedia.embedUrl" class="w-full flex-1 border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import { formatTime } from '@/lib/music-parser'

const music = useMusicStore()
const currentTimeText = computed(() => formatTime(music.currentTime))
const durationText = computed(() => (music.duration > 0 ? formatTime(music.duration) : '—'))
</script>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>

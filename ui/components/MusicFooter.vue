<template>
  <footer class="relative bg-surface-container-lowest border-t border-outline-variant/30 px-6 py-2.5 flex items-center justify-between text-on-surface shadow-xl z-20">
    <div id="yt-player-host" class="hidden"></div>
    <MusicMiniPlayer />

    <div class="flex items-center gap-3.5 min-w-0 w-1/4">
      <button
        type="button"
        class="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/40 flex items-center justify-center group cursor-pointer shadow-sm transition-transform active:scale-95"
        :title="music.showMiniPlayer ? 'Ocultar reproductor' : 'Mostrar mini-reproductor'"
        @click="music.toggleMiniPlayer"
      >
        <img v-if="music.currentTrack?.videoId" :src="`https://i.ytimg.com/vi/${music.currentTrack.videoId}/mqdefault.jpg`" :alt="music.currentTrackTitle" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform" />
        <span
          class="relative z-10 material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform drop-shadow"
          :class="music.isPlaying ? 'text-primary animate-pulse bg-black/50 rounded-full p-1' : music.currentTrack?.videoId ? 'text-white bg-black/40 rounded-full p-1' : 'text-on-surface-variant'"
        >{{ music.isPlaying ? 'graphic_eq' : 'music_note' }}</span>
      </button>

      <div class="min-w-0 flex flex-col">
        <button type="button" class="font-label-md text-on-surface truncate hover:text-primary cursor-pointer transition-colors text-left" :title="music.currentTrackTitle" @click="music.openQueueModal()">
          {{ music.currentTrackTitle }}
        </button>
        <div class="flex items-center gap-1.5 font-label-mono-sm text-on-surface-variant truncate text-[10px]">
          <span class="px-1.5 py-0.2 rounded font-medium flex-shrink-0" :class="music.currentService === 'youtube' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'">
            {{ music.parsedMedia?.isMusicDomain ? 'YouTube Music' : (music.currentService === 'youtube' ? 'YouTube' : 'Spotify') }}
          </span>
          <span>·</span>
          <span class="truncate">{{ music.currentTrackSubtitle }}</span>
        </div>
      </div>
    </div>

    <MusicPlaybackControls />
    <MusicVolumeControls />
    <MusicPlaylistModal v-model="music.showPlaylistModal" />
  </footer>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import MusicMiniPlayer from '@/components/music/MusicMiniPlayer.vue'
import MusicPlaybackControls from '@/components/music/MusicPlaybackControls.vue'
import MusicVolumeControls from '@/components/music/MusicVolumeControls.vue'
import MusicPlaylistModal from '@/components/MusicPlaylistModal.vue'

const music = useMusicStore()
onMounted(() => music.initPlayer('yt-player-host'))
</script>

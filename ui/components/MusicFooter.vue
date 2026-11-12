<template>
  <footer
    class="relative bg-surface-container-lowest border-t border-outline-variant/30 px-6 py-2.5 flex items-center justify-between text-on-surface shadow-xl z-20"
  >
    <!-- Contenedor oculto del reproductor de YouTube -->
    <div
      class="fixed pointer-events-none opacity-0 -z-50 overflow-hidden"
      :class="{
        '!static !pointer-events-auto !opacity-100 !z-30': music.showMiniPlayer && music.currentService === 'youtube'
      }"
      style="width: 1px; height: 1px"
      :style="
        music.showMiniPlayer && music.currentService === 'youtube'
          ? 'position: fixed; bottom: 65px; left: 24px; width: 340px; height: 195px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); background: #000;'
          : ''
      "
    >
      <div v-if="music.showMiniPlayer && music.currentService === 'youtube'" class="absolute top-2 right-2 z-40">
        <button
          type="button"
          class="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Minimizar video"
          @click="music.toggleMiniPlayer"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <div id="yt-player-host" class="w-full h-full"></div>
    </div>

    <!-- Mini-player flotante para Spotify Embed -->
    <div
      v-if="music.showMiniPlayer && music.currentService === 'spotify' && music.parsedMedia?.embedUrl"
      class="fixed bottom-[65px] left-6 z-40 w-[340px] h-[195px] rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col animate-fade-in"
    >
      <div class="px-3 py-1.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-1.5 font-label-mono-sm text-[11px] text-emerald-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Spotify Embed</span>
        </div>
        <button
          type="button"
          class="w-6 h-6 rounded-full hover:bg-surface-container-high text-on-surface flex items-center justify-center cursor-pointer"
          @click="music.toggleMiniPlayer"
        >
          <span class="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>
      <iframe
        :src="music.parsedMedia.embedUrl"
        class="w-full flex-1 border-0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    </div>

    <!-- Izquierda: Información de pista y Servicio -->
    <div class="flex items-center gap-3.5 min-w-0 w-1/4">
      <button
        type="button"
        class="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/40 flex items-center justify-center group cursor-pointer shadow-sm transition-transform active:scale-95"
        :title="music.showMiniPlayer ? 'Ocultar reproductor' : 'Mostrar mini-reproductor de video'"
        @click="music.toggleMiniPlayer"
      >
        <span
          class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform"
          :class="music.isPlaying ? 'text-primary animate-pulse' : 'text-on-surface-variant'"
        >
          {{ music.isPlaying ? 'graphic_eq' : 'music_note' }}
        </span>
        <div class="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
      </button>

      <div class="min-w-0 flex flex-col">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="font-label-md text-on-surface truncate hover:text-primary cursor-pointer transition-colors text-left"
            :title="music.active?.name || 'Seleccionar playlist'"
            @click="isModalOpen = true"
          >
            {{ music.active?.name || 'Sin playlist seleccionada' }}
          </button>
        </div>

        <div class="flex items-center gap-1.5 font-label-mono-sm text-on-surface-variant truncate text-[10px]">
          <span
            class="px-1.5 py-0.2 rounded font-medium"
            :class="
              music.currentService === 'youtube'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-emerald-500/20 text-emerald-400'
            "
          >
            {{ music.currentService === 'youtube' ? 'YouTube' : 'Spotify' }}
          </span>
          <span>·</span>
          <span class="truncate">
            {{
              music.currentService === 'youtube'
                ? (music.isPlaying ? 'Reproduciendo en segundo plano' : 'Pausado')
                : 'Spotify · Abrir en cliente o mini-player'
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Centro: Controles de Reproducción y Barra de Progreso -->
    <div class="flex flex-col items-center flex-1 max-w-xl px-4">
      <div class="flex items-center gap-4 mb-0.5">
        <!-- Shuffle -->
        <button
          type="button"
          class="p-1 rounded-lg transition-colors cursor-pointer"
          :class="music.isShuffle ? 'text-primary' : 'text-outline hover:text-on-surface'"
          title="Modo aleatorio"
          @click="music.toggleShuffle"
        >
          <span class="material-symbols-outlined text-[18px]">shuffle</span>
        </button>

        <!-- Anterior -->
        <button
          type="button"
          class="p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          title="Pista anterior"
          @click="music.prev"
        >
          <span class="material-symbols-outlined text-[20px]">skip_previous</span>
        </button>

        <!-- Reproducir / Pausar -->
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary flex items-center justify-center shadow-md transition-all transform active:scale-90 cursor-pointer"
          :title="music.isPlaying ? 'Pausar' : 'Reproducir'"
          @click="music.togglePlay"
        >
          <span
            class="material-symbols-outlined text-[20px]"
            style="font-variation-settings: 'FILL' 1"
          >
            {{ music.isPlaying ? 'pause' : 'play_arrow' }}
          </span>
        </button>

        <!-- Siguiente -->
        <button
          type="button"
          class="p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          title="Siguiente pista"
          @click="music.next"
        >
          <span class="material-symbols-outlined text-[20px]">skip_next</span>
        </button>

        <!-- Repetir -->
        <button
          type="button"
          class="p-1 rounded-lg transition-colors cursor-pointer"
          :class="music.isRepeat ? 'text-primary' : 'text-outline hover:text-on-surface'"
          title="Repetir pista"
          @click="music.toggleRepeat"
        >
          <span class="material-symbols-outlined text-[18px]">repeat</span>
        </button>
      </div>

      <!-- Barra de Progreso y Tiempos -->
      <div class="w-full flex items-center gap-3 font-label-mono-sm text-outline select-none">
        <span class="text-on-surface-variant text-[11px] min-w-[35px] text-right">
          {{ formattedCurrentTime }}
        </span>

        <div
          ref="progressBar"
          class="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden relative cursor-pointer group py-1 -my-1"
          @click="onProgressClick"
        >
          <div class="h-1.5 bg-surface-container-high rounded-full overflow-hidden relative">
            <div
              class="h-full bg-primary rounded-full transition-all group-hover:brightness-110"
              :style="{ width: `${music.progressPercent}%` }"
            ></div>
          </div>
        </div>

        <span class="text-on-surface-variant text-[11px] min-w-[35px]">
          {{ formattedDuration }}
        </span>
      </div>
    </div>

    <!-- Derecha: Volumen y Selector de Playlists -->
    <div class="flex items-center gap-3 justify-end w-1/4">
      <!-- Mini-player toggle icon -->
      <button
        type="button"
        class="p-1.5 rounded-lg transition-colors cursor-pointer"
        :class="music.showMiniPlayer ? 'text-primary bg-primary/10' : 'text-outline hover:text-on-surface'"
        :title="music.showMiniPlayer ? 'Ocultar mini-reproductor' : 'Ver video/reproductor'"
        @click="music.toggleMiniPlayer"
      >
        <span class="material-symbols-outlined text-[19px]">smart_display</span>
      </button>

      <!-- Control de Volumen -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="text-outline hover:text-on-surface transition-colors cursor-pointer"
          :title="music.isMuted ? 'Activar sonido' : 'Silenciar'"
          @click="music.toggleMute"
        >
          <span class="material-symbols-outlined text-[18px]">
            {{ volumeIcon }}
          </span>
        </button>

        <div
          ref="volumeBar"
          class="w-16 md:w-20 h-1.5 bg-surface-container-high rounded-full overflow-hidden relative cursor-pointer group py-1 -my-1"
          @click="onVolumeClick"
        >
          <div class="h-1.5 bg-surface-container-high rounded-full overflow-hidden relative">
            <div
              class="h-full bg-primary rounded-full transition-all group-hover:brightness-110"
              :style="{ width: `${music.isMuted ? 0 : music.volume}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Abrir externamente -->
      <button
        type="button"
        class="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container cursor-pointer"
        title="Abrir en YouTube / Spotify externamente"
        @click="music.open"
      >
        <span class="material-symbols-outlined text-[18px]">open_in_new</span>
      </button>

      <!-- Selector de listas -->
      <button
        type="button"
        class="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container cursor-pointer"
        title="Lista de reproducción"
        @click="isModalOpen = true"
      >
        <span class="material-symbols-outlined text-[19px]">queue_music</span>
      </button>
    </div>

    <!-- Modal de Gestión de Playlists -->
    <MusicPlaylistModal v-model="isModalOpen" />
  </footer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import { formatTime } from '@/lib/music-parser'
import MusicPlaylistModal from '@/components/MusicPlaylistModal.vue'

const music = useMusicStore()
const isModalOpen = ref(false)

const progressBar = ref(null)
const volumeBar = ref(null)

onMounted(() => {
  music.initPlayer('yt-player-host')
})

const formattedCurrentTime = computed(() => {
  return formatTime(music.currentTime)
})

const formattedDuration = computed(() => {
  if (music.duration > 0) {
    return formatTime(music.duration)
  }
  return music.isPlaying ? 'EN VIVO' : '—'
})

const volumeIcon = computed(() => {
  if (music.isMuted || music.volume === 0) return 'volume_off'
  if (music.volume < 40) return 'volume_down'
  return 'volume_up'
})

function onProgressClick(e) {
  if (!progressBar.value || music.duration <= 0) return
  const rect = progressBar.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
  music.seekByPercent(pct)
}

function onVolumeClick(e) {
  if (!volumeBar.value) return
  const rect = volumeBar.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
  music.setVolume(pct)
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>

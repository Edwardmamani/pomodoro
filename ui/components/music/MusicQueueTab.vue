<template>
  <div class="p-6 overflow-y-auto space-y-3 flex-1 min-h-[300px]">
    <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <span class="font-label-mono-sm text-[10px] text-primary uppercase tracking-wider font-semibold">Playlist activa</span>
        <h3 class="font-label-md text-on-surface text-[14px] truncate">{{ music.active?.name || 'Sin playlist' }}</h3>
        <p class="font-label-mono-sm text-on-surface-variant text-[11px] truncate">
          {{ music.currentTrack?.title ? `Reproduciendo: ${music.currentTrack.title}` : 'Cargando pistas...' }}
        </p>
      </div>
      <button type="button" class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface font-label-mono-sm text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0" title="Abrir esta playlist en el navegador" @click="music.open">
        <span class="material-symbols-outlined text-[15px] text-primary">open_in_new</span>
        <span>Abrir en YouTube</span>
      </button>
    </div>

    <div v-if="music.playlistTracks.length === 0" class="text-center py-12 text-on-surface-variant font-body-sm">
      <span class="material-symbols-outlined text-[36px] text-outline mb-2">music_note</span>
      <p>No se encontraron pistas individuales para esta selección o es una pista única.</p>
      <p class="font-label-mono-sm text-[11px] text-outline mt-1">
        Introduce una playlist de YouTube Music (ej. con <code class="text-primary">?list=PL...</code>) en la pestaña "Otras playlists" para cargar todas sus canciones.
      </p>
    </div>

    <div v-else class="space-y-1.5">
      <div
        v-for="(track, idx) in music.playlistTracks" :key="track.videoId || idx"
        class="group p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer"
        :class="music.currentTrack?.index === track.index ? 'bg-primary/15 border-primary/50 shadow-md ring-1 ring-primary/30' : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container'"
        @click="music.playTrackAt(track.index)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-6 text-center font-label-mono-sm text-[12px] flex-shrink-0">
            <span v-if="music.currentTrack?.index === track.index && music.isPlaying" class="material-symbols-outlined text-primary text-[18px] animate-pulse">graphic_eq</span>
            <span v-else :class="music.currentTrack?.index === track.index ? 'text-primary font-bold' : 'text-outline'">{{ idx + 1 }}</span>
          </div>
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/30 flex items-center justify-center relative">
            <img v-if="track.thumbnailUrl" :src="track.thumbnailUrl" :alt="track.title" class="w-full h-full object-cover" loading="lazy" />
            <span v-else class="material-symbols-outlined text-[18px] text-outline">music_note</span>
          </div>
          <div class="min-w-0 flex flex-col">
            <span class="font-label-md text-on-surface truncate text-[13px] group-hover:text-primary transition-colors" :class="{ 'text-primary font-semibold': music.currentTrack?.index === track.index }">{{ track.title }}</span>
            <span class="font-label-mono-sm text-on-surface-variant truncate text-[11px]">{{ track.author || 'Pista de YouTube' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5 flex-shrink-0">
          <span v-if="track.durationText" class="font-label-mono-sm text-[11px] text-on-surface-variant">{{ track.durationText }}</span>
          <span v-if="music.currentTrack?.index === track.index" class="font-label-mono-sm text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            {{ music.isPlaying ? 'Reproduciendo' : 'Lista' }}
          </span>
          <button type="button" class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors opacity-0 group-hover:opacity-100" title="Reproducir esta canción">
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMusicStore } from '@/stores/music.store'
const music = useMusicStore()
</script>

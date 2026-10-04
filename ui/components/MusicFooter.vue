<template>
  <footer
    class="bg-surface-container-lowest border-t border-outline-variant/30 px-6 py-2.5 flex items-center justify-between text-on-surface shadow-xl z-10"
  >
    <div class="flex items-center gap-3.5 min-w-0 w-1/4">
      <button
        type="button"
        class="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/40 flex items-center justify-center group cursor-pointer shadow-sm"
        title="Abrir playlist"
        @click="music.open()"
      >
        <span
          class="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform"
          >graphic_eq</span
        >
        <div
          class="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"
        ></div>
      </button>
      <div class="min-w-0 flex flex-col">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="font-label-md text-on-surface truncate hover:text-primary cursor-pointer transition-colors text-left"
            @click="music.open()"
          >
            {{ music.active?.name || 'Sin playlist' }}
          </button>
        </div>
        <span class="font-label-mono-sm text-on-surface-variant truncate">{{
          music.active?.service === 'spotify'
            ? 'Spotify · abrir en cliente externo'
            : 'Selecciona una lista'
        }}</span>
      </div>
    </div>
    <div class="flex flex-col items-center flex-1 max-w-xl px-4 opacity-50">
      <div class="flex items-center gap-4 mb-0.5">
        <span class="material-symbols-outlined text-[18px] text-outline"
          >shuffle</span
        >
        <span class="material-symbols-outlined text-[20px] text-outline"
          >skip_previous</span
        >
        <span
          class="w-8 h-8 rounded-full bg-surface-container-high text-outline flex items-center justify-center"
        >
          <span
            class="material-symbols-outlined text-[18px]"
            style="font-variation-settings: 'FILL' 1"
            >play_arrow</span
          >
        </span>
        <span class="material-symbols-outlined text-[20px] text-outline"
          >skip_next</span
        >
        <span class="material-symbols-outlined text-[18px] text-outline"
          >repeat</span
        >
      </div>
      <div
        class="w-full flex items-center gap-3 font-label-mono-sm text-outline"
      >
        <span>—</span>
        <div
          class="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden"
        >
          <div class="h-full bg-outline-variant rounded-full w-0"></div>
        </div>
        <span>—</span>
      </div>
    </div>
    <div class="flex items-center gap-4 justify-end w-1/4 opacity-40">
      <span class="material-symbols-outlined text-[18px]">volume_up</span>
      <span class="material-symbols-outlined text-[18px]">queue_music</span>
    </div>
  </footer>
</template>

<script setup>
import { useMusicStore } from '@/stores/music.store'

const music = useMusicStore()
</script>

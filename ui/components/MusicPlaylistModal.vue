<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" @click.self="close" @keydown.esc="close">
      <div class="bg-surface-container-low border border-outline-variant/40 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-on-surface" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[22px]">queue_music</span>
            </div>
            <div>
              <h2 id="modal-title" class="font-headline-md text-on-surface text-[17px]">Lista de Reproducción & Playlists</h2>
              <p class="font-label-mono-sm text-on-surface-variant text-[11px]">Canciones en cola · Playlists de YouTube Music y Spotify</p>
            </div>
          </div>
          <button type="button" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer" title="Cerrar" @click="close">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="px-6 pt-3 pb-2 border-b border-outline-variant/20 flex gap-2">
          <button
            type="button" class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="mainTab === 'queue' ? 'bg-primary/15 border-primary/40 text-primary shadow-sm font-semibold' : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'"
            @click="mainTab = 'queue'"
          >
            <span class="material-symbols-outlined text-[18px]">format_list_numbered</span>
            <span>Canciones en la lista actual</span>
            <span v-if="music.playlistTracks.length > 0" class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{{ music.playlistTracks.length }}</span>
          </button>
          <button
            type="button" class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="mainTab === 'playlists' ? 'bg-primary/15 border-primary/40 text-primary shadow-sm font-semibold' : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'"
            @click="mainTab = 'playlists'"
          >
            <span class="material-symbols-outlined text-[18px]">library_music</span>
            <span>Otras playlists guardadas</span>
            <span class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{{ music.playlists.length }}</span>
          </button>
        </div>

        <MusicQueueTab v-if="mainTab === 'queue'" />
        <MusicPlaylistsTab v-else :initial-service="music.currentService" @switch-queue="mainTab = 'queue'" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import MusicQueueTab from './music/MusicQueueTab.vue'
import MusicPlaylistsTab from './music/MusicPlaylistsTab.vue'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])
const music = useMusicStore()

const isOpen = computed({ get: () => props.modelValue, set: (val) => emit('update:modelValue', val) })
const mainTab = ref('queue')
const close = () => { isOpen.value = false }

watch(() => isOpen.value, (open) => {
  if (!open) return
  mainTab.value = music.modalInitialTab || (music.playlistTracks.length > 0 ? 'queue' : 'playlists')
})
</script>

<style scoped>
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in { animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>

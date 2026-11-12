<template>
  <div class="flex flex-col flex-1 min-h-[300px] overflow-hidden">
    <div class="px-6 py-2.5 bg-surface-container-lowest border-b border-outline-variant/20 flex gap-2">
      <button
        type="button" class="py-1 px-3 rounded-lg font-label-mono-sm text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer"
        :class="serviceFilter === 'youtube' ? 'bg-red-500/15 border-red-500/40 text-red-400 font-semibold' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'"
        @click="serviceFilter = 'youtube'"
      ><span class="w-2 h-2 rounded-full bg-red-500"></span><span>YouTube / YouTube Music</span></button>
      <button
        type="button" class="py-1 px-3 rounded-lg font-label-mono-sm text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer"
        :class="serviceFilter === 'spotify' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'"
        @click="serviceFilter = 'spotify'"
      ><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Spotify</span></button>
    </div>

    <div class="p-6 overflow-y-auto space-y-2 flex-1">
      <div
        v-for="item in filteredPlaylists" :key="item.id"
        class="group p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer"
        :class="music.active?.id === item.id ? 'bg-surface-container-high border-primary/50 shadow-md ring-1 ring-primary/30' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container'"
        @click="selectPlaylist(item.id)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-outline-variant/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]" :class="item.service === 'youtube' ? 'text-red-400' : 'text-emerald-400'">
              {{ item.service === 'youtube' ? 'smart_display' : 'music_note' }}
            </span>
          </div>
          <div class="min-w-0 flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-label-md text-on-surface truncate group-hover:text-primary transition-colors">{{ item.name }}</span>
              <span v-if="music.active?.id === item.id" class="font-label-mono-sm text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 flex-shrink-0">Activa</span>
            </div>
            <span class="font-label-mono-sm text-on-surface-variant truncate text-[11px]">{{ item.external_url }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
          <button type="button" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer" title="Abrir en el navegador" @click="openExternal(item.external_url)">
            <span class="material-symbols-outlined text-[17px]">open_in_new</span>
          </button>
          <button v-if="filteredPlaylists.length > 1" type="button" class="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer" title="Eliminar playlist" @click="deletePlaylist(item.id)">
            <span class="material-symbols-outlined text-[17px]">delete</span>
          </button>
        </div>
      </div>
    </div>

    <MusicPlaylistAddForm :service-filter="serviceFilter" @added="$emit('switch-queue')" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import MusicPlaylistAddForm from './MusicPlaylistAddForm.vue'

const props = defineProps({ initialService: { type: String, default: 'youtube' } })
const emit = defineEmits(['switch-queue'])
const music = useMusicStore()
const serviceFilter = ref(props.initialService)
watch(() => props.initialService, (v) => { serviceFilter.value = v || 'youtube' })

const filteredPlaylists = computed(() => music.playlists.filter((p) => p.service === serviceFilter.value))
const selectPlaylist = async (id) => { await music.select(id, true); emit('switch-queue') }
const openExternal = (url) => { if (url) window.pomodoroAPI.music.open() }
const deletePlaylist = async (id) => { if (confirm('¿Eliminar esta playlist guardada?')) await music.deletePlaylist(id) }
</script>

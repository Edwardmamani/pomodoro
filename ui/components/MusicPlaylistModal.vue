<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      @click.self="close"
      @keydown.esc="close"
    >
      <div
        class="bg-surface-container-low border border-outline-variant/40 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-on-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <!-- Encabezado -->
        <div class="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"
            >
              <span class="material-symbols-outlined text-[22px]">queue_music</span>
            </div>
            <div>
              <h2 id="modal-title" class="font-headline-md text-on-surface text-[17px]">
                Lista de Reproducción & Playlists
              </h2>
              <p class="font-label-mono-sm text-on-surface-variant text-[11px]">
                Canciones en cola · Playlists de YouTube Music y Spotify
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Cerrar"
            @click="close"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Pestañas Principales: Cola actual vs Playlists guardadas -->
        <div class="px-6 pt-3 pb-2 border-b border-outline-variant/20 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="
              mainTab === 'queue'
                ? 'bg-primary/15 border-primary/40 text-primary shadow-sm font-semibold'
                : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            "
            @click="mainTab = 'queue'"
          >
            <span class="material-symbols-outlined text-[18px]">format_list_numbered</span>
            <span>Canciones en la lista actual</span>
            <span
              v-if="music.playlistTracks.length > 0"
              class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary"
            >
              {{ music.playlistTracks.length }}
            </span>
          </button>

          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="
              mainTab === 'playlists'
                ? 'bg-primary/15 border-primary/40 text-primary shadow-sm font-semibold'
                : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            "
            @click="mainTab = 'playlists'"
          >
            <span class="material-symbols-outlined text-[18px]">library_music</span>
            <span>Otras playlists guardadas</span>
            <span class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
              {{ music.playlists.length }}
            </span>
          </button>
        </div>

        <!-- VISTA 1: ELEMENTOS DE LA LISTA DE REPRODUCCIÓN ACTUAL -->
        <div v-if="mainTab === 'queue'" class="p-6 overflow-y-auto space-y-3 flex-1 min-h-[300px]">
          <!-- Encabezado de la lista actual -->
          <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="font-label-mono-sm text-[10px] text-primary uppercase tracking-wider font-semibold">
                Playlist activa
              </span>
              <h3 class="font-label-md text-on-surface text-[14px] truncate">
                {{ music.active?.name || 'Sin playlist' }}
              </h3>
              <p class="font-label-mono-sm text-on-surface-variant text-[11px] truncate">
                {{ music.currentTrack?.title ? `Reproduciendo: ${music.currentTrack.title}` : 'Cargando pistas...' }}
              </p>
            </div>

            <button
              type="button"
              class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface font-label-mono-sm text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
              title="Abrir esta playlist en el navegador"
              @click="music.open"
            >
              <span class="material-symbols-outlined text-[15px] text-primary">open_in_new</span>
              <span>Abrir en YouTube</span>
            </button>
          </div>

          <!-- Listado de canciones de la playlist -->
          <div v-if="music.playlistTracks.length === 0" class="text-center py-12 text-on-surface-variant font-body-sm">
            <span class="material-symbols-outlined text-[36px] text-outline mb-2">music_note</span>
            <p>No se encontraron pistas individuales para esta selección o es una pista única.</p>
            <p class="font-label-mono-sm text-[11px] text-outline mt-1">
              Introduce una playlist de YouTube Music (ej. con <code class="text-primary">?list=PL...</code>) en la pestaña "Otras playlists" para cargar todas sus canciones.
            </p>
          </div>

          <div v-else class="space-y-1.5">
            <div
              v-for="(track, idx) in music.playlistTracks"
              :key="track.videoId || idx"
              class="group p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer"
              :class="
                music.currentTrack?.index === track.index
                  ? 'bg-primary/15 border-primary/50 shadow-md ring-1 ring-primary/30'
                  : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container'
              "
              @click="music.playTrackAt(track.index)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <!-- Número o indicador de reproducción -->
                <div class="w-6 text-center font-label-mono-sm text-[12px] flex-shrink-0">
                  <span
                    v-if="music.currentTrack?.index === track.index && music.isPlaying"
                    class="material-symbols-outlined text-primary text-[18px] animate-pulse"
                  >
                    graphic_eq
                  </span>
                  <span
                    v-else
                    :class="music.currentTrack?.index === track.index ? 'text-primary font-bold' : 'text-outline'"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>

                <!-- Miniatura -->
                <div
                  class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high border border-outline-variant/30 flex items-center justify-center relative"
                >
                  <img
                    v-if="track.thumbnailUrl"
                    :src="track.thumbnailUrl"
                    :alt="track.title"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span v-else class="material-symbols-outlined text-[18px] text-outline">music_note</span>
                </div>

                <!-- Título y autor -->
                <div class="min-w-0 flex flex-col">
                  <span
                    class="font-label-md text-on-surface truncate text-[13px] group-hover:text-primary transition-colors"
                    :class="{ 'text-primary font-semibold': music.currentTrack?.index === track.index }"
                  >
                    {{ track.title }}
                  </span>
                  <span class="font-label-mono-sm text-on-surface-variant truncate text-[11px]">
                    {{ track.author || 'Pista de YouTube' }}
                  </span>
                </div>
              </div>

              <!-- Estado -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <span
                  v-if="music.currentTrack?.index === track.index"
                  class="font-label-mono-sm text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30"
                >
                  {{ music.isPlaying ? 'Reproduciendo' : 'En pausa' }}
                </span>
                <button
                  type="button"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors opacity-0 group-hover:opacity-100"
                  title="Reproducir esta canción"
                >
                  <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- VISTA 2: OTRAS PLAYLISTS GUARDADAS -->
        <div v-else class="flex flex-col flex-1 min-h-[300px] overflow-hidden">
          <!-- Filtro de servicio para playlists guardadas -->
          <div class="px-6 py-2.5 bg-surface-container-lowest border-b border-outline-variant/20 flex gap-2">
            <button
              type="button"
              class="py-1 px-3 rounded-lg font-label-mono-sm text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer"
              :class="
                serviceFilter === 'youtube'
                  ? 'bg-red-500/15 border-red-500/40 text-red-400 font-semibold'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
              "
              @click="serviceFilter = 'youtube'"
            >
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              <span>YouTube / YouTube Music</span>
            </button>

            <button
              type="button"
              class="py-1 px-3 rounded-lg font-label-mono-sm text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer"
              :class="
                serviceFilter === 'spotify'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface-variant'
              "
              @click="serviceFilter = 'spotify'"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Spotify</span>
            </button>
          </div>

          <!-- Listado de playlists -->
          <div class="p-6 overflow-y-auto space-y-2 flex-1">
            <div
              v-for="item in filteredPlaylists"
              :key="item.id"
              class="group p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer"
              :class="
                music.active?.id === item.id
                  ? 'bg-surface-container-high border-primary/50 shadow-md ring-1 ring-primary/30'
                  : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container'
              "
              @click="selectPlaylist(item.id)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-outline-variant/40 flex items-center justify-center"
                >
                  <span
                    class="material-symbols-outlined text-[20px]"
                    :class="item.service === 'youtube' ? 'text-red-400' : 'text-emerald-400'"
                  >
                    {{ item.service === 'youtube' ? 'smart_display' : 'music_note' }}
                  </span>
                </div>

                <div class="min-w-0 flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="font-label-md text-on-surface truncate group-hover:text-primary transition-colors">
                      {{ item.name }}
                    </span>
                    <span
                      v-if="music.active?.id === item.id"
                      class="font-label-mono-sm text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30 flex-shrink-0"
                    >
                      Activa
                    </span>
                  </div>
                  <span class="font-label-mono-sm text-on-surface-variant truncate text-[11px]">
                    {{ item.external_url }}
                  </span>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                  title="Abrir en el navegador"
                  @click="openExternal(item.external_url)"
                >
                  <span class="material-symbols-outlined text-[17px]">open_in_new</span>
                </button>

                <button
                  v-if="filteredPlaylists.length > 1"
                  type="button"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  title="Eliminar playlist"
                  @click="deletePlaylist(item.id)"
                >
                  <span class="material-symbols-outlined text-[17px]">delete</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Formulario para agregar playlist -->
          <div class="p-4 bg-surface-container-lowest border-t border-outline-variant/30">
            <h4 class="font-label-md text-on-surface text-[12px] mb-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-primary">add_circle</span>
              <span>Añadir playlist o lista de YouTube Music / YouTube</span>
            </h4>

            <form class="space-y-2.5" @submit.prevent="submitNewPlaylist">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    v-model="newName"
                    type="text"
                    placeholder="Nombre (ej. Lo-Fi Study Beats)"
                    required
                    class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary text-[12px]"
                  />
                </div>

                <div>
                  <input
                    v-model="newUrl"
                    type="text"
                    placeholder="https://music.youtube.com/playlist?list=..."
                    required
                    class="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary text-[12px]"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between">
                <span class="font-label-mono-sm text-on-surface-variant text-[10px]">
                  Introduce el enlace completo de la playlist de YouTube Music o YouTube.
                </span>

                <button
                  type="submit"
                  class="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-[12px] flex items-center gap-1 shadow cursor-pointer"
                  :disabled="isSubmitting"
                >
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>Añadir y reproducir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import { parseMediaUrl } from '@/lib/music-parser'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const music = useMusicStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const mainTab = ref('queue')
const serviceFilter = ref('youtube')
const newName = ref('')
const newUrl = ref('')
const isSubmitting = ref(false)

// Sincronizar pestaña inicial si el store especificó una
watch(
  () => isOpen.value,
  (open) => {
    if (open) {
      if (music.modalInitialTab) {
        mainTab.value = music.modalInitialTab
      } else if (music.playlistTracks.length > 0) {
        mainTab.value = 'queue'
      } else {
        mainTab.value = 'playlists'
      }
      serviceFilter.value = music.currentService || 'youtube'
    }
  }
)

const filteredPlaylists = computed(() => {
  return music.playlists.filter((p) => p.service === serviceFilter.value)
})

async function selectPlaylist(id) {
  await music.select(id, true)
  mainTab.value = 'queue'
}

function openExternal(url) {
  if (url) window.pomodoroAPI.music.open()
}

async function deletePlaylist(id) {
  if (confirm('¿Eliminar esta playlist guardada?')) {
    await music.deletePlaylist(id)
  }
}

async function submitNewPlaylist() {
  if (!newName.value.trim() || !newUrl.value.trim()) return

  isSubmitting.value = true
  try {
    const parsed = parseMediaUrl(newUrl.value)
    const detectedService = parsed?.service || serviceFilter.value

    await music.addPlaylist({
      name: newName.value.trim(),
      external_url: newUrl.value.trim(),
      service: detectedService,
      external_id: parsed?.id || null
    })

    newName.value = ''
    newUrl.value = ''
    mainTab.value = 'queue'
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  isOpen.value = false
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in {
  animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>

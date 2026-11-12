<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      @click.self="close"
      @keydown.esc="close"
    >
      <div
        class="bg-surface-container-low border border-outline-variant/40 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-on-surface"
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
                Música de Concentración
              </h2>
              <p class="font-label-mono-sm text-on-surface-variant text-[11px]">
                YouTube (Opción principal integrada) · Spotify (Segunda opción)
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Cerrar"
            @click="close"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Pestañas de Servicios: YouTube (1ª opción) vs Spotify (2ª opción) -->
        <div class="px-6 pt-4 pb-2 border-b border-outline-variant/20 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="
              activeTab === 'youtube'
                ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            "
            @click="activeTab = 'youtube'"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>YouTube</span>
            <span class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300">
              Opción 1
            </span>
          </button>

          <button
            type="button"
            class="flex-1 py-2 px-3 rounded-xl font-label-md flex items-center justify-center gap-2 border transition-all cursor-pointer"
            :class="
              activeTab === 'spotify'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            "
            @click="activeTab = 'spotify'"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Spotify</span>
            <span class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
              Opción 2
            </span>
          </button>
        </div>

        <!-- Lista de Playlists -->
        <div class="p-6 overflow-y-auto space-y-2.5 flex-1 min-h-[220px]">
          <div
            v-if="filteredPlaylists.length === 0"
            class="text-center py-8 text-on-surface-variant font-body-sm"
          >
            No hay listas registradas para {{ activeTab === 'youtube' ? 'YouTube' : 'Spotify' }}.
            <br />
            ¡Añade una enlace abajo!
          </div>

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
              <!-- Thumbnail o icono -->
              <div
                class="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-outline-variant/40 flex items-center justify-center relative"
              >
                <img
                  v-if="getThumbnail(item)"
                  :src="getThumbnail(item)"
                  :alt="item.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <span
                  v-else
                  class="material-symbols-outlined text-[22px]"
                  :class="item.service === 'youtube' ? 'text-red-400' : 'text-emerald-400'"
                >
                  {{ item.service === 'youtube' ? 'smart_display' : 'music_note' }}
                </span>

                <div
                  v-if="music.active?.id === item.id && music.isPlaying"
                  class="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-primary text-[20px] animate-pulse">
                    graphic_eq
                  </span>
                </div>
              </div>

              <div class="min-w-0 flex flex-col">
                <div class="flex items-center gap-2">
                  <span class="font-label-md text-on-surface truncate group-hover:text-primary transition-colors">
                    {{ item.name }}
                  </span>
                  <span
                    v-if="music.active?.id === item.id"
                    class="font-label-mono-sm text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex-shrink-0"
                  >
                    {{ music.isPlaying ? 'Reproduciendo' : 'Seleccionada' }}
                  </span>
                </div>
                <span class="font-label-mono-sm text-on-surface-variant truncate text-[11px]">
                  {{ item.service === 'youtube' ? 'YouTube · Reproducción interna' : 'Spotify · Lista/Pista' }}
                </span>
              </div>
            </div>

            <!-- Acciones individuales -->
            <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
                title="Abrir enlace externo"
                @click="openExternal(item.external_url)"
              >
                <span class="material-symbols-outlined text-[17px]">open_in_new</span>
              </button>

              <button
                v-if="filteredPlaylists.length > 1"
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors"
                title="Eliminar de la lista"
                @click="deletePlaylist(item.id)"
              >
                <span class="material-symbols-outlined text-[17px]">delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Formulario para añadir nueva lista / enlace -->
        <div class="p-6 bg-surface-container-lowest border-t border-outline-variant/30">
          <h3 class="font-label-md text-on-surface text-[13px] mb-2.5 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-primary">add_circle</span>
            <span>Añadir lista o video a {{ activeTab === 'youtube' ? 'YouTube' : 'Spotify' }}</span>
          </h3>

          <form class="space-y-3" @submit.prevent="submitNewPlaylist">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-label-mono-sm text-on-surface-variant text-[11px] mb-1">
                  Nombre
                </label>
                <input
                  v-model="newName"
                  type="text"
                  placeholder="Ej. Lo-Fi Beats para estudiar"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary transition-colors text-[13px]"
                />
              </div>

              <div>
                <label class="block font-label-mono-sm text-on-surface-variant text-[11px] mb-1">
                  Enlace (URL o ID)
                </label>
                <input
                  v-model="newUrl"
                  type="text"
                  :placeholder="
                    activeTab === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : 'https://open.spotify.com/playlist/...'
                  "
                  required
                  class="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm focus:outline-none focus:border-primary transition-colors text-[13px]"
                />
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="font-label-mono-sm text-on-surface-variant text-[10px]">
                {{
                  activeTab === 'youtube'
                    ? 'Admite videos individuales, transmisiones en vivo y listas completas de YouTube.'
                    : 'Admite listas de reproducción, álbumes y pistas de Spotify.'
                }}
              </span>

              <button
                type="submit"
                class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-[13px] flex items-center gap-1.5 shadow transition-all cursor-pointer"
                :disabled="isSubmitting"
              >
                <span class="material-symbols-outlined text-[17px]">save</span>
                <span>Guardar y reproducir</span>
              </button>
            </div>
          </form>
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

const activeTab = ref('youtube')
const newName = ref('')
const newUrl = ref('')
const isSubmitting = ref(false)

// Sincronizar pestaña activa con el servicio actual al abrir
watch(
  () => isOpen.value,
  (open) => {
    if (open) {
      activeTab.value = music.currentService || 'youtube'
    }
  }
)

const filteredPlaylists = computed(() => {
  return music.playlists.filter((p) => p.service === activeTab.value)
})

function getThumbnail(item) {
  if (item.service === 'youtube') {
    const parsed = parseMediaUrl(item.external_url, 'youtube')
    return parsed?.thumbnailUrl || null
  }
  return null
}

async function selectPlaylist(id) {
  await music.select(id, true)
}

function openExternal(url) {
  if (url) window.pomodoroAPI.music.open()
}

async function deletePlaylist(id) {
  if (confirm('¿Eliminar esta lista de música?')) {
    await music.deletePlaylist(id)
  }
}

async function submitNewPlaylist() {
  if (!newName.value.trim() || !newUrl.value.trim()) return

  isSubmitting.value = true
  try {
    const parsed = parseMediaUrl(newUrl.value, activeTab.value)
    const detectedService = parsed?.service || activeTab.value

    await music.addPlaylist({
      name: newName.value.trim(),
      external_url: newUrl.value.trim(),
      service: detectedService,
      external_id: parsed?.id || null
    })

    newName.value = ''
    newUrl.value = ''
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

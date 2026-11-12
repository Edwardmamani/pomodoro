import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseMediaUrl } from '@/lib/music-parser'
import { YouTubeEngine } from '@/lib/youtube-engine'

const VOLUME_STORAGE_KEY = 'pomodoro.music.volume'
const DEFAULT_VOLUME = 75

export const useMusicStore = defineStore('music', () => {
  const playlists = ref([])
  const active = ref(null)

  // Información de la pista actual dentro de la playlist
  const currentTrack = ref({
    title: '',
    author: '',
    videoId: '',
    index: 0
  })

  // Lista de canciones/videos que componen la playlist actual
  const playlistTracks = ref([])

  const isPlaying = ref(false)
  const isBuffering = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(loadStoredVolume())
  const isMuted = ref(false)
  const isShuffle = ref(false)
  const isRepeat = ref(false)

  const showMiniPlayer = ref(false)
  const showPlaylistModal = ref(false)
  const modalInitialTab = ref('queue') // 'queue' o 'playlists'

  let ytEngine = null
  let progressTimer = null

  function loadStoredVolume() {
    try {
      const val = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
      if (!isNaN(val) && val >= 0 && val <= 100) return val
    } catch {
      /* ignore */
    }
    return DEFAULT_VOLUME
  }

  function saveStoredVolume(val) {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.round(val)))
    } catch {
      /* ignore */
    }
  }

  const parsedMedia = computed(() => {
    if (!active.value?.external_url) return null
    return parseMediaUrl(active.value.external_url, active.value.service)
  })

  const currentService = computed(() => {
    return active.value?.service || 'youtube'
  })

  const currentTrackTitle = computed(() => {
    return currentTrack.value?.title || active.value?.name || 'Sin reproducción'
  })

  const currentTrackSubtitle = computed(() => {
    if (currentService.value === 'spotify') {
      return 'Spotify · Abrir en cliente o mini-player'
    }
    const parts = []
    if (currentTrack.value?.author) parts.push(currentTrack.value.author)
    if (active.value?.name) parts.push(active.value.name)
    if (playlistTracks.value.length > 1) {
      parts.push(`Pista ${currentTrack.value.index + 1} de ${playlistTracks.value.length}`)
    }
    return parts.length > 0 ? parts.join(' · ') : 'YouTube Music'
  })

  const progressPercent = computed(() => {
    if (!duration.value || duration.value <= 0) return 0
    return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
  })

  // Sincronizar información de la pista y de la lista desde el reproductor
  function syncTrackInfo() {
    if (!ytEngine || currentService.value !== 'youtube') return

    const data = ytEngine.getVideoData() || {}
    const ids = ytEngine.getPlaylist() || []
    const idx = ytEngine.getPlaylistIndex() || 0
    const engineTracks = typeof ytEngine.getTracks === 'function' ? ytEngine.getTracks() : []
    const dur = ytEngine.getDuration()

    if (dur > 0) {
      duration.value = dur
    }

    if (data.title) {
      currentTrack.value = {
        title: data.title,
        author: data.author || '',
        videoId: data.video_id || '',
        index: idx
      }
    }

    if (engineTracks.length > 0) {
      playlistTracks.value = engineTracks.map((t, i) => ({
        index: i,
        videoId: t.videoId,
        title: t.title || `Pista ${i + 1}`,
        author: t.author || '',
        duration: t.duration || 0,
        durationText: t.durationText || '',
        thumbnailUrl: t.thumbnailUrl || `https://img.youtube.com/vi/${t.videoId}/mqdefault.jpg`
      }))
    } else if (ids.length > 0) {
      // Reconstruir lista de pistas si cambió (modo fallback IFrame)
      const hasChanged =
        playlistTracks.value.length !== ids.length ||
        (playlistTracks.value[0] && playlistTracks.value[0].videoId !== ids[0])

      if (hasChanged) {
        playlistTracks.value = ids.map((id, i) => ({
          index: i,
          videoId: id,
          title: i === idx && data.title ? data.title : `Pista ${i + 1}`,
          author: i === idx && data.author ? data.author : '',
          thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
        }))

        // Consultar títulos en segundo plano para poblar la lista
        fetchTitlesForIds(ids)
      } else if (playlistTracks.value[idx]) {
        if (data.title) playlistTracks.value[idx].title = data.title
        if (data.author) playlistTracks.value[idx].author = data.author
      }
    } else if (data.title) {
      playlistTracks.value = [
        {
          index: 0,
          videoId: data.video_id || '',
          title: data.title,
          author: data.author || '',
          thumbnailUrl: data.video_id ? `https://img.youtube.com/vi/${data.video_id}/mqdefault.jpg` : null
        }
      ]
    }
  }

  async function fetchTitlesForIds(ids) {
    if (!ids || ids.length === 0 || !window.pomodoroAPI?.music?.fetchTrackTitles) return
    try {
      const res = await window.pomodoroAPI.music.fetchTrackTitles(ids)
      if (res.ok && res.data) {
        playlistTracks.value.forEach((track) => {
          const info = res.data[track.videoId]
          if (info && info.title) {
            track.title = info.title
            if (info.author) track.author = info.author
          }
        })
      }
    } catch (err) {
      console.warn('Error al obtener títulos de pistas:', err)
    }
  }

  // Iniciar el motor de YouTube en el contenedor DOM provisto
  async function initPlayer(containerId = 'yt-player-host') {
    if (ytEngine) return

    ytEngine = new YouTubeEngine(containerId, {
      onReady: () => {
        ytEngine.setVolume(isMuted.value ? 0 : volume.value)
        if (parsedMedia.value && currentService.value === 'youtube') {
          ytEngine.load(parsedMedia.value, false)
        }
      },
      onTrackChange: () => {
        syncTrackInfo()
      },
      onStateChange: (event) => {
        const state = event.data
        syncTrackInfo()

        if (state === 1) {
          // PLAYING
          isPlaying.value = true
          isBuffering.value = false
          startProgressTracking()
        } else if (state === 2) {
          // PAUSED
          isPlaying.value = false
          isBuffering.value = false
          stopProgressTracking()
        } else if (state === 3) {
          // BUFFERING
          isBuffering.value = true
        } else if (state === 5) {
          // CUED (lista cargada y lista para reproducir)
          isBuffering.value = false
          syncTrackInfo()
        } else if (state === 0) {
          // ENDED
          isPlaying.value = false
          stopProgressTracking()
          currentTime.value = 0
          if (isRepeat.value) {
            play()
          } else {
            next()
          }
        }
      },
      onError: (err) => {
        console.warn('Error en YouTube Engine:', err)
        isPlaying.value = false
        isBuffering.value = false
        stopProgressTracking()
      }
    })

    try {
      await ytEngine.init()
    } catch (err) {
      console.warn('No se pudo inicializar YouTube Engine:', err)
    }
  }

  function startProgressTracking() {
    stopProgressTracking()
    progressTimer = setInterval(() => {
      if (ytEngine && currentService.value === 'youtube') {
        const cur = ytEngine.getCurrentTime()
        const dur = ytEngine.getDuration()
        currentTime.value = cur
        if (dur > 0) duration.value = dur
        syncTrackInfo()
      }
    }, 400)
  }

  function stopProgressTracking() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  async function refresh() {
    const [listRes, activeRes] = await Promise.all([
      window.pomodoroAPI.music.list(),
      window.pomodoroAPI.music.getActive()
    ])

    if (listRes.ok) {
      playlists.value = listRes.data
    }

    if (activeRes.ok && activeRes.data) {
      active.value = activeRes.data
      if (
        ytEngine &&
        currentService.value === 'youtube' &&
        parsedMedia.value &&
        playlistTracks.value.length === 0
      ) {
        ytEngine.load(parsedMedia.value, false)
      }
    } else if (playlists.value.length > 0) {
      const defaultPl =
        playlists.value.find((p) => p.service === 'youtube') || playlists.value[0]
      await select(defaultPl.id)
    }
  }

  async function select(id, startPlaying = true) {
    const res = await window.pomodoroAPI.music.select(id)
    if (!res.ok) return res

    active.value = res.data
    currentTime.value = 0
    duration.value = 0
    currentTrack.value = { title: '', author: '', videoId: '', index: 0 }
    playlistTracks.value = []

    if (currentService.value === 'youtube' && parsedMedia.value) {
      if (ytEngine) {
        ytEngine.load(parsedMedia.value, startPlaying)
        if (startPlaying) {
          isPlaying.value = true
          startProgressTracking()
        }
      }
    } else if (currentService.value === 'spotify') {
      if (ytEngine) ytEngine.pause()
      isPlaying.value = startPlaying
      if (startPlaying) showMiniPlayer.value = true
    }

    return res
  }

  function play() {
    if (currentService.value === 'youtube') {
      if (ytEngine) {
        const playlist = ytEngine.getPlaylist()
        // Si no hay lista en curso o aún no arrancó la reproducción, cargar parsedMedia activamente
        if ((!playlist || playlist.length === 0) && parsedMedia.value) {
          ytEngine.load(parsedMedia.value, true)
        } else {
          ytEngine.play()
        }
        isPlaying.value = true
        startProgressTracking()
      }
    } else {
      isPlaying.value = true
      showMiniPlayer.value = true
    }
  }

  function pause() {
    if (currentService.value === 'youtube') {
      if (ytEngine) {
        ytEngine.pause()
      }
    } else {
      isPlaying.value = false
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function seekTo(seconds) {
    if (currentService.value === 'youtube' && ytEngine) {
      currentTime.value = seconds
      ytEngine.seekTo(seconds)
    }
  }

  function seekByPercent(percent) {
    if (duration.value > 0) {
      const targetSec = (Math.max(0, Math.min(100, percent)) / 100) * duration.value
      seekTo(targetSec)
    }
  }

  function setVolume(newVal) {
    const clamped = Math.max(0, Math.min(100, newVal))
    volume.value = clamped
    saveStoredVolume(clamped)
    if (isMuted.value && clamped > 0) {
      isMuted.value = false
    }
    if (ytEngine) {
      ytEngine.setVolume(isMuted.value ? 0 : clamped)
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (ytEngine) {
      if (isMuted.value) {
        ytEngine.mute()
      } else {
        ytEngine.unMute()
        ytEngine.setVolume(volume.value)
      }
    }
  }

  // Reproducir una pista específica por índice dentro de la playlist
  function playTrackAt(index) {
    if (ytEngine && currentService.value === 'youtube') {
      ytEngine.playVideoAt(index)
      currentTrack.value.index = index
      isPlaying.value = true
      startProgressTracking()
    }
  }

  // Siguiente canción en la playlist actual (o siguiente playlist si es única)
  function next() {
    if (currentService.value === 'youtube' && ytEngine) {
      const advanced = ytEngine.next()
      if (advanced) {
        return
      }
    }

    // Si no había siguiente canción en la playlist, pasar a la siguiente playlist guardada
    if (playlists.value.length === 0) return
    const idx = playlists.value.findIndex((p) => p.id === active.value?.id)
    if (idx === -1) {
      select(playlists.value[0].id, isPlaying.value)
      return
    }

    let nextIdx
    if (isShuffle.value && playlists.value.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * playlists.value.length)
      } while (nextIdx === idx)
    } else {
      nextIdx = (idx + 1) % playlists.value.length
    }

    select(playlists.value[nextIdx].id, isPlaying.value)
  }

  // Canción anterior en la playlist actual (o reiniciar pista / anterior playlist)
  function prev() {
    if (currentTime.value > 3) {
      seekTo(0)
      return
    }

    if (currentService.value === 'youtube' && ytEngine) {
      const moved = ytEngine.prev()
      if (moved) return
    }

    if (playlists.value.length === 0) return
    const idx = playlists.value.findIndex((p) => p.id === active.value?.id)
    if (idx === -1) {
      select(playlists.value[0].id, isPlaying.value)
      return
    }

    const prevIdx = (idx - 1 + playlists.value.length) % playlists.value.length
    select(playlists.value[prevIdx].id, isPlaying.value)
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value
    if (ytEngine) ytEngine.setShuffle(isShuffle.value)
  }

  function toggleRepeat() {
    isRepeat.value = !isRepeat.value
    if (ytEngine) ytEngine.setLoop(isRepeat.value)
  }

  function toggleMiniPlayer() {
    showMiniPlayer.value = !showMiniPlayer.value
  }

  function openQueueModal() {
    modalInitialTab.value = 'queue'
    showPlaylistModal.value = true
  }

  function openPlaylistsModal() {
    modalInitialTab.value = 'playlists'
    showPlaylistModal.value = true
  }

  function open() {
    if (active.value?.external_url) {
      return window.pomodoroAPI.music.open()
    }
  }

  async function addPlaylist(input) {
    const res = await window.pomodoroAPI.music.add(input)
    if (res.ok) {
      await refresh()
      await select(res.data.id, true)
    }
    return res
  }

  async function deletePlaylist(id) {
    const res = await window.pomodoroAPI.music.delete(id)
    if (res.ok) {
      await refresh()
    }
    return res
  }

  return {
    playlists,
    active,
    currentTrack,
    playlistTracks,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    showMiniPlayer,
    showPlaylistModal,
    modalInitialTab,
    parsedMedia,
    currentService,
    currentTrackTitle,
    currentTrackSubtitle,
    progressPercent,
    initPlayer,
    refresh,
    select,
    play,
    pause,
    togglePlay,
    seekTo,
    seekByPercent,
    setVolume,
    toggleMute,
    playTrackAt,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    toggleMiniPlayer,
    openQueueModal,
    openPlaylistsModal,
    open,
    addPlaylist,
    deletePlaylist
  }
})

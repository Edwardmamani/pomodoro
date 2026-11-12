import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseMediaUrl } from '@/lib/music-parser'
import { YouTubeEngine } from '@/lib/youtube-engine'

const VOLUME_STORAGE_KEY = 'pomodoro.music.volume'
const DEFAULT_VOLUME = 75

export const useMusicStore = defineStore('music', () => {
  const playlists = ref([])
  const active = ref(null)

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

  const progressPercent = computed(() => {
    if (!duration.value || duration.value <= 0) return 0
    return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
  })

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
      onStateChange: (event) => {
        // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        const state = event.data
        if (state === 1) {
          isPlaying.value = true
          isBuffering.value = false
          startProgressTracking()
        } else if (state === 2) {
          isPlaying.value = false
          isBuffering.value = false
          stopProgressTracking()
        } else if (state === 3) {
          isBuffering.value = true
        } else if (state === 0) {
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
        isBuffering.value = false
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
      }
    }, 300)
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
    } else if (playlists.value.length > 0) {
      // Priorizar YouTube si no hay activa
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

    if (currentService.value === 'youtube' && parsedMedia.value) {
      if (ytEngine) {
        ytEngine.load(parsedMedia.value, startPlaying)
        if (startPlaying) {
          isPlaying.value = true
          startProgressTracking()
        }
      }
    } else if (currentService.value === 'spotify') {
      // Para Spotify, pausar YouTube
      if (ytEngine) ytEngine.pause()
      isPlaying.value = startPlaying
      // Si el usuario quiere reproducir spotify, mostramos el mini-player para interactuar
      if (startPlaying) showMiniPlayer.value = true
    }

    return res
  }

  function play() {
    if (currentService.value === 'youtube') {
      if (ytEngine) {
        ytEngine.play()
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

  function next() {
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

  function prev() {
    if (currentTime.value > 3) {
      seekTo(0)
      return
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
    parsedMedia,
    currentService,
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
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    toggleMiniPlayer,
    open,
    addPlaylist,
    deletePlaylist
  }
})

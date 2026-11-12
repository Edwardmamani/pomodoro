import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseMediaUrl } from '@/lib/music-parser'
import { MusicTrackSync } from '@/lib/music-track-sync'
import { MusicPlayerController } from '@/lib/music-player-controller'

export const useMusicStore = defineStore('music', () => {
  const playlists = ref([])
  const active = ref(null)
  const currentTrack = ref({ title: '', author: '', videoId: '', index: 0 })
  const playlistTracks = ref([])
  const isPlaying = ref(false)
  const isBuffering = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(MusicTrackSync.loadStoredVolume())
  const isMuted = ref(false)
  const isShuffle = ref(false)
  const isRepeat = ref(false)
  const showMiniPlayer = ref(false)
  const showPlaylistModal = ref(false)
  const modalInitialTab = ref('queue')

  const parsedMedia = computed(() => active.value?.external_url ? parseMediaUrl(active.value.external_url, active.value.service) : null)
  const currentService = computed(() => active.value?.service || 'youtube')
  const currentTrackTitle = computed(() => currentTrack.value?.title || active.value?.name || 'Sin reproducción')
  const currentTrackSubtitle = computed(() => {
    if (currentService.value === 'spotify') return 'Spotify · Abrir en cliente o mini-player'
    const parts = [currentTrack.value?.author, active.value?.name].filter(Boolean)
    if (playlistTracks.value.length > 1) parts.push(`Pista ${currentTrack.value.index + 1} de ${playlistTracks.value.length}`)
    return parts.length ? parts.join(' · ') : 'YouTube Music'
  })
  const progressPercent = computed(() => duration.value > 0 ? Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100)) : 0)

  const state = { playlists, active, currentTrack, playlistTracks, isPlaying, isBuffering, currentTime, duration, volume, isMuted, isShuffle, isRepeat, showMiniPlayer, parsedMedia, currentService }
  const ctrl = new MusicPlayerController(state, { select })

  async function refresh() {
    const [listRes, activeRes] = await Promise.all([window.pomodoroAPI.music.list(), window.pomodoroAPI.music.getActive()])
    if (listRes.ok) playlists.value = listRes.data
    if (activeRes.ok && activeRes.data) {
      active.value = activeRes.data
      if (ctrl.ytEngine && currentService.value === 'youtube' && parsedMedia.value && !playlistTracks.value.length) {
        ctrl.ytEngine.load(parsedMedia.value, false)
      }
    } else if (playlists.value.length > 0) {
      await select((playlists.value.find((p) => p.service === 'youtube') || playlists.value[0]).id)
    }
  }

  async function select(id, startPlaying = true) {
    const res = await window.pomodoroAPI.music.select(id)
    if (!res.ok) return res
    active.value = res.data; currentTime.value = 0; duration.value = 0
    currentTrack.value = { title: '', author: '', videoId: '', index: 0 }; playlistTracks.value = []
    if (currentService.value === 'youtube' && parsedMedia.value && ctrl.ytEngine) {
      ctrl.ytEngine.load(parsedMedia.value, startPlaying)
      if (startPlaying) { isPlaying.value = true; ctrl.startProgressTracking() }
    } else if (currentService.value === 'spotify') {
      ctrl.ytEngine?.pause(); isPlaying.value = startPlaying; if (startPlaying) showMiniPlayer.value = true
    }
    return res
  }

  const togglePlay = () => (isPlaying.value ? ctrl.pause() : ctrl.play())
  const seekByPercent = (pct) => { if (duration.value > 0) ctrl.seekTo((Math.max(0, Math.min(100, pct)) / 100) * duration.value) }
  const toggleShuffle = () => { isShuffle.value = !isShuffle.value; ctrl.ytEngine?.setShuffle(isShuffle.value) }
  const toggleRepeat = () => { isRepeat.value = !isRepeat.value; ctrl.ytEngine?.setLoop(isRepeat.value) }
  const toggleMiniPlayer = () => { showMiniPlayer.value = !showMiniPlayer.value }
  const openQueueModal = () => { modalInitialTab.value = 'queue'; showPlaylistModal.value = true }
  const openPlaylistsModal = () => { modalInitialTab.value = 'playlists'; showPlaylistModal.value = true }
  const open = () => (active.value?.external_url ? window.pomodoroAPI.music.open() : undefined)

  async function addPlaylist(input) {
    const res = await window.pomodoroAPI.music.add(input)
    if (res.ok) { await refresh(); await select(res.data.id, true) }
    return res
  }
  async function deletePlaylist(id) {
    const res = await window.pomodoroAPI.music.delete(id)
    if (res.ok) await refresh()
    return res
  }

  return {
    playlists, active, currentTrack, playlistTracks, isPlaying, isBuffering, currentTime, duration,
    volume, isMuted, isShuffle, isRepeat, showMiniPlayer, showPlaylistModal, modalInitialTab,
    parsedMedia, currentService, currentTrackTitle, currentTrackSubtitle, progressPercent,
    initPlayer: (id) => ctrl.initPlayer(id), refresh, select, play: () => ctrl.play(), pause: () => ctrl.pause(),
    togglePlay, seekTo: (s) => ctrl.seekTo(s), seekByPercent, setVolume: (v) => ctrl.setVolume(v),
    toggleMute: () => ctrl.toggleMute(), playTrackAt: (i) => ctrl.playTrackAt(i), next: () => ctrl.next(),
    prev: () => ctrl.prev(), toggleShuffle, toggleRepeat, toggleMiniPlayer, openQueueModal,
    openPlaylistsModal, open, addPlaylist, deletePlaylist
  }
})

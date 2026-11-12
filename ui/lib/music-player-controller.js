import { YouTubeEngine } from '@/lib/youtube-engine'
import { MusicTrackSync } from '@/lib/music-track-sync'

export class MusicPlayerController {
  constructor(state, actions) {
    this.state = state
    this.actions = actions
    this.ytEngine = null
    this.progressTimer = null
  }

  syncTrackInfo() { MusicTrackSync.syncFromEngine(this.ytEngine, this.state) }

  async initPlayer(containerId = 'yt-player-host') {
    if (this.ytEngine) return
    const s = this.state
    this.ytEngine = new YouTubeEngine(containerId, {
      onReady: () => {
        this.ytEngine.setVolume(s.isMuted.value ? 0 : s.volume.value)
        if (s.parsedMedia.value && s.currentService.value === 'youtube') this.ytEngine.load(s.parsedMedia.value, false)
      },
      onTrackChange: () => this.syncTrackInfo(),
      onStateChange: (ev) => this._handleStateChange(ev.data),
      onError: () => { s.isPlaying.value = false; s.isBuffering.value = false; this.stopProgressTracking() }
    })
    try { await this.ytEngine.init() } catch (err) { console.warn('No se pudo inicializar YouTube Engine:', err) }
  }

  _handleStateChange(code) {
    const s = this.state
    this.syncTrackInfo()
    if (code === 1) { s.isPlaying.value = true; s.isBuffering.value = false; this.startProgressTracking() }
    else if (code === 2) { s.isPlaying.value = false; s.isBuffering.value = false; this.stopProgressTracking() }
    else if (code === 3) { s.isBuffering.value = true }
    else if (code === 5) { s.isBuffering.value = false; this.syncTrackInfo() }
    else if (code === 0) {
      s.isPlaying.value = false; this.stopProgressTracking(); s.currentTime.value = 0
      s.isRepeat.value ? this.play() : this.next()
    }
  }

  startProgressTracking() {
    this.stopProgressTracking()
    this.progressTimer = setInterval(() => {
      if (!this.ytEngine || this.state.currentService.value !== 'youtube') return
      this.state.currentTime.value = this.ytEngine.getCurrentTime()
      const dur = this.ytEngine.getDuration()
      if (dur > 0) this.state.duration.value = dur
      this.syncTrackInfo()
    }, 400)
  }

  stopProgressTracking() { if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null } }

  play() {
    const s = this.state
    if (s.currentService.value === 'youtube') {
      if (!this.ytEngine) return
      const pl = this.ytEngine.getPlaylist()
      if ((!pl || pl.length === 0) && s.parsedMedia.value) this.ytEngine.load(s.parsedMedia.value, true)
      else this.ytEngine.play()
      s.isPlaying.value = true; this.startProgressTracking()
    } else { s.isPlaying.value = true; s.showMiniPlayer.value = true }
  }

  pause() {
    if (this.state.currentService.value === 'youtube') this.ytEngine?.pause()
    else this.state.isPlaying.value = false
  }

  seekTo(seconds) {
    if (this.state.currentService.value === 'youtube' && this.ytEngine) {
      this.state.currentTime.value = seconds; this.ytEngine.seekTo(seconds)
    }
  }

  setVolume(newVal) {
    const clamped = Math.max(0, Math.min(100, newVal))
    this.state.volume.value = clamped
    MusicTrackSync.saveStoredVolume(clamped)
    if (this.state.isMuted.value && clamped > 0) this.state.isMuted.value = false
    this.ytEngine?.setVolume(this.state.isMuted.value ? 0 : clamped)
  }

  toggleMute() {
    this.state.isMuted.value = !this.state.isMuted.value
    if (!this.ytEngine) return
    if (this.state.isMuted.value) this.ytEngine.mute()
    else { this.ytEngine.unMute(); this.ytEngine.setVolume(this.state.volume.value) }
  }

  playTrackAt(index) {
    if (this.ytEngine && this.state.currentService.value === 'youtube') {
      this.ytEngine.playVideoAt(index); this.state.currentTrack.value.index = index
      this.state.isPlaying.value = true; this.startProgressTracking()
    }
  }

  next() {
    const s = this.state
    if (s.currentService.value === 'youtube' && this.ytEngine?.next()) return
    if (!s.playlists.value.length) return
    const idx = s.playlists.value.findIndex((p) => p.id === s.active.value?.id)
    if (idx === -1) return this.actions.select(s.playlists.value[0].id, s.isPlaying.value)
    let nextIdx = (idx + 1) % s.playlists.value.length
    if (s.isShuffle.value && s.playlists.value.length > 1) {
      do { nextIdx = Math.floor(Math.random() * s.playlists.value.length) } while (nextIdx === idx)
    }
    this.actions.select(s.playlists.value[nextIdx].id, s.isPlaying.value)
  }

  prev() {
    const s = this.state
    if (s.currentTime.value > 3) return this.seekTo(0)
    if (s.currentService.value === 'youtube' && this.ytEngine?.prev()) return
    if (!s.playlists.value.length) return
    const idx = s.playlists.value.findIndex((p) => p.id === s.active.value?.id)
    this.actions.select(s.playlists.value[idx === -1 ? 0 : (idx - 1 + s.playlists.value.length) % s.playlists.value.length].id, s.isPlaying.value)
  }
}

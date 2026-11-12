export class VlcAudioDriver {
  constructor(engine) {
    this.engine = engine
    this.time = 0
    this.duration = 0
    this.pollTimer = null
  }

  static isSupported() {
    return Boolean(typeof window !== 'undefined' && window.pomodoroAPI?.music?.vlcPlay && window.pomodoroAPI?.music?.vlcGetStatus)
  }

  async init() {
    this.engine._initVirtualPlayer()
    return true
  }

  startPolling() {
    this.stopPolling()
    this.pollTimer = setInterval(async () => {
      if (!window.pomodoroAPI?.music?.vlcGetStatus) return
      try {
        const res = await window.pomodoroAPI.music.vlcGetStatus()
        if (!res?.ok || !res.data) return
        this.time = Number(res.data.time) || 0
        if (res.data.duration > 0) this.duration = Number(res.data.duration)
        if (res.data.ended) {
          this.stopPolling()
          this.engine.state = 0
          this.engine.options.onStateChange?.({ data: 0 })
        }
      } catch { /* ignore */ }
    }, 500)
  }

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
  }

  async stopForLoad() {
    this.stopPolling()
    this.time = 0
    this.duration = 0
    await window.pomodoroAPI.music.vlcStop()
  }

  async playTrack(track, token) {
    const e = this.engine
    await window.pomodoroAPI.music.vlcSetVolume(e.muted ? 0 : e.volume)
    const res = await window.pomodoroAPI.music.vlcPlay(track.videoId)
    if (token !== e._loadToken) return false
    if (!res?.ok || !res.data) {
      e.options.onError?.({ data: res?.error || 'VLC_ERROR' })
      return false
    }
    Object.assign(track, { title: res.data.title || track.title, author: res.data.author || track.author, duration: res.data.duration || track.duration })
    e._updateCurrentTrackMetadata(track)
    e.loadedVideoId = track.videoId
    this.time = 0
    this.duration = Number(res.data.duration || track.duration || 0)
    e.state = 1
    this.startPolling()
    e.options.onTrackChange?.()
    e.options.onStateChange?.({ data: 1 })
    return true
  }

  async play() {
    const e = this.engine
    if (e.loadedVideoId) {
      await window.pomodoroAPI.music.vlcResume()
      e.state = 1
      this.startPolling()
      e.options.onStateChange?.({ data: 1 })
    } else if (e.tracks.length > 0) {
      await e.playVideoAt(e.currentIndex >= 0 ? e.currentIndex : 0)
    }
  }

  pause() {
    this.stopPolling()
    window.pomodoroAPI.music.vlcPause().catch(() => {})
    this.engine.state = 2
    this.engine.options.onStateChange?.({ data: 2 })
  }

  seekTo(seconds) {
    if (!this.engine.loadedVideoId) return
    this.time = Math.max(0, seconds)
    window.pomodoroAPI.music.vlcSeek(this.time).catch(() => {})
  }

  setVolume(vol) { window.pomodoroAPI.music.vlcSetVolume(this.engine.muted ? 0 : vol).catch(() => {}) }
  mute() { window.pomodoroAPI.music.vlcSetVolume(0).catch(() => {}) }
  unMute() { window.pomodoroAPI.music.vlcSetVolume(this.engine.volume).catch(() => {}) }
  getCurrentTime() { return this.time || 0 }
  getDuration() { return this.duration || this.engine.currentTrackInfo?.duration || 0 }

  destroy() {
    this.stopPolling()
    window.pomodoroAPI?.music?.vlcStop?.().catch(() => {})
  }
}

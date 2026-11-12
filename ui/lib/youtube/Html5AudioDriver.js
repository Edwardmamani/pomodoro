export class Html5AudioDriver {
  constructor(engine) {
    this.engine = engine
    this.audio = null
  }

  static isSupported() {
    return Boolean(typeof window !== 'undefined' && window.pomodoroAPI?.music?.getAudioStream && window.pomodoroAPI?.music?.fetchPlaylistTracks)
  }

  async init() {
    this.audio = typeof Audio !== 'undefined' ? new Audio() : this._createMockAudio()
    this.audio.preload = 'auto'
    this.engine._initVirtualPlayer()
    this._bindEvents()
    return true
  }

  _createMockAudio() {
    return {
      src: '', currentTime: 0, duration: 0, volume: 0.75, muted: false, paused: true, ended: false,
      play: async function () { this.paused = false },
      pause: function () { this.paused = true },
      removeAttribute: function () { this.src = '' },
      addEventListener: function () {}
    }
  }

  _bindEvents() {
    if (typeof this.audio.addEventListener !== 'function') return
    const e = this.engine
    this.audio.addEventListener('playing', () => { e.state = 1; e.options.onStateChange?.({ data: 1 }) })
    this.audio.addEventListener('pause', () => { if (!this.audio.ended) { e.state = 2; e.options.onStateChange?.({ data: 2 }) } })
    this.audio.addEventListener('waiting', () => { e.state = 3; e.options.onStateChange?.({ data: 3 }) })
    this.audio.addEventListener('ended', () => { e.state = 0; e.options.onStateChange?.({ data: 0 }) })
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio.duration && isFinite(this.audio.duration) && e.currentTrackInfo) {
        e.currentTrackInfo.duration = Math.round(this.audio.duration)
      }
      e.options.onTrackChange?.()
    })
    this.audio.addEventListener('error', () => e.options.onError?.({ data: this.audio.error?.code || -1 }))
  }

  async stopForLoad() {
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src') }
  }

  async playTrack(track, token) {
    const e = this.engine
    const res = await window.pomodoroAPI.music.getAudioStream(track.videoId)
    if (token !== e._loadToken) return false
    if (!res?.ok || !res.data?.url) {
      e.options.onError?.({ data: res?.error || 'STREAM_ERROR' })
      return false
    }
    Object.assign(track, { title: res.data.title || track.title, author: res.data.author || track.author, duration: res.data.duration || track.duration })
    e._updateCurrentTrackMetadata(track)
    e.loadedVideoId = track.videoId
    this.audio.src = res.data.url
    this.audio.currentTime = 0
    this.audio.volume = e.muted ? 0 : Math.max(0, Math.min(1, e.volume / 100))
    this.audio.muted = e.muted
    await this.audio.play()
    e.state = 1
    e.options.onTrackChange?.()
    e.options.onStateChange?.({ data: 1 })
    return true
  }

  async play() {
    const e = this.engine
    if (e.loadedVideoId && this.audio?.src) {
      await this.audio.play()
      e.state = 1
      e.options.onStateChange?.({ data: 1 })
    } else if (e.tracks.length > 0) {
      await e.playVideoAt(e.currentIndex >= 0 ? e.currentIndex : 0)
    }
  }

  pause() {
    if (this.audio) { this.audio.pause(); this.engine.state = 2; this.engine.options.onStateChange?.({ data: 2 }) }
  }

  seekTo(seconds) { if (this.audio && this.engine.loadedVideoId) this.audio.currentTime = Math.max(0, seconds) }
  setVolume(vol) { if (this.audio) this.audio.volume = this.engine.muted ? 0 : vol / 100 }
  mute() { if (this.audio) this.audio.muted = true }
  unMute() {
    if (this.audio) { this.audio.muted = false; this.audio.volume = Math.max(0, Math.min(1, this.engine.volume / 100)) }
  }
  setLoop(loop) { if (this.audio) this.audio.loop = !!loop }
  getCurrentTime() { return this.audio?.currentTime || 0 }
  getDuration() {
    return (this.audio?.duration && isFinite(this.audio.duration) && this.audio.duration > 0)
      ? this.audio.duration : (this.engine.currentTrackInfo?.duration || 0)
  }
  destroy() {
    if (this.audio) { try { this.audio.pause(); this.audio.removeAttribute('src') } catch { /* ignore */ } this.audio = null }
  }
}

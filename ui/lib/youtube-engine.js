import { VlcAudioDriver } from './youtube/VlcAudioDriver.js'
import { Html5AudioDriver } from './youtube/Html5AudioDriver.js'
import { IFrameYouTubeDriver, loadYouTubeIFrameAPI } from './youtube/IFrameYouTubeDriver.js'
import { NativePlaylistLoader } from './youtube/NativePlaylistLoader.js'

export { loadYouTubeIFrameAPI }

export class YouTubeEngine {
  constructor(containerId, options = {}) {
    Object.assign(this, {
      containerId, options, player: null, driver: null, useNativeAudio: false, isReady: false,
      pendingLoad: null, tracks: [], playlistIds: [], currentIndex: 0, currentTrackInfo: null,
      loadedVideoId: null, volume: 75, muted: false, shuffle: false, loop: false, state: -1, _loadToken: 0
    })
  }

  _initVirtualPlayer() {
    const self = this
    this.player = {
      get volume() { return self.volume }, set volume(v) { self.volume = v },
      get muted() { return self.muted }, set muted(v) { self.muted = v }
    }
  }

  _onDriverReady(ev = { target: this }) {
    this.isReady = true
    this.options.onReady?.(ev)
    if (this.pendingLoad) {
      const { parsed, autoplay } = this.pendingLoad
      this.pendingLoad = null
      this.load(parsed, autoplay)
    }
  }

  async init() {
    if (VlcAudioDriver.isSupported()) {
      this.useNativeAudio = true
      this.driver = new VlcAudioDriver(this)
    } else if (Html5AudioDriver.isSupported()) {
      this.useNativeAudio = true
      this.driver = new Html5AudioDriver(this)
    } else {
      this.driver = new IFrameYouTubeDriver(this)
    }
    const ok = await this.driver.init()
    if (ok && this.useNativeAudio) this._onDriverReady()
    return this
  }

  _updateCurrentTrackMetadata(track) {
    if (!track) return
    this.currentTrackInfo = {
      video_id: track.videoId,
      title: track.title || `Pista ${(track.index ?? 0) + 1}`,
      author: track.author || '',
      duration: track.duration || 0,
      thumbnailUrl: track.thumbnailUrl || `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`
    }
  }

  async load(parsed, autoplay = true) {
    if (!parsed) return
    if (!this.isReady || !this.player) { this.pendingLoad = { parsed, autoplay }; return }
    if (this.useNativeAudio) return NativePlaylistLoader.load(this, parsed, autoplay)
    this.driver.load(parsed, autoplay)
  }

  async playVideoAt(index) {
    if (!this.useNativeAudio) return this.driver?.playVideoAt?.(index)
    if (index < 0 || index >= this.tracks.length) return
    const token = ++this._loadToken
    this.currentIndex = index
    this._updateCurrentTrackMetadata(this.tracks[index])
    try { await this.driver.stopForLoad() } catch { /* ignore */ }
    this.state = 3
    this.options.onTrackChange?.()
    this.options.onStateChange?.({ data: 3 })
    try { await this.driver.playTrack(this.tracks[index], token) } catch (err) { this.options.onError?.({ data: err.message }) }
  }

  play() { return this.driver?.play?.() }
  pause() { return this.driver?.pause?.() }
  seekTo(seconds) { return this.driver?.seekTo?.(seconds) }
  setVolume(volume) { this.volume = Math.max(0, Math.min(100, volume)); this.driver?.setVolume?.(this.volume) }
  mute() { this.muted = true; this.driver?.mute?.() }
  unMute() { this.muted = false; this.driver?.unMute?.() }

  next() {
    if (!this.useNativeAudio) return this.driver?.next?.() || false
    if (!this.tracks.length) return false
    let nextIdx = (this.currentIndex + 1) % this.tracks.length
    if (this.shuffle && this.tracks.length > 1) {
      do { nextIdx = Math.floor(Math.random() * this.tracks.length) } while (nextIdx === this.currentIndex)
    }
    this.playVideoAt(nextIdx); return true
  }

  prev() {
    if (!this.useNativeAudio) return this.driver?.prev?.() || false
    if (this.getCurrentTime() > 3) { this.seekTo(0); return true }
    if (!this.tracks.length) return false
    this.playVideoAt((this.currentIndex - 1 + this.tracks.length) % this.tracks.length); return true
  }

  getTracks() { return this.tracks || [] }
  getPlaylist() { return this.useNativeAudio ? [...this.playlistIds] : (this.driver?.getPlaylist?.() || []) }
  getPlaylistIndex() { return this.useNativeAudio ? this.currentIndex : (this.driver?.getPlaylistIndex?.() || 0) }
  getVideoData() { return this.useNativeAudio ? (this.currentTrackInfo ? { ...this.currentTrackInfo } : {}) : (this.driver?.getVideoData?.() || {}) }
  setShuffle(s) { this.shuffle = !!s; if (!this.useNativeAudio) this.driver?.setShuffle?.(!!s) }
  setLoop(l) { this.loop = !!l; this.driver?.setLoop?.(!!l) }
  getCurrentTime() { return this.driver?.getCurrentTime?.() || 0 }
  getDuration() { return this.driver?.getDuration?.() || 0 }
  destroy() { this.driver?.destroy?.(); this.player = null; this.isReady = false }
}

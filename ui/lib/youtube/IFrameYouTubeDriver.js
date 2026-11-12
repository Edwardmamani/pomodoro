let apiPromise = null

export function loadYouTubeIFrameAPI() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.YT?.Player) return resolve(window.YT)
    if (typeof window === 'undefined') return resolve(null)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
    const check = setInterval(() => {
      if (window.YT?.Player) { clearInterval(check); resolve(window.YT) }
    }, 150)
    const script = document.createElement('script')
    script.id = 'youtube-iframe-api-loader'
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

export class IFrameYouTubeDriver {
  constructor(engine) {
    this.engine = engine
  }

  async init() {
    const YT = await loadYouTubeIFrameAPI()
    if (!YT?.Player) return false
    const origin = (typeof window !== 'undefined' && window.location?.origin?.startsWith('http'))
      ? window.location.origin : 'https://www.youtube.com'

    return new Promise((resolve) => {
      this.engine.player = new YT.Player(this.engine.containerId, {
        height: '100%', width: '100%',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, enablejsapi: 1, origin },
        events: {
          onReady: (ev) => { this.engine._onDriverReady(ev); resolve(true) },
          onStateChange: (ev) => this.engine.options.onStateChange?.(ev),
          onError: (ev) => this.engine.options.onError?.(ev)
        }
      })
    })
  }

  load(parsed, autoplay) {
    const p = this.engine.player
    if (!p) return
    if (parsed.playlistId) {
      const obj = { list: parsed.playlistId, listType: 'playlist', index: 0, startSeconds: 0 }
      if (autoplay && typeof p.loadPlaylist === 'function') {
        try { p.loadPlaylist(obj) } catch { p.loadPlaylist(parsed.playlistId, 0, 0) }
      } else if (!autoplay && typeof p.cuePlaylist === 'function') {
        try { p.cuePlaylist(obj) } catch { p.cuePlaylist(parsed.playlistId, 0, 0) }
      }
    } else if (parsed.videoId) {
      autoplay ? p.loadVideoById(parsed.videoId, 0) : p.cueVideoById(parsed.videoId, 0)
    }
  }

  playVideoAt(index) { this.engine.player?.playVideoAt?.(index) }
  play() {
    const p = this.engine.player
    p?.playVideo?.()
    if (this.getPlaylist().length > 0 && this.getPlaylistIndex() < 0) p?.playVideoAt?.(0)
  }
  pause() { this.engine.player?.pauseVideo?.() }
  seekTo(s) { this.engine.player?.seekTo?.(s, true) }
  setVolume(v) { this.engine.player?.setVolume?.(v) }
  mute() { this.engine.player?.mute?.() }
  unMute() { this.engine.player?.unMute?.() }
  next() {
    if (this.getPlaylist().length > 0 && typeof this.engine.player?.nextVideo === 'function') {
      this.engine.player.nextVideo(); return true
    }
    return false
  }
  prev() {
    if (this.getCurrentTime() > 3) { this.seekTo(0); return true }
    if (this.getPlaylist().length > 0 && typeof this.engine.player?.previousVideo === 'function') {
      this.engine.player.previousVideo(); return true
    }
    return false
  }
  getPlaylist() { try { return this.engine.player?.getPlaylist?.() || [] } catch { return [] } }
  getPlaylistIndex() { try { return this.engine.player?.getPlaylistIndex?.() || 0 } catch { return 0 } }
  getVideoData() { try { return this.engine.player?.getVideoData?.() || {} } catch { return {} } }
  setShuffle(s) { this.engine.player?.setShuffle?.(!!s) }
  setLoop(l) { this.engine.player?.setLoop?.(!!l) }
  getCurrentTime() { try { return this.engine.player?.getCurrentTime?.() || 0 } catch { return 0 } }
  getDuration() { try { return this.engine.player?.getDuration?.() || 0 } catch { return 0 } }
  destroy() { try { this.engine.player?.destroy?.() } catch { /* ignore */ } }
}

/**
 * Motor para gestión y control del reproductor de YouTube IFrame API.
 */

let apiPromise = null

export function loadYouTubeIFrameAPI() {
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    const prevOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') prevOnReady()
      resolve(window.YT)
    }

    const script = document.createElement('script')
    script.id = 'youtube-iframe-api-loader'
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })

  return apiPromise
}

export class YouTubeEngine {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.options = options
    this.player = null
    this.isReady = false
    this.pendingLoad = null
    this.currentTrackInfo = null
  }

  async init() {
    const YT = await loadYouTubeIFrameAPI()

    return new Promise((resolve) => {
      this.player = new YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            this.isReady = true
            if (this.options.onReady) this.options.onReady(event)
            if (this.pendingLoad) {
              const { parsed, autoplay } = this.pendingLoad
              this.pendingLoad = null
              this.load(parsed, autoplay)
            }
            resolve(this)
          },
          onStateChange: (event) => {
            if (this.options.onStateChange) this.options.onStateChange(event)
          },
          onError: (event) => {
            console.warn('[YouTubeEngine] Error en reproductor:', event.data)
            if (this.options.onError) this.options.onError(event)
          }
        }
      })
    })
  }

  load(parsed, autoplay = true) {
    if (!parsed) return

    if (!this.isReady || !this.player) {
      this.pendingLoad = { parsed, autoplay }
      return
    }

    try {
      if (parsed.playlistId) {
        if (autoplay) {
          this.player.loadPlaylist({
            list: parsed.playlistId,
            listType: 'playlist',
            index: 0
          })
        } else {
          this.player.cuePlaylist({
            list: parsed.playlistId,
            listType: 'playlist',
            index: 0
          })
        }
      } else if (parsed.videoId) {
        if (autoplay) {
          this.player.loadVideoById(parsed.videoId)
        } else {
          this.player.cueVideoById(parsed.videoId)
        }
      }
    } catch (err) {
      console.warn('[YouTubeEngine] Error al cargar pista:', err)
    }
  }

  play() {
    if (this.isReady && this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en play:', err)
      }
    }
  }

  pause() {
    if (this.isReady && this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en pause:', err)
      }
    }
  }

  seekTo(seconds) {
    if (this.isReady && this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en seekTo:', err)
      }
    }
  }

  setVolume(volume) {
    if (this.isReady && this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.max(0, Math.min(100, volume)))
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setVolume:', err)
      }
    }
  }

  mute() {
    if (this.isReady && this.player && typeof this.player.mute === 'function') {
      try {
        this.player.mute()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en mute:', err)
      }
    }
  }

  unMute() {
    if (this.isReady && this.player && typeof this.player.unMute === 'function') {
      try {
        this.player.unMute()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en unMute:', err)
      }
    }
  }

  next() {
    if (this.isReady && this.player && typeof this.player.nextVideo === 'function') {
      try {
        this.player.nextVideo()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en nextVideo:', err)
      }
    }
  }

  prev() {
    if (this.isReady && this.player) {
      try {
        const time = this.getCurrentTime()
        if (time > 3 && typeof this.player.seekTo === 'function') {
          this.player.seekTo(0, true)
        } else if (typeof this.player.previousVideo === 'function') {
          this.player.previousVideo()
        }
      } catch (err) {
        console.warn('[YouTubeEngine] Error en prevVideo:', err)
      }
    }
  }

  setShuffle(shuffle) {
    if (this.isReady && this.player && typeof this.player.setShuffle === 'function') {
      try {
        this.player.setShuffle(!!shuffle)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setShuffle:', err)
      }
    }
  }

  setLoop(loop) {
    if (this.isReady && this.player && typeof this.player.setLoop === 'function') {
      try {
        this.player.setLoop(!!loop)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setLoop:', err)
      }
    }
  }

  getCurrentTime() {
    if (this.isReady && this.player && typeof this.player.getCurrentTime === 'function') {
      try {
        return this.player.getCurrentTime() || 0
      } catch {
        return 0
      }
    }
    return 0
  }

  getDuration() {
    if (this.isReady && this.player && typeof this.player.getDuration === 'function') {
      try {
        return this.player.getDuration() || 0
      } catch {
        return 0
      }
    }
    return 0
  }

  destroy() {
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy()
      } catch (err) {
        console.warn('[YouTubeEngine] Error al destruir reproductor:', err)
      }
    }
    this.player = null
    this.isReady = false
  }
}

/**
 * Motor para gestión y control del reproductor de YouTube IFrame API.
 */

let apiPromise = null

export function loadYouTubeIFrameAPI() {
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    if (typeof window === 'undefined') {
      resolve(null)
      return
    }

    const prevOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') prevOnReady()
      resolve(window.YT)
    }

    // Polling de respaldo por si el evento onReady ocurrió antes del hook
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval)
        resolve(window.YT)
      }
    }, 150)

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
    if (!YT || !YT.Player) return this

    const validOrigin =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://www.youtube.com'

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
          origin: validOrigin
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
        const playlistObj = {
          list: parsed.playlistId,
          listType: 'playlist',
          index: 0,
          startSeconds: 0
        }
        if (autoplay) {
          if (typeof this.player.loadPlaylist === 'function') {
            try {
              this.player.loadPlaylist(playlistObj)
            } catch {
              this.player.loadPlaylist(parsed.playlistId, 0, 0)
            }
          }
        } else {
          if (typeof this.player.cuePlaylist === 'function') {
            try {
              this.player.cuePlaylist(playlistObj)
            } catch {
              this.player.cuePlaylist(parsed.playlistId, 0, 0)
            }
          }
        }
      } else if (parsed.videoId) {
        if (autoplay) {
          this.player.loadVideoById(parsed.videoId, 0)
        } else {
          this.player.cueVideoById(parsed.videoId, 0)
        }
      }
    } catch (err) {
      console.warn('[YouTubeEngine] Error al cargar pista:', err)
    }
  }

  playVideoAt(index) {
    if (this.isReady && this.player && typeof this.player.playVideoAt === 'function') {
      try {
        this.player.playVideoAt(index)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en playVideoAt:', err)
      }
    }
  }

  play() {
    if (this.isReady && this.player) {
      try {
        if (typeof this.player.playVideo === 'function') {
          this.player.playVideo()
        }
        const list = this.getPlaylist()
        if (list.length > 0 && typeof this.player.playVideoAt === 'function' && this.getPlaylistIndex() < 0) {
          this.player.playVideoAt(0)
        }
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
    if (this.isReady && this.player) {
      try {
        const list = this.getPlaylist()
        if (list.length > 0 && typeof this.player.nextVideo === 'function') {
          this.player.nextVideo()
          return true
        }
      } catch (err) {
        console.warn('[YouTubeEngine] Error en nextVideo:', err)
      }
    }
    return false
  }

  prev() {
    if (this.isReady && this.player) {
      try {
        const time = this.getCurrentTime()
        if (time > 3 && typeof this.player.seekTo === 'function') {
          this.player.seekTo(0, true)
          return true
        }
        const list = this.getPlaylist()
        if (list.length > 0 && typeof this.player.previousVideo === 'function') {
          this.player.previousVideo()
          return true
        }
      } catch (err) {
        console.warn('[YouTubeEngine] Error en prevVideo:', err)
      }
    }
    return false
  }

  getPlaylist() {
    if (this.isReady && this.player && typeof this.player.getPlaylist === 'function') {
      try {
        return this.player.getPlaylist() || []
      } catch {
        return []
      }
    }
    return []
  }

  getPlaylistIndex() {
    if (this.isReady && this.player && typeof this.player.getPlaylistIndex === 'function') {
      try {
        return this.player.getPlaylistIndex() || 0
      } catch {
        return 0
      }
    }
    return 0
  }

  getVideoData() {
    if (this.isReady && this.player && typeof this.player.getVideoData === 'function') {
      try {
        return this.player.getVideoData() || {}
      } catch {
        return {}
      }
    }
    return {}
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

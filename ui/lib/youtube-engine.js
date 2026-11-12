/**
 * Motor híbrido de reproducción para YouTube / YouTube Music:
 * - Modo Nativo (Electron IPC): Extrae la lista completa de pistas y reproduce el stream directo
 *   de audio (audio/mp4) mediante HTML5 Audio, evitando bloqueos de embed (Error 150/152/153).
 * - Modo IFrame API (Fallback / Mocks): Compatible con window.YT.Player.
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
    this.audio = null
    this.useNativeAudio = false
    this.useVlcAudio = false
    this._vlcTime = 0
    this._vlcDuration = 0
    this._vlcPollTimer = null
    this.isReady = false
    this.pendingLoad = null

    this.tracks = []
    this.playlistIds = []
    this.currentIndex = 0
    this.currentTrackInfo = null
    this.loadedVideoId = null
    this.volume = 75
    this.muted = false
    this.shuffle = false
    this.loop = false
    this.state = -1
    this._loadToken = 0
  }

  _hasVlcBackend() {
    return Boolean(
      typeof window !== 'undefined' &&
        window.pomodoroAPI?.music?.vlcPlay &&
        window.pomodoroAPI?.music?.vlcGetStatus
    )
  }

  _hasNativeBackend() {
    return Boolean(
      typeof window !== 'undefined' &&
        window.pomodoroAPI?.music?.getAudioStream &&
        window.pomodoroAPI?.music?.fetchPlaylistTracks
    )
  }

  _startVlcPolling() {
    this._stopVlcPolling()
    this._vlcPollTimer = setInterval(async () => {
      if (!this.useVlcAudio || !window.pomodoroAPI?.music?.vlcGetStatus) return
      try {
        const res = await window.pomodoroAPI.music.vlcGetStatus()
        if (!res?.ok || !res.data) return
        this._vlcTime = Number(res.data.time) || 0
        if (res.data.duration > 0) {
          this._vlcDuration = Number(res.data.duration)
        }
        if (res.data.ended) {
          this._stopVlcPolling()
          this.state = 0
          if (this.options.onStateChange) this.options.onStateChange({ data: 0 })
        }
      } catch {
        /* ignore */
      }
    }, 500)
  }

  _stopVlcPolling() {
    if (this._vlcPollTimer) {
      clearInterval(this._vlcPollTimer)
      this._vlcPollTimer = null
    }
  }

  async init() {
    if (this._hasVlcBackend()) {
      this.useVlcAudio = true
      this.useNativeAudio = true
      const self = this
      this.player = {
        get volume() {
          return self.volume
        },
        set volume(val) {
          self.volume = val
        },
        get muted() {
          return self.muted
        },
        set muted(val) {
          self.muted = val
        }
      }
      this.isReady = true
      if (this.options.onReady) this.options.onReady({ target: this })
      if (this.pendingLoad) {
        const { parsed, autoplay } = this.pendingLoad
        this.pendingLoad = null
        await this.load(parsed, autoplay)
      }
      return this
    }

    if (this._hasNativeBackend()) {
      this.useNativeAudio = true
      this.audio = typeof Audio !== 'undefined' ? new Audio() : this._createMockAudio()
      this.audio.preload = 'auto'

      const self = this
      this.player = {
        get volume() {
          return self.volume
        },
        set volume(val) {
          self.volume = val
        },
        get muted() {
          return self.muted
        },
        set muted(val) {
          self.muted = val
        }
      }

      if (typeof this.audio.addEventListener === 'function') {
        this.audio.addEventListener('playing', () => {
          this.state = 1
          if (this.options.onStateChange) this.options.onStateChange({ data: 1 })
        })

        this.audio.addEventListener('pause', () => {
          if (!this.audio.ended) {
            this.state = 2
            if (this.options.onStateChange) this.options.onStateChange({ data: 2 })
          }
        })

        this.audio.addEventListener('waiting', () => {
          this.state = 3
          if (this.options.onStateChange) this.options.onStateChange({ data: 3 })
        })

        this.audio.addEventListener('ended', () => {
          this.state = 0
          if (this.options.onStateChange) this.options.onStateChange({ data: 0 })
        })

        this.audio.addEventListener('loadedmetadata', () => {
          if (this.audio.duration && isFinite(this.audio.duration) && this.currentTrackInfo) {
            this.currentTrackInfo.duration = Math.round(this.audio.duration)
          }
          if (this.options.onTrackChange) this.options.onTrackChange()
        })

        this.audio.addEventListener('error', () => {
          console.warn('[YouTubeEngine] Error en elemento de audio:', this.audio.error)
          if (this.options.onError) {
            this.options.onError({ data: this.audio.error?.code || -1 })
          }
        })
      }

      this.isReady = true
      if (this.options.onReady) this.options.onReady({ target: this })
      if (this.pendingLoad) {
        const { parsed, autoplay } = this.pendingLoad
        this.pendingLoad = null
        await this.load(parsed, autoplay)
      }
      return this
    }

    // Fallback a YouTube IFrame API (para mocks o entornos sin backend IPC)
    const YT = await loadYouTubeIFrameAPI()
    if (!YT || !YT.Player) return this

    const validOrigin =
      typeof window !== 'undefined' &&
      window.location?.origin &&
      window.location.origin.startsWith('http')
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

  _createMockAudio() {
    return {
      src: '',
      currentTime: 0,
      duration: 0,
      volume: 0.75,
      muted: false,
      paused: true,
      ended: false,
      play: async function () {
        this.paused = false
      },
      pause: function () {
        this.paused = true
      },
      removeAttribute: function () {
        this.src = ''
      },
      addEventListener: function () {}
    }
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

    if (!this.isReady || !this.player) {
      this.pendingLoad = { parsed, autoplay }
      return
    }

    if (this.useNativeAudio) {
      const token = ++this._loadToken
      try {
        if (this.useVlcAudio) {
          this._stopVlcPolling()
          this._vlcTime = 0
          this._vlcDuration = 0
          await window.pomodoroAPI.music.vlcStop()
        } else if (this.audio) {
          this.audio.pause()
          this.audio.removeAttribute('src')
        }
        this.loadedVideoId = null
      } catch {
        /* ignore */
      }

      try {
        if (parsed.playlistId) {
          const res = await window.pomodoroAPI.music.fetchPlaylistTracks(parsed.playlistId)
          if (token !== this._loadToken) return

          if (res?.ok && Array.isArray(res.data?.tracks) && res.data.tracks.length > 0) {
            this.tracks = res.data.tracks.map((t, idx) => ({
              ...t,
              index: idx
            }))
            this.playlistIds = this.tracks.map((t) => t.videoId)

            let startIdx = 0
            if (parsed.videoId) {
              const found = this.playlistIds.indexOf(parsed.videoId)
              if (found >= 0) startIdx = found
            }

            this.currentIndex = startIdx
            this._updateCurrentTrackMetadata(this.tracks[startIdx])

            if (this.options.onTrackChange) this.options.onTrackChange()
            if (this.options.onStateChange) this.options.onStateChange({ data: 5 })

            if (autoplay) {
              await this.playVideoAt(startIdx)
            }
            return
          }
        }

        if (parsed.videoId) {
          this.tracks = [
            {
              index: 0,
              videoId: parsed.videoId,
              title: '',
              author: '',
              duration: 0,
              thumbnailUrl: `https://i.ytimg.com/vi/${parsed.videoId}/mqdefault.jpg`
            }
          ]
          this.playlistIds = [parsed.videoId]
          this.currentIndex = 0
          this._updateCurrentTrackMetadata(this.tracks[0])

          if (autoplay) {
            await this.playVideoAt(0)
          } else {
            const streamRes = await window.pomodoroAPI.music.getAudioStream(parsed.videoId)
            if (token !== this._loadToken) return
            if (streamRes?.ok && streamRes.data) {
              this.tracks[0] = {
                index: 0,
                videoId: parsed.videoId,
                title: streamRes.data.title,
                author: streamRes.data.author,
                duration: streamRes.data.duration,
                thumbnailUrl: streamRes.data.thumbnailUrl
              }
              this._updateCurrentTrackMetadata(this.tracks[0])
              if (this.options.onTrackChange) this.options.onTrackChange()
              if (this.options.onStateChange) this.options.onStateChange({ data: 5 })
            }
          }
        }
      } catch (err) {
        console.warn('[YouTubeEngine] Error al cargar en modo nativo:', err)
      }
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

  async playVideoAt(index) {
    if (this.useNativeAudio) {
      if (index < 0 || index >= this.tracks.length) return
      const token = ++this._loadToken
      this.currentIndex = index
      const track = this.tracks[index]
      this._updateCurrentTrackMetadata(track)

      try {
        if (this.useVlcAudio) {
          this._stopVlcPolling()
          await window.pomodoroAPI.music.vlcStop()
        } else if (this.audio) {
          this.audio.pause()
        }
      } catch {
        /* ignore */
      }

      this.state = 3 // BUFFERING
      if (this.options.onTrackChange) this.options.onTrackChange()
      if (this.options.onStateChange) this.options.onStateChange({ data: 3 })

      try {
        if (this.useVlcAudio) {
          await window.pomodoroAPI.music.vlcSetVolume(this.muted ? 0 : this.volume)
          const res = await window.pomodoroAPI.music.vlcPlay(track.videoId)
          if (token !== this._loadToken) return

          if (!res?.ok || !res.data) {
            console.warn('[YouTubeEngine] No se pudo reproducir con VLC:', track.videoId, res?.error)
            if (this.options.onError) this.options.onError({ data: res?.error || 'VLC_ERROR' })
            return
          }

          track.title = res.data.title || track.title
          track.author = res.data.author || track.author
          track.duration = res.data.duration || track.duration
          this._updateCurrentTrackMetadata(track)

          this.loadedVideoId = track.videoId
          this._vlcTime = 0
          this._vlcDuration = Number(res.data.duration || track.duration || 0)
          this.state = 1
          this._startVlcPolling()
          if (this.options.onTrackChange) this.options.onTrackChange()
          if (this.options.onStateChange) this.options.onStateChange({ data: 1 })
          return
        }

        const res = await window.pomodoroAPI.music.getAudioStream(track.videoId)
        if (token !== this._loadToken) return

        if (!res?.ok || !res.data?.url) {
          console.warn('[YouTubeEngine] No se pudo obtener stream para:', track.videoId, res?.error)
          if (this.options.onError) this.options.onError({ data: res?.error || 'STREAM_ERROR' })
          return
        }

        track.title = res.data.title || track.title
        track.author = res.data.author || track.author
        track.duration = res.data.duration || track.duration
        this._updateCurrentTrackMetadata(track)

        this.loadedVideoId = track.videoId
        this.audio.src = res.data.url
        this.audio.currentTime = 0
        this.audio.volume = this.muted ? 0 : Math.max(0, Math.min(1, this.volume / 100))
        this.audio.muted = this.muted

        await this.audio.play()
        this.state = 1
        if (this.options.onTrackChange) this.options.onTrackChange()
        if (this.options.onStateChange) this.options.onStateChange({ data: 1 })
      } catch (err) {
        console.warn('[YouTubeEngine] Error al reproducir pista:', err)
        if (this.options.onError) this.options.onError({ data: err.message })
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.playVideoAt === 'function') {
      try {
        this.player.playVideoAt(index)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en playVideoAt:', err)
      }
    }
  }

  async play() {
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        if (this.loadedVideoId) {
          try {
            await window.pomodoroAPI.music.vlcResume()
            this.state = 1
            this._startVlcPolling()
            if (this.options.onStateChange) this.options.onStateChange({ data: 1 })
          } catch (err) {
            console.warn('[YouTubeEngine] Error al reanudar VLC:', err)
          }
        } else if (this.tracks.length > 0) {
          await this.playVideoAt(this.currentIndex >= 0 ? this.currentIndex : 0)
        }
        return
      }

      if (this.loadedVideoId && this.audio?.src) {
        try {
          await this.audio.play()
          this.state = 1
          if (this.options.onStateChange) this.options.onStateChange({ data: 1 })
        } catch (err) {
          console.warn('[YouTubeEngine] Error al reanudar audio:', err)
        }
      } else if (this.tracks.length > 0) {
        await this.playVideoAt(this.currentIndex >= 0 ? this.currentIndex : 0)
      }
      return
    }

    if (this.isReady && this.player) {
      try {
        if (typeof this.player.playVideo === 'function') {
          this.player.playVideo()
        }
        const list = this.getPlaylist()
        if (
          list.length > 0 &&
          typeof this.player.playVideoAt === 'function' &&
          this.getPlaylistIndex() < 0
        ) {
          this.player.playVideoAt(0)
        }
      } catch (err) {
        console.warn('[YouTubeEngine] Error en play:', err)
      }
    }
  }

  pause() {
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        this._stopVlcPolling()
        window.pomodoroAPI.music.vlcPause().catch(() => {})
        this.state = 2
        if (this.options.onStateChange) this.options.onStateChange({ data: 2 })
        return
      }
      if (this.audio) {
        this.audio.pause()
        this.state = 2
        if (this.options.onStateChange) this.options.onStateChange({ data: 2 })
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en pause:', err)
      }
    }
  }

  seekTo(seconds) {
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        if (this.loadedVideoId) {
          const target = Math.max(0, seconds)
          this._vlcTime = target
          window.pomodoroAPI.music.vlcSeek(target).catch(() => {})
        }
        return
      }
      if (this.audio && this.loadedVideoId) {
        try {
          this.audio.currentTime = Math.max(0, seconds)
        } catch (err) {
          console.warn('[YouTubeEngine] Error en seekTo:', err)
        }
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en seekTo:', err)
      }
    }
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, volume))
    this.volume = clamped
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        window.pomodoroAPI.music.vlcSetVolume(this.muted ? 0 : clamped).catch(() => {})
        return
      }
      if (this.audio) {
        this.audio.volume = this.muted ? 0 : clamped / 100
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(clamped)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setVolume:', err)
      }
    }
  }

  mute() {
    this.muted = true
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        window.pomodoroAPI.music.vlcSetVolume(0).catch(() => {})
        return
      }
      if (this.audio) {
        this.audio.muted = true
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.mute === 'function') {
      try {
        this.player.mute()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en mute:', err)
      }
    }
  }

  unMute() {
    this.muted = false
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        window.pomodoroAPI.music.vlcSetVolume(this.volume).catch(() => {})
        return
      }
      if (this.audio) {
        this.audio.muted = false
        this.audio.volume = Math.max(0, Math.min(1, this.volume / 100))
      }
      return
    }

    if (this.isReady && this.player && typeof this.player.unMute === 'function') {
      try {
        this.player.unMute()
      } catch (err) {
        console.warn('[YouTubeEngine] Error en unMute:', err)
      }
    }
  }

  next() {
    if (this.useNativeAudio) {
      if (this.tracks.length > 0) {
        let nextIdx = (this.currentIndex + 1) % this.tracks.length
        if (this.shuffle && this.tracks.length > 1) {
          do {
            nextIdx = Math.floor(Math.random() * this.tracks.length)
          } while (nextIdx === this.currentIndex)
        }
        this.playVideoAt(nextIdx)
        return true
      }
      return false
    }

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
    if (this.useNativeAudio) {
      if (this.getCurrentTime() > 3) {
        this.seekTo(0)
        return true
      }
      if (this.tracks.length > 0) {
        const prevIdx = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length
        this.playVideoAt(prevIdx)
        return true
      }
      return false
    }

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

  getTracks() {
    return this.tracks || []
  }

  getPlaylist() {
    if (this.useNativeAudio) {
      return [...this.playlistIds]
    }

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
    if (this.useNativeAudio) {
      return this.currentIndex
    }

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
    if (this.useNativeAudio) {
      return this.currentTrackInfo ? { ...this.currentTrackInfo } : {}
    }

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
    this.shuffle = !!shuffle
    if (!this.useNativeAudio && this.isReady && this.player && typeof this.player.setShuffle === 'function') {
      try {
        this.player.setShuffle(!!shuffle)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setShuffle:', err)
      }
    }
  }

  setLoop(loop) {
    this.loop = !!loop
    if (this.useNativeAudio && this.audio) {
      this.audio.loop = !!loop
      return
    }
    if (this.isReady && this.player && typeof this.player.setLoop === 'function') {
      try {
        this.player.setLoop(!!loop)
      } catch (err) {
        console.warn('[YouTubeEngine] Error en setLoop:', err)
      }
    }
  }

  getCurrentTime() {
    if (this.useNativeAudio) {
      if (this.useVlcAudio) return this._vlcTime || 0
      return this.audio?.currentTime || 0
    }

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
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        return this._vlcDuration || this.currentTrackInfo?.duration || 0
      }
      if (this.audio?.duration && isFinite(this.audio.duration) && this.audio.duration > 0) {
        return this.audio.duration
      }
      return this.currentTrackInfo?.duration || 0
    }

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
    if (this.useNativeAudio) {
      if (this.useVlcAudio) {
        this._stopVlcPolling()
        window.pomodoroAPI?.music?.vlcStop?.().catch(() => {})
      }
      if (this.audio) {
        try {
          this.audio.pause()
          this.audio.removeAttribute('src')
        } catch {
          /* ignore */
        }
        this.audio = null
      }
      this.player = null
      this.isReady = false
      return
    }

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

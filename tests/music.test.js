/**
 * Pruebas unitarias para el reproductor de música:
 * 1. Agregar la playlist https://music.youtube.com/playlist?list=PLRrXghsZBv6c
 * 2. Verificar que la playlist devuelve el listado de canciones
 * 3. Reproducir el sonido / pista de alguna canción
 *
 * Ejecutar directamente sin servidor:
 * ELECTRON_RUN_AS_NODE=1 electron --test tests/music.test.js
 */

const { describe, test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Module = require('module')

// 1. Configurar entorno simulado de Electron antes de requerir módulos internos
const mockUserData = path.join(os.tmpdir(), `pomodoro-unit-test-${Date.now()}`)
fs.mkdirSync(mockUserData, { recursive: true })

const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'electron') {
    return {
      app: {
        getPath: () => mockUserData
      },
      BrowserWindow: {
        getAllWindows: () => [],
        getFocusedWindow: () => null
      },
      Notification: Object.assign(
        function Notification() {
          return { show() {} }
        },
        { isSupported: () => false }
      ),
      shell: {
        openExternal: async (url) => {
          openedUrls.push(url)
          return true
        }
      },
      ipcMain: { handle() {} }
    }
  }
  return originalRequire.apply(this, arguments)
}

const openedUrls = []

// Cargar controladores y base de datos
const { runMigrations } = require('../electron-main/db/migrations')
const { closeConnection } = require('../electron-main/db/connection')
const musicController = require('../electron-main/controllers/MusicController')
const PlaylistModel = require('../electron-main/models/PlaylistModel')

// Inicializar base de datos SQLite para las pruebas
runMigrations()

// Simular entorno global de navegador para probar módulos de UI / Engine
class MockYouTubePlayer {
  constructor(containerId, options = {}) {
    this.containerId = containerId
    this.options = options
    this.events = options.events || {}
    this.currentPlaylist = []
    this.currentIndex = 0
    this.volume = 100
    this.muted = false
    this.state = -1 // UNSTARTED
    this.currentTime = 0
    this.duration = 240
    this.videoData = {}

    // Simular que el reproductor queda listo (onReady)
    if (typeof this.events.onReady === 'function') {
      setTimeout(() => {
        this.events.onReady({ target: this })
      }, 5)
    }
  }

  loadPlaylist(playlistParam, index = 0, startSeconds = 0) {
    const listId =
      typeof playlistParam === 'object' && playlistParam !== null ? playlistParam.list : playlistParam
    const targetIdx =
      typeof playlistParam === 'object' && playlistParam !== null && typeof playlistParam.index === 'number'
        ? playlistParam.index
        : index

    this.playlistId = listId
    this.currentIndex = targetIdx
    this.currentTime = startSeconds
    // Simular lista de canciones obtenidas de la playlist
    this.currentPlaylist = [
      'PLRrXghsZBv6c_track_1',
      'PLRrXghsZBv6c_track_2',
      'PLRrXghsZBv6c_track_3'
    ]
    this.videoData = {
      video_id: this.currentPlaylist[targetIdx] || this.currentPlaylist[0],
      title: `Canción de demostración ${targetIdx + 1}`,
      author: 'Artista YouTube Music'
    }
    this.state = 1 // PLAYING
    if (typeof this.events.onStateChange === 'function') {
      this.events.onStateChange({ data: this.state })
    }
  }

  cuePlaylist(playlistParam, index = 0, startSeconds = 0) {
    this.loadPlaylist(playlistParam, index, startSeconds)
    this.state = 5 // CUED
    if (typeof this.events.onStateChange === 'function') {
      this.events.onStateChange({ data: this.state })
    }
  }

  loadVideoById(videoId, startSeconds = 0) {
    this.videoData = {
      video_id: videoId,
      title: `Pista individual ${videoId}`,
      author: 'Artista YouTube'
    }
    this.currentTime = startSeconds
    this.state = 1 // PLAYING
    if (typeof this.events.onStateChange === 'function') {
      this.events.onStateChange({ data: this.state })
    }
  }

  playVideoAt(index) {
    if (index >= 0 && index < this.currentPlaylist.length) {
      this.currentIndex = index
      this.videoData = {
        video_id: this.currentPlaylist[index],
        title: `Canción ${index + 1} de la Playlist`,
        author: `Artista Destacado ${index + 1}`
      }
      this.state = 1 // PLAYING
      if (typeof this.events.onStateChange === 'function') {
        this.events.onStateChange({ data: this.state })
      }
    }
  }

  playVideo() {
    this.state = 1 // PLAYING
    if (typeof this.events.onStateChange === 'function') {
      this.events.onStateChange({ data: this.state })
    }
  }

  pauseVideo() {
    this.state = 2 // PAUSED
    if (typeof this.events.onStateChange === 'function') {
      this.events.onStateChange({ data: this.state })
    }
  }

  nextVideo() {
    if (this.currentIndex < this.currentPlaylist.length - 1) {
      this.playVideoAt(this.currentIndex + 1)
    }
  }

  previousVideo() {
    if (this.currentIndex > 0) {
      this.playVideoAt(this.currentIndex - 1)
    }
  }

  seekTo(seconds) {
    this.currentTime = seconds
  }

  setVolume(vol) {
    this.volume = vol
  }

  mute() {
    this.muted = true
  }

  unMute() {
    this.muted = false
  }

  getPlaylist() {
    return [...this.currentPlaylist]
  }

  getPlaylistIndex() {
    return this.currentIndex
  }

  getVideoData() {
    return { ...this.videoData }
  }

  getCurrentTime() {
    return this.currentTime
  }

  getDuration() {
    return this.duration
  }

  destroy() {
    this.currentPlaylist = []
  }
}

// Configurar mocks en el objeto global para simular el navegador
global.window = {
  YT: {
    Player: MockYouTubePlayer,
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    }
  },
  location: { origin: 'http://localhost:5173' }
}
global.document = {
  createElement: () => ({ id: '', src: '' }),
  head: { appendChild: () => {} }
}

describe('Reproductor de Música - Pruebas Unitarias', () => {
  let parseMediaUrl
  let YouTubeEngine
  const playlistModel = new PlaylistModel()

  before(async () => {
    const parserMod = await import('../ui/lib/music-parser.js')
    parseMediaUrl = parserMod.parseMediaUrl

    const engineMod = await import('../ui/lib/youtube-engine.js')
    YouTubeEngine = engineMod.YouTubeEngine
  })

  after(() => {
    closeConnection()
    try {
      fs.rmSync(mockUserData, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  describe('1. Agregar Playlist de YouTube Music (https://music.youtube.com/playlist?list=PLRrXghsZBv6c)', () => {
    const TARGET_URL = 'https://music.youtube.com/playlist?list=PLRrXghsZBv6c'
    let addedPlaylistId = null

    test('1.1 Debe parsear correctamente la URL de YouTube Music extrayendo el playlistId y servicio', () => {
      const parsed = parseMediaUrl(TARGET_URL)

      assert.ok(parsed, 'El resultado de parseMediaUrl no debe ser nulo')
      assert.strictEqual(parsed.service, 'youtube', 'El servicio detectado debe ser YouTube')
      assert.strictEqual(parsed.type, 'playlist', 'El tipo debe ser playlist')
      assert.strictEqual(parsed.playlistId, 'PLRrXghsZBv6c', 'El playlistId extraído debe coincidir con el parámetro list')
      assert.strictEqual(parsed.isMusicDomain, true, 'Debe identificar que proviene de music.youtube.com')
      assert.strictEqual(
        parsed.canonicalUrl,
        'https://music.youtube.com/playlist?list=PLRrXghsZBv6c',
        'Debe conservar el enlace canónico hacia YouTube Music'
      )
    })

    test('1.2 Debe agregar la playlist en el MusicController y persistirla en la base de datos', () => {
      const result = musicController.add(null, {
        service: 'youtube',
        name: 'Mi Lista de Concentración YT Music',
        external_url: TARGET_URL
      })

      assert.strictEqual(result.ok, true, 'musicController.add debe responder ok: true')
      assert.ok(result.data.id, 'Debe devolver un ID generado')
      assert.strictEqual(result.data.name, 'Mi Lista de Concentración YT Music')
      assert.strictEqual(result.data.external_url, TARGET_URL)
      assert.strictEqual(result.data.service, 'youtube')

      addedPlaylistId = result.data.id

      // Comprobar persistencia directa en el modelo
      const inDb = playlistModel.getById(addedPlaylistId)
      assert.ok(inDb, 'La playlist debe existir en SQLite')
      assert.strictEqual(inDb.external_url, TARGET_URL)
    })

    test('1.3 Debe poder seleccionar la nueva playlist y verificar que sea la activa', () => {
      const selectRes = musicController.select(null, addedPlaylistId)
      assert.strictEqual(selectRes.ok, true, 'musicController.select debe responder ok: true')
      assert.strictEqual(selectRes.data.id, addedPlaylistId)

      const activeRes = musicController.getActive()
      assert.strictEqual(activeRes.ok, true)
      assert.strictEqual(activeRes.data.id, addedPlaylistId, 'La playlist activa debe ser la recién agregada')
      assert.strictEqual(activeRes.data.external_url, TARGET_URL)
    })

    test('1.4 Debe permitir abrir la playlist en el navegador con la URL canónica', async () => {
      const openRes = await musicController.open()
      assert.strictEqual(openRes.ok, true)
      assert.strictEqual(openedUrls.length, 1)
      assert.strictEqual(openedUrls[0], TARGET_URL, 'shell.openExternal debió ser llamado con la URL de la playlist')
    })
  })

  describe('2. Saber que la playlist devuelve el listado de canciones', () => {
    let engine = null
    const TARGET_URL = 'https://music.youtube.com/playlist?list=PLRrXghsZBv6c'

    test('2.1 El motor de reproducción debe inicializarse y cargar la lista devolviendo los IDs de las canciones', async () => {
      let stateChanged = false

      engine = new YouTubeEngine('test-player-container', {
        onStateChange: () => {
          stateChanged = true
        }
      })

      await engine.init()
      assert.strictEqual(engine.isReady, true, 'El motor debe indicar isReady = true')

      const parsed = parseMediaUrl(TARGET_URL)
      engine.load(parsed, true)

      // Obtener el listado de IDs devuelto por la playlist
      const trackIds = engine.getPlaylist()
      assert.ok(Array.isArray(trackIds), 'getPlaylist() debe retornar un array')
      assert.strictEqual(trackIds.length, 3, 'La playlist debe retornar 3 canciones simuladas')
      assert.strictEqual(trackIds[0], 'PLRrXghsZBv6c_track_1')
      assert.strictEqual(trackIds[1], 'PLRrXghsZBv6c_track_2')
      assert.strictEqual(trackIds[2], 'PLRrXghsZBv6c_track_3')
      assert.strictEqual(stateChanged, true, 'Debe haber disparado onStateChange al cargar la lista')
    })

    test('2.2 Debe estructurar el listado completo de canciones con sus índices, títulos y miniaturas', () => {
      const trackIds = engine.getPlaylist()
      const currentIndex = engine.getPlaylistIndex()
      const videoData = engine.getVideoData()

      const playlistTracks = trackIds.map((id, index) => ({
        index,
        videoId: id,
        title: index === currentIndex && videoData.title ? videoData.title : `Pista ${index + 1}`,
        author: index === currentIndex && videoData.author ? videoData.author : '',
        thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      }))

      assert.strictEqual(playlistTracks.length, 3, 'Debe tener 3 pistas estructuradas')
      assert.strictEqual(playlistTracks[0].index, 0)
      assert.strictEqual(playlistTracks[0].videoId, 'PLRrXghsZBv6c_track_1')
      assert.ok(playlistTracks[0].thumbnailUrl.includes('PLRrXghsZBv6c_track_1'))
      assert.strictEqual(playlistTracks[1].index, 1)
      assert.strictEqual(playlistTracks[2].index, 2)
    })

    test('2.3 MusicController.fetchTrackTitles debe resolver los títulos y artistas para la lista de IDs', async () => {
      const trackIds = ['PLRrXghsZBv6c_track_1', 'PLRrXghsZBv6c_track_2']
      const res = await musicController.fetchTrackTitles(null, trackIds)

      assert.strictEqual(res.ok, true, 'fetchTrackTitles debe devolver ok: true')
      assert.ok(res.data, 'Debe retornar un objeto con los títulos de las canciones')

      // Verificar que contiene metadatos de las pistas solicitadas
      assert.ok(res.data['PLRrXghsZBv6c_track_1'], 'Debe contener la pista 1')
      assert.ok(typeof res.data['PLRrXghsZBv6c_track_1'].title === 'string', 'El título debe ser un string no vacío')
      assert.ok(res.data['PLRrXghsZBv6c_track_2'], 'Debe contener la pista 2')
    })
  })

  describe('3. Reproducir el sonido y controlar la reproducción de una canción', () => {
    let engine = null
    let currentState = null

    before(async () => {
      engine = new YouTubeEngine('test-sound-container', {
        onStateChange: (event) => {
          currentState = event.data
        }
      })
      await engine.init()
      const parsed = parseMediaUrl('https://music.youtube.com/playlist?list=PLRrXghsZBv6c')
      engine.load(parsed, false)
    })

    test('3.1 Debe reproducir una canción específica por su índice usando playVideoAt', () => {
      // Reproducir la segunda canción (índice 1)
      engine.playVideoAt(1)

      assert.strictEqual(engine.getPlaylistIndex(), 1, 'El índice en reproducción debe ser 1')
      assert.strictEqual(currentState, 1, 'El estado del reproductor debe ser 1 (PLAYING)')

      const currentTrack = engine.getVideoData()
      assert.strictEqual(currentTrack.video_id, 'PLRrXghsZBv6c_track_2', 'El video_id activo debe ser el de la pista 2')
      assert.strictEqual(currentTrack.title, 'Canción 2 de la Playlist')
      assert.strictEqual(currentTrack.author, 'Artista Destacado 2')
    })

    test('3.2 Debe controlar la pausa y reproducción del sonido (play y pause)', () => {
      engine.pause()
      assert.strictEqual(currentState, 2, 'El estado debe cambiar a 2 (PAUSED)')

      engine.play()
      assert.strictEqual(currentState, 1, 'El estado debe cambiar a 1 (PLAYING)')
    })

    test('3.3 Debe controlar el nivel de volumen y silenciamiento (mute / unMute / setVolume)', () => {
      // Ajustar volumen al 85%
      engine.setVolume(85)
      assert.strictEqual(engine.player.volume, 85, 'El volumen del reproductor debe ser 85')

      // Silenciar sonido
      engine.mute()
      assert.strictEqual(engine.player.muted, true, 'El reproductor debe estar silenciado')

      // Restablecer sonido
      engine.unMute()
      assert.strictEqual(engine.player.muted, false, 'El reproductor ya no debe estar silenciado')
    })

    test('3.4 Debe avanzar a la siguiente canción con next() y retroceder con prev()', () => {
      // Actualmente estamos en el índice 1, next() debe avanzar al índice 2
      const nextMoved = engine.next()
      assert.strictEqual(nextMoved, true, 'next() debe retornar true al avanzar')
      assert.strictEqual(engine.getPlaylistIndex(), 2, 'El índice debe haber avanzado a 2')

      const track3 = engine.getVideoData()
      assert.strictEqual(track3.video_id, 'PLRrXghsZBv6c_track_3')

      // Retroceder con prev()
      const prevMoved = engine.prev()
      assert.strictEqual(prevMoved, true, 'prev() debe retornar true al retroceder')
      assert.strictEqual(engine.getPlaylistIndex(), 1, 'El índice debe volver a ser 1')
    })
  })

  describe('4. Integración Real con YouTube Music (https://music.youtube.com/playlist?list=PLRrXghsZBv6c&si=PMsPS4iNcK6QPtwX)', () => {
    const FULL_SHARE_URL =
      'https://music.youtube.com/playlist?list=PLRrXghsZBv6c&si=PMsPS4iNcK6QPtwX'

    test('4.1 Debe extraer las 7 canciones reales de la playlist PLRrXghsZBv6c con título, autor y duración', async () => {
      const res = await musicController.fetchPlaylistTracks(null, FULL_SHARE_URL)

      assert.strictEqual(res.ok, true, 'fetchPlaylistTracks debe responder ok: true')
      assert.strictEqual(res.data.playlistId, 'PLRrXghsZBv6c')
      assert.ok(Array.isArray(res.data.tracks), 'tracks debe ser un arreglo')
      assert.ok(res.data.tracks.length >= 7, `Se esperaban al menos 7 canciones, obtenidas: ${res.data.tracks.length}`)

      const firstTrack = res.data.tracks[0]
      assert.strictEqual(firstTrack.videoId, 'Y7iJgvjcg_4')
      assert.strictEqual(firstTrack.title, 'A Veces')
      assert.ok(firstTrack.author.includes('AL2'), 'El autor de la primera pista debe ser AL2')
      assert.ok(firstTrack.duration > 0, 'La duración debe ser mayor a 0 segundos')
    })

    test('4.2 Debe obtener el stream de audio directo (audio/mp4) reproducible para canciones de la lista', async () => {
      // Probar tanto la primera pista ('Y7iJgvjcg_4') como 'xDo--w1yg1M' (que antes fallaba en iframe embed)
      const stream1 = await musicController.getAudioStream(null, 'Y7iJgvjcg_4')
      assert.strictEqual(stream1.ok, true, 'getAudioStream debe responder ok: true para Y7iJgvjcg_4')
      assert.ok(stream1.data.url.startsWith('https://'), 'Debe retornar una URL HTTPS de stream válida')
      assert.ok(stream1.data.mimeType.startsWith('audio/'), 'El mimeType debe ser de audio')
      assert.strictEqual(stream1.data.title, 'A Veces')

      const stream2 = await musicController.getAudioStream(null, 'xDo--w1yg1M')
      assert.strictEqual(stream2.ok, true, 'getAudioStream debe responder ok: true para xDo--w1yg1M')
      assert.ok(stream2.data.url.startsWith('https://'), 'Debe retornar una URL HTTPS de stream válida')
      assert.strictEqual(stream2.data.title, 'Querer Querernos')
    })
  })
})

const musicController = require('../../electron-main/controllers/MusicController')
const PlaylistModel = require('../../electron-main/models/PlaylistModel')

class MusicSmokeSuite {
  async run() {
    const playlistModel = new PlaylistModel()
    const listRes = musicController.list()
    if (!listRes.ok || listRes.data.length < 2) throw new Error('Listas iniciales insuficientes')
    if (!listRes.data.some((p) => p.service === 'youtube') || !listRes.data.some((p) => p.service === 'spotify')) {
      throw new Error('Faltan listas de YouTube o Spotify')
    }

    const active = musicController.getActive()
    if (!active.ok || active.data?.service !== 'youtube') throw new Error('Lista activa por defecto debe ser YouTube')

    const newYt = musicController.add(null, {
      service: 'youtube', name: 'Lo-Fi Chill Beats Extra', external_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A'
    })
    if (!newYt.ok || newYt.data.service !== 'youtube') throw new Error('add YouTube falló')
    if (!musicController.select(null, newYt.data.id).ok || musicController.getActive().data.id !== newYt.data.id) {
      throw new Error('select falló')
    }

    const del = musicController.delete(null, newYt.data.id)
    if (!del.ok || playlistModel.getById(newYt.data.id) !== null || del.data?.service !== 'youtube') {
      throw new Error('delete o fallback falló')
    }

    const { parseMediaUrl, formatTime } = await import('../../ui/lib/music-parser.js')
    const ytParsed = parseMediaUrl('https://youtu.be/jfKfPfyJRdk')
    if (!ytParsed || ytParsed.service !== 'youtube' || ytParsed.videoId !== 'jfKfPfyJRdk') {
      throw new Error('parseMediaUrl enlace corto falló')
    }

    const ytm = parseMediaUrl('https://music.youtube.com/playlist?list=PLRrXghsZBv6c')
    if (!ytm || ytm.type !== 'playlist' || ytm.playlistId !== 'PLRrXghsZBv6c' || !ytm.isMusicDomain) {
      throw new Error('parseMediaUrl YouTube Music falló')
    }

    const sp = parseMediaUrl('https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY')
    if (!sp || sp.service !== 'spotify' || sp.type !== 'playlist') throw new Error('parseMediaUrl Spotify falló')

    const titles = await musicController.fetchTrackTitles(null, ['dQw4w9WgXcQ'])
    if (!titles.ok || !titles.data.dQw4w9WgXcQ) throw new Error('fetchTrackTitles falló')

    if (formatTime(125) !== '02:05' || formatTime(3665) !== '1:01:05') throw new Error('formatTime falló')
  }
}

module.exports = MusicSmokeSuite

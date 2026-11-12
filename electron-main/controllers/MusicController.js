const { shell } = require('electron')
const PlaylistModel = require('../models/PlaylistModel')
const SettingsModel = require('../models/SettingsModel')
const vlcAudio = require('../services/VlcAudioService')
const StreamProxyService = require('../services/StreamProxyService')
const YouTubeMetadataService = require('../services/YouTubeMetadataService')
const YouTubeResolverService = require('../services/YouTubeResolverService')

class MusicController {
  constructor() {
    this.playlists = new PlaylistModel()
    this.settings = new SettingsModel()
    this.metadata = new YouTubeMetadataService()
    this.resolver = new YouTubeResolverService(this.metadata)
    this.proxy = new StreamProxyService((videoId) => this.getAudioStream(null, videoId))
  }

  ensureProxyServer() { return this.proxy.ensureServer() }
  list() { return { ok: true, data: this.playlists.list() } }
  getActive() { return { ok: true, data: this.activePlaylist() } }

  select(_event, id) {
    const playlist = this.playlists.getById(id)
    if (!playlist) return { ok: false, error: 'NOT_FOUND' }
    this.settings.setMany({ active_playlist_id: id, last_playlist_id: id })
    return { ok: true, data: playlist }
  }

  async open() {
    const playlist = this.activePlaylist()
    if (!playlist) return { ok: false, error: 'NO_PLAYLIST' }
    await shell.openExternal(playlist.external_url)
    return { ok: true, data: playlist }
  }

  add(_event, input = {}) {
    const name = String(input.name || '').trim()
    const externalUrl = String(input.external_url || '').trim()
    if (!name || !externalUrl) return { ok: false, error: 'INVALID_INPUT' }
    const id = this.playlists.create({
      service: input.service || 'youtube', name, externalUrl,
      externalId: input.external_id || this.metadata.extractPlaylistId(externalUrl) || null
    })
    return { ok: true, data: this.playlists.getById(id) }
  }

  delete(_event, id) {
    if (!this.playlists.getById(id)) return { ok: false, error: 'NOT_FOUND' }
    const active = this.activePlaylist()
    if (!this.playlists.delete(id)) return { ok: false, error: 'DELETE_FAILED' }
    if (active && String(active.id) === String(id)) {
      const remaining = this.playlists.list()
      const next = remaining.find((p) => p.service === 'youtube') || remaining[0] || null
      this.settings.setMany({
        active_playlist_id: next ? String(next.id) : '',
        last_playlist_id: next ? String(next.id) : ''
      })
    }
    return { ok: true, data: this.activePlaylist() }
  }

  fetchPlaylistTracks(_event, rawPlaylistId) {
    return this.metadata.fetchPlaylistTracks(rawPlaylistId)
  }

  async getAudioStream(_event, videoId) {
    const port = await this.ensureProxyServer()
    return this.resolver.resolveAudioStream(videoId, port)
  }

  fetchTrackTitles(_event, ids) {
    return this.metadata.fetchTrackTitles(ids)
  }

  async vlcPlay(_event, videoId) {
    const streamRes = await this.getAudioStream(null, videoId)
    if (!streamRes.ok || (!streamRes.data?.directUrl && !streamRes.data?.url)) return streamRes
    vlcAudio.playStream(streamRes.data.directUrl || streamRes.data.url, videoId, streamRes.data.duration || 0)
    const { title, author, duration, thumbnailUrl } = streamRes.data
    return { ok: true, data: { videoId: streamRes.data.videoId, title, author, duration, thumbnailUrl } }
  }

  vlcPause() { vlcAudio.pause(); return { ok: true, data: { playing: false } } }
  vlcResume() { vlcAudio.play(); return { ok: true, data: { playing: true } } }
  vlcStop() { vlcAudio.stop(); return { ok: true } }
  vlcSeek(_event, seconds) { vlcAudio.seek(seconds); return { ok: true, data: { time: Number(seconds) || 0 } } }
  vlcSetVolume(_event, level) { return { ok: true, data: { volume: vlcAudio.setVolume(level) } } }
  async vlcGetStatus() { return { ok: true, data: await vlcAudio.getStatus() } }

  activePlaylist() {
    const { active_playlist_id: id } = this.settings.getAll()
    let playlist = id ? this.playlists.getById(id) : null
    if (!playlist) {
      const all = this.playlists.list()
      playlist = all.find((p) => p.service === 'youtube') || all[0] || null
      if (playlist) {
        this.settings.setMany({ active_playlist_id: String(playlist.id), last_playlist_id: String(playlist.id) })
      }
    }
    return playlist
  }
}

module.exports = new MusicController()

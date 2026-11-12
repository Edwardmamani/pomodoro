const { shell } = require('electron')
const PlaylistModel = require('../models/PlaylistModel')
const SettingsModel = require('../models/SettingsModel')

class MusicController {
  constructor() {
    this.playlists = new PlaylistModel()
    this.settings = new SettingsModel()
  }

  list() {
    return { ok: true, data: this.playlists.list() }
  }

  getActive() {
    return { ok: true, data: this.activePlaylist() }
  }

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

  add(_event, input) {
    input = input || {}
    const name = String(input.name || '').trim()
    const externalUrl = String(input.external_url || '').trim()
    if (!name || !externalUrl) return { ok: false, error: 'INVALID_INPUT' }

    const id = this.playlists.create({
      service: input.service || 'youtube',
      name,
      externalUrl,
      externalId: input.external_id || null
    })
    return { ok: true, data: this.playlists.getById(id) }
  }

  delete(_event, id) {
    const target = this.playlists.getById(id)
    if (!target) return { ok: false, error: 'NOT_FOUND' }

    const active = this.activePlaylist()
    const deleted = this.playlists.delete(id)
    if (!deleted) return { ok: false, error: 'DELETE_FAILED' }

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

  activePlaylist() {
    const { active_playlist_id: id } = this.settings.getAll()
    let playlist = id ? this.playlists.getById(id) : null
    if (!playlist) {
      const all = this.playlists.list()
      // Preferir YouTube como primera opción si no hay activa
      playlist = all.find((p) => p.service === 'youtube') || all[0] || null
      if (playlist) {
        this.settings.setMany({
          active_playlist_id: String(playlist.id),
          last_playlist_id: String(playlist.id)
        })
      }
    }
    return playlist
  }
}

module.exports = new MusicController()

const { shell } = require('electron')
const { getConnection } = require('../db/connection')
const settingsService = require('./settings.service')

function list() {
  const db = getConnection()
  return db
    .prepare('SELECT * FROM playlists ORDER BY created_at DESC')
    .all()
}

function add(input) {
  const db = getConnection()
  const name = String(input.name || '').trim()
  const url = String(input.external_url || '').trim()
  if (!name || !url) return { ok: false, error: 'INVALID_INPUT' }

  const now = new Date().toISOString()
  const id = db
    .prepare(
      `
    INSERT INTO playlists (service, name, external_url, external_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
    )
    .run(input.service || 'spotify', name, url, input.external_id || null, now)
    .lastInsertRowid

  return { ok: true, data: getById(id) }
}

function getById(id) {
  const db = getConnection()
  return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id) || null
}

function select(id) {
  const playlist = getById(id)
  if (!playlist) return { ok: false, error: 'NOT_FOUND' }
  settingsService.setMany({
    active_playlist_id: id,
    last_playlist_id: id
  })
  return { ok: true, data: playlist }
}

function getActive() {
  const settings = settingsService.getAll()
  if (!settings.active_playlist_id) return null
  return getById(settings.active_playlist_id)
}

async function openActive() {
  const playlist = getActive()
  if (!playlist) return { ok: false, error: 'NO_PLAYLIST' }
  await shell.openExternal(playlist.external_url)
  return { ok: true, data: playlist }
}

module.exports = { list, add, select, getActive, openActive, getById }

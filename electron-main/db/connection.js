const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userData = app.getPath('userData')
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true })
  }
  return path.join(userData, 'pomodoro.db')
}

function getConnection() {
  if (db) return db
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

function closeConnection() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getConnection, closeConnection, getDbPath }

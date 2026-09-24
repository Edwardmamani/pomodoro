const { app, BrowserWindow } = require('electron')
const path = require('path')
const { runMigrations } = require('./db/migrations')
const { runSeed } = require('./db/seed')
const { closeConnection } = require('./db/connection')
const { registerIpc } = require('./ipc/register')
const timerService = require('./services/timer.service')

const isDev = process.env.ELECTRON_DEV === '1'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Pomodoro Serene Focus',
    backgroundColor: '#0f141b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  runMigrations()
  runSeed()
  timerService.init()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeConnection()
})

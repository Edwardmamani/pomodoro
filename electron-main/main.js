const { app, BrowserWindow, protocol, net, nativeImage } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')
const { runMigrations } = require('./db/migrations')
const { runSeed } = require('./db/seed')
const { closeConnection } = require('./db/connection')
const { registerIpc } = require('./registerIpc')
const TimerController = require('./controllers/TimerController')
const NoteModel = require('./models/NoteModel')

const isDev = process.env.ELECTRON_DEV === '1'
const APP_ICON = path.join(__dirname, '..', 'assets', 'icon.png')

app.setName('Pomodoro Serene Focus')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.edwardmamani.pomodoro')
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mdmedia',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true
    }
  }
])

function getAppIcon() {
  const image = nativeImage.createFromPath(APP_ICON)
  return image.isEmpty() ? undefined : image
}

function createWindow() {
  const icon = getAppIcon()
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Pomodoro Serene Focus',
    backgroundColor: '#0f141b',
    show: false,
    ...(icon ? { icon } : {}),
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
  if (process.platform === 'darwin') {
    const icon = getAppIcon()
    if (icon && app.dock) app.dock.setIcon(icon)
  }

  protocol.handle('mdmedia', (request) => {
    const filePath = NoteModel.absolutePathFromMediaUrl(request.url)
    if (!filePath) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })

  runMigrations()
  runSeed()
  TimerController.init()
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
  try {
    console.log('Persistiendo timer al salir...')
    TimerController.persistForQuit()
  } catch (err) {
    console.error('No se pudo persistir el timer al salir:', err)
  }
  closeConnection()
})

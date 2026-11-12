const { app, BrowserWindow } = require('electron')
const path = require('path')
const AppBootstrap = require('./lib/AppBootstrap')
const { runMigrations } = require('./db/migrations')
const { runSeed } = require('./db/seed')
const { closeConnection } = require('./db/connection')
const { registerIpc } = require('./registerIpc')
const TimerController = require('./controllers/TimerController')

class PomodoroApp {
  constructor() {
    this.isDev = process.env.ELECTRON_DEV === '1'
    this.iconPath = path.join(__dirname, '..', 'assets', 'icon.png')
    this.bootstrap = new AppBootstrap(this.iconPath)
  }

  configureApp() {
    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
    app.setName('Pomodoro Serene Focus')
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.edwardmamani.pomodoro')
    }
    this.bootstrap.registerPrivilegedSchemes()
  }

  createWindow() {
    const icon = this.bootstrap.getAppIcon()
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
    if (this.isDev) {
      win.loadURL('http://127.0.0.1:5173')
    } else {
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    }
  }

  onReady() {
    if (process.platform === 'darwin') {
      const icon = this.bootstrap.getAppIcon()
      if (icon && app.dock) app.dock.setIcon(icon)
    }
    this.bootstrap.registerProtocols()
    this.bootstrap.configureSessionHeaders()
    runMigrations()
    runSeed()
    TimerController.init()
    registerIpc()
    this.createWindow()
  }

  onBeforeQuit() {
    try {
      console.log('Persistiendo timer al salir...')
      TimerController.persistForQuit()
    } catch (err) {
      console.error('No se pudo persistir el timer al salir:', err)
    }
    try {
      require('./services/VlcAudioService').destroy()
    } catch {
      /* ignore */
    }
    closeConnection()
  }

  start() {
    this.configureApp()
    app.whenReady().then(() => {
      this.onReady()
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow()
      })
    })
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })
    app.on('before-quit', () => this.onBeforeQuit())
  }
}

new PomodoroApp().start()

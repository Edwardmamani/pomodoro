const { BrowserWindow, Notification, nativeImage } = require('electron')
const path = require('path')
const SettingsModel = require('../models/SettingsModel')

const APP_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png')
const LABELS = {
  focus: 'Concentración completada',
  short_break: 'Descanso corto terminado',
  long_break: 'Descanso largo terminado'
}

const settingsModel = new SettingsModel()

function playPeriodSound(volume) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('pomodoro:sound:play', { volume })
  }
}

function notifyPeriodComplete(periodType) {
  const settings = settingsModel.getAll()

  if (settings.notifications_enabled && Notification.isSupported()) {
    const icon = nativeImage.createFromPath(APP_ICON)
    // silent: el chime del SO se desactiva; la campana propia va por IPC
    const n = new Notification({
      title: 'Pomodoro Serene Focus',
      body: LABELS[periodType] || 'Periodo completado',
      silent: true,
      ...(icon.isEmpty() ? {} : { icon })
    })
    n.show()
  }

  if (settings.sound_enabled) {
    playPeriodSound(settings.sound_volume)
  }
}

module.exports = { notifyPeriodComplete }

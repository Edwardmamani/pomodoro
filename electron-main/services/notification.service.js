const { BrowserWindow, Notification, nativeImage } = require('electron')
const path = require('path')
const settingsService = require('./settings.service')

const APP_ICON = path.join(__dirname, '..', 'assets', 'icon.png')

function playPeriodSound(volume) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('pomodoro:sound:play', { volume })
  }
}

function notifyPeriodComplete(periodType) {
  const settings = settingsService.getAll()

  if (settings.notifications_enabled && Notification.isSupported()) {
    const labels = {
      focus: 'Concentración completada',
      short_break: 'Descanso corto terminado',
      long_break: 'Descanso largo terminado'
    }

    const icon = nativeImage.createFromPath(APP_ICON)
    // silent: el chime del SO se desactiva; la campana propia va por IPC
    const n = new Notification({
      title: 'Pomodoro Serene Focus',
      body: labels[periodType] || 'Periodo completado',
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

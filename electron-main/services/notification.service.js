const { BrowserWindow, Notification } = require('electron')
const settingsService = require('./settings.service')

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

    // silent: el chime del SO se desactiva; la campana propia va por IPC
    const n = new Notification({
      title: 'Pomodoro Serene Focus',
      body: labels[periodType] || 'Periodo completado',
      silent: true
    })
    n.show()
  }

  if (settings.sound_enabled) {
    playPeriodSound(settings.sound_volume)
  }
}

module.exports = { notifyPeriodComplete }

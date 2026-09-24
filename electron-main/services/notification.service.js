const { Notification } = require('electron')
const settingsService = require('./settings.service')

function notifyPeriodComplete(periodType) {
  const settings = settingsService.getAll()
  if (!settings.notifications_enabled) return

  const labels = {
    focus: 'Concentración completada',
    short_break: 'Descanso corto terminado',
    long_break: 'Descanso largo terminado'
  }

  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Pomodoro Serene Focus',
      body: labels[periodType] || 'Periodo completado',
      silent: !settings.sound_enabled
    })
    n.show()
  }
}

module.exports = { notifyPeriodComplete }

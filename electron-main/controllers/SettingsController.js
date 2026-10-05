const SettingsModel = require('../models/SettingsModel')
const TimerController = require('./TimerController')

class SettingsController {
  constructor() {
    this.settings = new SettingsModel()
  }

  get() {
    return { ok: true, data: this.settings.getAll() }
  }

  set(_event, partial) {
    const data = this.settings.setMany(partial || {})
    TimerController.syncDurationsFromSettings()
    return { ok: true, data }
  }

  reset() {
    const data = this.settings.resetDefaults()
    TimerController.syncDurationsFromSettings()
    return { ok: true, data }
  }
}

module.exports = new SettingsController()

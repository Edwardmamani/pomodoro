const { ipcMain, BrowserWindow } = require('electron')
const timerService = require('../services/timer.service')
const taskService = require('../services/task.service')
const settingsService = require('../services/settings.service')
const streakService = require('../services/streak.service')
const exportService = require('../services/export.service')
const musicService = require('../services/music.service')

function ok(data) {
  return { ok: true, data }
}

function fail(error) {
  return { ok: false, error }
}

function registerIpc() {
  ipcMain.handle('pomodoro:timer:get', () => ok(timerService.getState()))
  ipcMain.handle('pomodoro:timer:start', (_e, opts) => timerService.start(opts || {}))
  ipcMain.handle('pomodoro:timer:pause', () => timerService.pause())
  ipcMain.handle('pomodoro:timer:resume', () => timerService.resume())
  ipcMain.handle('pomodoro:timer:reset', () => timerService.reset())
  ipcMain.handle('pomodoro:timer:stop', () => timerService.stop())
  ipcMain.handle('pomodoro:timer:setMode', (_e, periodType, opts) =>
    timerService.setMode(periodType, opts || {})
  )

  ipcMain.handle('pomodoro:tasks:list', (_e, filters) =>
    ok(taskService.list(filters || {}))
  )
  ipcMain.handle('pomodoro:tasks:listTags', () => ok(taskService.listTags()))
  ipcMain.handle('pomodoro:tasks:create', (_e, input) =>
    taskService.create(input || {})
  )
  ipcMain.handle('pomodoro:tasks:update', (_e, id, input) =>
    taskService.update(id, input || {})
  )
  ipcMain.handle('pomodoro:tasks:setActive', (_e, id) =>
    taskService.setActive(id)
  )
  ipcMain.handle('pomodoro:tasks:delete', (_e, id) => taskService.remove(id))
  ipcMain.handle('pomodoro:tasks:export', (_e, format, filters) =>
    exportService.exportTasks(format || 'json', filters || {})
  )

  ipcMain.handle('pomodoro:settings:get', () => ok(settingsService.getAll()))
  ipcMain.handle('pomodoro:settings:set', (_e, partial) => {
    const data = settingsService.setMany(partial || {})
    timerService.syncDurationsFromSettings()
    return ok(data)
  })
  ipcMain.handle('pomodoro:settings:reset', () => {
    const data = settingsService.resetDefaults()
    timerService.syncDurationsFromSettings()
    return ok(data)
  })

  ipcMain.handle('pomodoro:streak:get', () => ok(streakService.getStreak()))

  ipcMain.handle('pomodoro:music:list', () => ok(musicService.list()))
  ipcMain.handle('pomodoro:music:getActive', () => ok(musicService.getActive()))
  ipcMain.handle('pomodoro:music:select', (_e, id) => musicService.select(id))
  ipcMain.handle('pomodoro:music:open', () => musicService.openActive())
  ipcMain.handle('pomodoro:music:add', (_e, input) =>
    musicService.add(input || {})
  )

  taskService.onChanged(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('pomodoro:tasks:changed')
    }
  })
}

module.exports = { registerIpc }

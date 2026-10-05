const { ipcMain, BrowserWindow } = require('electron')
const { Router } = require('./lib/router')
const TaskController = require('./controllers/TaskController')
const timerRoutes = require('./routes/timerRoutes')
const taskRoutes = require('./routes/taskRoutes')
const settingsRoutes = require('./routes/settingsRoutes')
const streakRoutes = require('./routes/streakRoutes')
const musicRoutes = require('./routes/musicRoutes')
const notesRoutes = require('./routes/notesRoutes')

function registerIpc() {
  const app = Router()
    .use(timerRoutes)
    .use(taskRoutes)
    .use(settingsRoutes)
    .use(streakRoutes)
    .use(musicRoutes)
    .use(notesRoutes)

  for (const { type, channel, handler } of app.routes) {
    if (type === 'on') {
      ipcMain.on(channel, handler)
    } else {
      ipcMain.handle(channel, handler)
    }
  }

  TaskController.onChanged(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('pomodoro:tasks:changed')
    }
  })
}

module.exports = { registerIpc }

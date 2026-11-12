const path = require('path')
const fs = require('fs')
const os = require('os')
const Module = require('module')

class ElectronMock {
  static install() {
    const mockUserData = path.join(os.tmpdir(), 'pomodoro-smoke-test')
    fs.mkdirSync(mockUserData, { recursive: true })
    const dbFile = path.join(mockUserData, 'pomodoro.db')
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)

    const originalRequire = Module.prototype.require
    Module.prototype.require = function (id) {
      if (id === 'electron') {
        return {
          app: { getPath: () => mockUserData },
          BrowserWindow: { getAllWindows: () => [], getFocusedWindow: () => null },
          Notification: Object.assign(function Notification() { return { show() {} } }, { isSupported: () => false }),
          shell: { openExternal: async () => {} },
          dialog: { showSaveDialog: async () => ({ canceled: true }) },
          session: { defaultSession: { webRequest: { onHeadersReceived() {} } } },
          ipcMain: { handle() {} }
        }
      }
      return originalRequire.apply(this, arguments)
    }
  }
}

module.exports = ElectronMock

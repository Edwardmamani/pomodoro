const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('pomodoroAPI', {
  timer: {
    get: () => invoke('pomodoro:timer:get'),
    start: (opts) => invoke('pomodoro:timer:start', opts),
    pause: () => invoke('pomodoro:timer:pause'),
    resume: () => invoke('pomodoro:timer:resume'),
    reset: () => invoke('pomodoro:timer:reset'),
    stop: () => invoke('pomodoro:timer:stop'),
    setMode: (periodType, opts) =>
      invoke('pomodoro:timer:setMode', periodType, opts),
    onState: (cb) => {
      const handler = (_e, state) => cb(state)
      ipcRenderer.on('pomodoro:timer:state', handler)
      return () => ipcRenderer.removeListener('pomodoro:timer:state', handler)
    }
  },
  tasks: {
    list: (filters) => invoke('pomodoro:tasks:list', filters),
    listTags: () => invoke('pomodoro:tasks:listTags'),
    create: (input) => invoke('pomodoro:tasks:create', input),
    update: (id, input) => invoke('pomodoro:tasks:update', id, input),
    setActive: (id) => invoke('pomodoro:tasks:setActive', id),
    remove: (id) => invoke('pomodoro:tasks:delete', id),
    export: (format, filters) =>
      invoke('pomodoro:tasks:export', format, filters),
    onChanged: (cb) => {
      const handler = () => cb()
      ipcRenderer.on('pomodoro:tasks:changed', handler)
      return () =>
        ipcRenderer.removeListener('pomodoro:tasks:changed', handler)
    }
  },
  settings: {
    get: () => invoke('pomodoro:settings:get'),
    set: (partial) => invoke('pomodoro:settings:set', partial),
    reset: () => invoke('pomodoro:settings:reset')
  },
  streak: {
    get: () => invoke('pomodoro:streak:get')
  },
  music: {
    list: () => invoke('pomodoro:music:list'),
    getActive: () => invoke('pomodoro:music:getActive'),
    select: (id) => invoke('pomodoro:music:select', id),
    open: () => invoke('pomodoro:music:open'),
    add: (input) => invoke('pomodoro:music:add', input)
  },
  sound: {
    onPlay: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('pomodoro:sound:play', handler)
      return () =>
        ipcRenderer.removeListener('pomodoro:sound:play', handler)
    }
  }
})

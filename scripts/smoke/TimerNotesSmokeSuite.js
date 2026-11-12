const timer = require('../../electron-main/controllers/TimerController')
const TaskModel = require('../../electron-main/models/TaskModel')
const NoteModel = require('../../electron-main/models/NoteModel')

class TimerNotesSmokeSuite {
  async run(activeTask) {
    const taskModel = new TaskModel()
    timer.reset()
    if (timer.getState().controlMode !== 'stopwatch') throw new Error('Modo debe ser stopwatch')
    if (!timer.start(null).ok) throw new Error('start falló')
    await new Promise((r) => setTimeout(r, 1200))

    const running = timer.getState()
    if (running.status !== 'running' || running.elapsedMs < 1000) throw new Error('Cronómetro no avanzó')
    if (!timer.pause().ok || timer.getState().status !== 'paused') throw new Error('pause falló')

    const afterPause = taskModel.getById(activeTask.id)
    if (!afterPause || afterPause.accumulated_ms < 500) throw new Error('Tiempo acumulado no registrado')

    timer.reset()
    if (timer.getState().status !== 'idle') throw new Error('Cronómetro debería estar idle tras reset')

    const noteModel = new NoteModel()
    const content = '# Nota de prueba en Markdown\nContenido de prueba'
    if (!(await noteModel.write(activeTask.id, content))) throw new Error('noteModel.write falló')
    const loaded = await noteModel.read(activeTask.id)
    if (!loaded || loaded.content !== content) throw new Error('noteModel.read contenido distinto')
  }
}

module.exports = TimerNotesSmokeSuite

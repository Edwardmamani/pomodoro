const taskController = require('../../electron-main/controllers/TaskController')
const notesController = require('../../electron-main/controllers/NotesController')
const TaskModel = require('../../electron-main/models/TaskModel')
const RoutineModel = require('../../electron-main/models/RoutineModel')
const { localDay, getDayOfWeek, formatDateLongSpanish } = require('../../electron-main/lib/date')

class RoutineSmokeSuite {
  async run() {
    const taskModel = new TaskModel()
    const routineModel = new RoutineModel()
    const today = localDay()
    const dow = getDayOfWeek(today)

    const routineRes = taskController.create(null, {
      title: 'Repaso Anki Diario', is_routine: true, days_of_week: [1, 2, 3, 4, 5, 6, 7],
      impact: 4, effort: 2, tags: ['Estudio', 'Rutina']
    })
    if (!routineRes.ok || !routineRes.routineId || !routineRes.data) throw new Error('Creación de rutina hoy falló')
    if (routineRes.data.routine_id !== routineRes.routineId || routineRes.data.due_date !== today) {
      throw new Error('Datos de tarea rutinaria incorrectos')
    }

    const otherDay = (dow % 7) + 1
    const futureRes = taskController.create(null, { title: 'Rutina alterna', is_routine: true, days_of_week: [otherDay], impact: 3 })
    if (!futureRes.ok || futureRes.data !== null) throw new Error('No debe crearse tarea para día distinto')

    taskModel.syncDailyRoutines(today)
    if (taskModel.list({ routine_id: routineRes.routineId }).length !== 1) throw new Error('syncDailyRoutines duplicó tarea')

    const noteLoad = await notesController.load(null, routineRes.data.id)
    if (!noteLoad.ok || !noteLoad.data.isRoutine || !noteLoad.data.content.includes(`### ${formatDateLongSpanish(today)}`)) {
      throw new Error('Nota rutinaria inválida')
    }
    const updatedContent = noteLoad.data.content + '\n- Vocabulario repaso 20 palabras completado.'
    if (!(await notesController.save(null, routineRes.data.id, updatedContent)).ok) throw new Error('Guardado nota falló')

    const otherDayTaskId = taskModel.create({ title: 'Repaso Anki Diario', due_date: '2026-11-01', routineId: routineRes.routineId })
    const otherLoad = await notesController.load(null, otherDayTaskId)
    if (!otherLoad.data.content.includes('Vocabulario repaso 20 palabras completado')) throw new Error('Notas no compartidas')

    if (!taskController.update(null, routineRes.data.id, { title: 'Repaso Anki Pro' }, { scope: 'all' }).ok) {
      throw new Error('update scope all falló')
    }
    if (routineModel.getById(routineRes.routineId)?.title !== 'Repaso Anki Pro') throw new Error('Plantilla no actualizada')

    if (!taskController.remove(null, routineRes.data.id, { scope: 'all' }).ok) throw new Error('remove scope all falló')
    if (routineModel.getById(routineRes.routineId) !== null || taskModel.list({ routine_id: routineRes.routineId }).length !== 0) {
      throw new Error('remove scope all no eliminó en cascada')
    }

    const anotherDay = dow === 7 ? 1 : dow + 1
    const notToday = taskController.create(null, { title: 'Rutina otro día', days_of_week: [anotherDay], is_routine: true })
    const found = taskController.list(null, { routine: true }).data.find((r) => r.routine_id === notToday.routineId)
    if (!found?.is_routine_template || found.is_active_today) throw new Error('Estado de rutina plantilla incorrecto')

    taskController.updateRoutine(null, notToday.routineId, { title: 'Rutina hoy', days_of_week: [anotherDay, dow] })
    const updatedItem = taskController.list(null, { routine: true }).data.find((r) => r.routine_id === notToday.routineId)
    if (!updatedItem?.is_active_today) throw new Error('Rutina no activada para hoy')

    if (!taskController.remove(null, `routine_${notToday.routineId}`).ok || routineModel.getById(notToday.routineId) !== null) {
      throw new Error('remove id virtual routine_<id> falló')
    }
  }
}

module.exports = RoutineSmokeSuite

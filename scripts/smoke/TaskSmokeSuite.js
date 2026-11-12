const taskController = require('../../electron-main/controllers/TaskController')
const TaskModel = require('../../electron-main/models/TaskModel')
const { localDay, addDaysLocal } = require('../../electron-main/lib/date')

class TaskSmokeSuite {
  constructor() {
    this.taskModel = new TaskModel()
  }

  run() {
    const tasks = this.taskModel.list()
    if (tasks.length < 1) throw new Error('Seed no creó tareas')
    if (typeof tasks[0].priority_score !== 'number' || tasks[0].priority_score <= 0) {
      throw new Error(`priority_score inválido en tarea seed: ${tasks[0].priority_score}`)
    }
    if (TaskModel.calculatePriorityScore(5, 4, 2, 3, 4) !== 16.0) {
      throw new Error('Cálculo de score incorrecto')
    }

    const created = taskController.create(null, {
      title: 'Tarea con Vector de Prioridad', impact: 5, urgency: 5, effort: 1, dependencies: 5, risk: 5, tags: ['Prioritaria']
    })
    if (!created.ok || created.data.priority_score !== 50.0) throw new Error('create o priority_score falló')

    const todoTasks = this.taskModel.list({ status: 'todo' })
    if (todoTasks[0].id !== created.data.id) throw new Error('Ordenación por prioridad descendente falló')

    const today = localDay()
    const cases = [
      [today, 5], [addDaysLocal(today, 1), 4], [addDaysLocal(today, 3), 3],
      [addDaysLocal(today, 6), 2], [addDaysLocal(today, 15), 1]
    ]
    for (const [due, expectedUrg] of cases) {
      const res = taskController.create(null, { title: `Vence ${due}`, due_date: due, impact: 4, effort: 2, dependencies: 1, risk: 2 })
      if (res.data.urgency !== expectedUrg) throw new Error(`Urgencia esperada ${expectedUrg}, obtenido ${res.data.urgency}`)
    }

    const taskEdit = taskController.create(null, {
      title: 'Tarea editar fecha', due_date: addDaysLocal(today, 15), impact: 4, effort: 2, dependencies: 1, risk: 2
    })
    const updated = taskController.update(null, taskEdit.data.id, { due_date: today })
    if (updated.data.urgency !== 5 || updated.data.priority_score !== 11.0) throw new Error('Recálculo al editar fecha falló')

    if (!taskController.setActive(null, created.data.id).ok) throw new Error('setActive falló')
    if (this.taskModel.list()[0].id !== created.data.id) throw new Error('Tarea activa no está primera')

    return created.data
  }
}

module.exports = TaskSmokeSuite

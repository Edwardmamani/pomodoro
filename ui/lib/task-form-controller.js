import { PriorityScoreHelper } from '@/lib/priority-score'

/**
 * Controlador OOP del estado, hidratación y envío del formulario de tareas.
 */
export class TaskFormController {
  static createDefaults() {
    return {
      title: '',
      due_date: '',
      is_routine: false,
      days_of_week: [1, 2, 3, 4, 5],
      impact: 3,
      urgency: 1,
      effort: 3,
      dependencies: 1,
      risk: 1
    }
  }

  static isRoutineTask(task) {
    if (!task) return false
    return Boolean(task.routine_id || task.is_routine || String(task.id).startsWith('routine_'))
  }

  static extractRoutineId(task) {
    if (!task) return null
    if (task.routine_id) return task.routine_id
    return String(task.id).startsWith('routine_') ? Number(String(task.id).replace('routine_', '')) : null
  }

  static scoreBadgeClass(score) {
    if (score >= 12) return 'bg-error/20 text-error border border-error/30'
    if (score >= 6) return 'bg-secondary/20 text-secondary border border-secondary/30'
    if (score >= 3) return 'bg-primary/20 text-primary border border-primary/30'
    return 'bg-white/10 text-on-surface-variant border border-white/10'
  }

  static calculateScore(form) {
    return PriorityScoreHelper.calculate(form)
  }

  static async hydrate(form, editTask, tasksStore, defaultDueDate = '') {
    if (!editTask) {
      Object.assign(form, TaskFormController.createDefaults())
      if (defaultDueDate) form.due_date = defaultDueDate
      return []
    }
    form.title = editTask.title || ''
    form.due_date = editTask.due_date || ''
    form.impact = editTask.impact ?? 3
    form.urgency = editTask.urgency ?? 1
    form.effort = editTask.effort ?? 3
    form.dependencies = editTask.dependencies ?? 1
    form.risk = editTask.risk ?? 1
    form.is_routine = TaskFormController.isRoutineTask(editTask)

    if (Array.isArray(editTask.days_of_week) && editTask.days_of_week.length > 0) {
      form.days_of_week = [...editTask.days_of_week]
    } else if (form.is_routine) {
      const routineId = TaskFormController.extractRoutineId(editTask)
      const rRes = routineId ? await tasksStore.getRoutine(routineId) : null
      form.days_of_week = rRes?.ok && rRes.data?.days_of_week ? [...rRes.data.days_of_week] : [1, 2, 3, 4, 5]
    } else {
      form.days_of_week = [1, 2, 3, 4, 5]
    }
    return Array.isArray(editTask.tags) ? [...editTask.tags] : []
  }

  static buildPayload(form, tags, editTask) {
    const payload = {
      title: form.title.trim(),
      due_date: form.due_date || null,
      impact: form.impact,
      urgency: form.urgency,
      effort: form.effort,
      dependencies: form.dependencies,
      risk: form.risk,
      tags: [...tags],
      status: editTask ? editTask.status : 'todo'
    }
    if (form.is_routine && form.days_of_week.length > 0) {
      payload.is_routine = true
      payload.days_of_week = [...form.days_of_week].sort((a, b) => a - b)
    }
    return payload
  }

  static async save(tasksStore, editTask, payload) {
    if (!editTask) return tasksStore.create(payload)
    const routineId = TaskFormController.extractRoutineId(editTask)
    return routineId ? tasksStore.updateRoutine(routineId, payload) : tasksStore.update(editTask.id, payload)
  }
}

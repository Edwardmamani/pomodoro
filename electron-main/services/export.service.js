const { dialog, BrowserWindow } = require('electron')
const fs = require('fs')
const taskService = require('./task.service')

async function exportTasks(format = 'json', filters = {}) {
  const tasks = taskService.list(filters)
  const win = BrowserWindow.getFocusedWindow()
  const isCsv = format === 'csv'
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Exportar tareas',
    defaultPath: isCsv ? 'tareas.csv' : 'tareas.json',
    filters: isCsv
      ? [{ name: 'CSV', extensions: ['csv'] }]
      : [{ name: 'JSON', extensions: ['json'] }]
  })

  if (canceled || !filePath) {
    return { ok: false, error: 'CANCELLED' }
  }

  let content
  if (isCsv) {
    const header =
      'id,title,status,priority,due_date,estimated_pomodoros,completed_pomodoros,accumulated_ms,tags'
    const lines = tasks.map((t) =>
      [
        t.id,
        csvEscape(t.title),
        t.status,
        t.priority,
        t.due_date || '',
        t.estimated_pomodoros,
        t.completed_pomodoros,
        t.accumulated_ms,
        csvEscape((t.tags || []).join('|'))
      ].join(',')
    )
    content = [header, ...lines].join('\n')
  } else {
    content = JSON.stringify(tasks, null, 2)
  }

  fs.writeFileSync(filePath, content, 'utf8')
  return { ok: true, data: { filePath, count: tasks.length } }
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

module.exports = { exportTasks }

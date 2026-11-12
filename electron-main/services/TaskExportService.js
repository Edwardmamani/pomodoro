const { dialog, BrowserWindow } = require('electron')
const fs = require('fs')

const CSV_HEADER =
  'id,title,status,priority,priority_score,impact,urgency,effort,dependencies,risk,due_date,accumulated_ms,tags'

class TaskExportService {
  static csvEscape(value) {
    const s = String(value ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  static toCsv(tasks) {
    const rows = tasks.map((t) =>
      [
        t.id,
        TaskExportService.csvEscape(t.title),
        t.status,
        t.priority,
        t.priority_score,
        t.impact,
        t.urgency,
        t.effort,
        t.dependencies,
        t.risk,
        t.due_date || '',
        t.accumulated_ms,
        TaskExportService.csvEscape((t.tags || []).join('|'))
      ].join(',')
    )
    return [CSV_HEADER, ...rows].join('\n')
  }

  async exportTasks(tasks, format) {
    const isCsv = format === 'csv'
    const win = BrowserWindow.getFocusedWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Exportar tareas',
      defaultPath: isCsv ? 'tareas.csv' : 'tareas.json',
      filters: isCsv ? [{ name: 'CSV', extensions: ['csv'] }] : [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { ok: false, error: 'CANCELLED' }

    const content = isCsv ? TaskExportService.toCsv(tasks) : JSON.stringify(tasks, null, 2)
    fs.writeFileSync(filePath, content, 'utf8')
    return { ok: true, data: { filePath, count: tasks.length } }
  }
}

module.exports = TaskExportService

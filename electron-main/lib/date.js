function localDay(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysLocal(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return localDay(dt)
}

function daysDiffFromToday(dueDateStr, todayStr = localDay()) {
  if (!dueDateStr || typeof dueDateStr !== 'string') return null
  const clean = dueDateStr.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null
  const [y1, m1, d1] = clean.split('-').map(Number)
  const [y0, m0, d0] = todayStr.split('-').map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc0 = Date.UTC(y0, m0 - 1, d0)
  return Math.round((utc1 - utc0) / (1000 * 60 * 60 * 24))
}

function calculateUrgencyFromDueDate(dueDateStr, todayStr = localDay()) {
  if (!dueDateStr) return 1
  const diff = daysDiffFromToday(dueDateStr, todayStr)
  if (diff == null) return 1
  if (diff <= 0) return 5 // Vencida o vence hoy
  if (diff === 1) return 4 // Vence mañana
  if (diff <= 3) return 3 // Vence en 2 o 3 días
  if (diff <= 7) return 2 // Vence en 4 a 7 días
  return 1 // Más de 7 días / plazo holgado
}

module.exports = {
  localDay,
  addDaysLocal,
  daysDiffFromToday,
  calculateUrgencyFromDueDate
}

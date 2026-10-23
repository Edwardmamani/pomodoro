export function localDay(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysDiffFromToday(dueDateStr, todayStr = localDay()) {
  if (!dueDateStr || typeof dueDateStr !== 'string') return null
  const clean = dueDateStr.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null
  const [y1, m1, d1] = clean.split('-').map(Number)
  const [y0, m0, d0] = todayStr.split('-').map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc0 = Date.UTC(y0, m0 - 1, d0)
  return Math.round((utc1 - utc0) / (1000 * 60 * 60 * 24))
}

export function calculateUrgencyFromDueDate(dueDateStr, todayStr = localDay()) {
  if (!dueDateStr) return 1
  const diff = daysDiffFromToday(dueDateStr, todayStr)
  if (diff == null) return 1
  if (diff <= 0) return 5
  if (diff === 1) return 4
  if (diff <= 3) return 3
  if (diff <= 7) return 2
  return 1
}

export function getUrgencyHint(dueDateStr, todayStr = localDay()) {
  if (!dueDateStr) return 'Sin fecha límite · U = 1'
  const diff = daysDiffFromToday(dueDateStr, todayStr)
  if (diff == null) return 'Sin fecha límite · U = 1'
  if (diff < 0) return `Vencida (${Math.abs(diff)}d atrás) · U = 5`
  if (diff === 0) return 'Vence hoy · U = 5'
  if (diff === 1) return 'Vence mañana · U = 4'
  if (diff <= 3) return `Vence en ${diff}d · U = 3`
  if (diff <= 7) return `Vence en ${diff}d · U = 2`
  return `Vence en ${diff}d · U = 1`
}

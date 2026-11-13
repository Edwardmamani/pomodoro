const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function parseIsoDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

export function toIsoDate(y, m, d) {
  const dt = new Date(y, m - 1, d)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function getIsoWeekday(iso) {
  const { y, m, d } = parseIsoDate(iso)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 ? 7 : day
}

export function addDaysIso(iso, delta) {
  const { y, m, d } = parseIsoDate(iso)
  return toIsoDate(y, m, d + delta)
}

export function shiftDate(iso, viewMode, delta) {
  if (viewMode === 'day') return addDaysIso(iso, delta)
  if (viewMode === 'week') return addDaysIso(iso, delta * 7)
  const { y, m, d } = parseIsoDate(iso)
  const target = new Date(y, m - 1 + delta, 1)
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return toIsoDate(target.getFullYear(), target.getMonth() + 1, Math.min(d, maxDay))
}

export function getWeekDays(anchorIso, todayIso) {
  const offset = getIsoWeekday(anchorIso) - 1
  const monday = addDaysIso(anchorIso, -offset)
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysIso(monday, i)
    const { d } = parseIsoDate(iso)
    return { iso, dayNum: d, weekday: i + 1, inMonth: true, isToday: iso === todayIso }
  })
}

export function getMonthGridDays(anchorIso, todayIso) {
  const { y, m } = parseIsoDate(anchorIso)
  const firstIso = toIsoDate(y, m, 1)
  const lead = getIsoWeekday(firstIso) - 1
  const daysInMonth = new Date(y, m, 0).getDate()
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7
  const startIso = addDaysIso(firstIso, -lead)
  return Array.from({ length: totalCells }, (_, i) => {
    const iso = addDaysIso(startIso, i)
    const parts = parseIsoDate(iso)
    return { iso, dayNum: parts.d, inMonth: parts.m === m && parts.y === y, isToday: iso === todayIso }
  })
}

export function formatPeriodTitle(anchorIso, viewMode) {
  const { y, m, d } = parseIsoDate(anchorIso)
  if (viewMode === 'month') return `${MONTHS_ES[m - 1]} ${y}`
  if (viewMode === 'day') {
    const wd = WEEKDAYS_ES[new Date(y, m - 1, d).getDay()]
    return `${wd}, ${d} ${MONTHS_SHORT[m - 1]} ${y}`
  }
  const days = getWeekDays(anchorIso, anchorIso)
  const s = parseIsoDate(days[0].iso)
  const e = parseIsoDate(days[6].iso)
  if (s.m === e.m) return `${s.d} – ${e.d} ${MONTHS_SHORT[e.m - 1]} ${e.y}`
  return `${s.d} ${MONTHS_SHORT[s.m - 1]} – ${e.d} ${MONTHS_SHORT[e.m - 1]} ${e.y}`
}

/**
 * Formatea milisegundos acumulados de una tarea para el contador de lista.
 * @param {number} ms
 * @returns {string}
 */
export function formatAccumulated(ms) {
  const totalSec = Math.floor((ms || 0) / 1000)
  if (totalSec < 60) return `${totalSec}s`

  const s = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  if (totalSec < 3600) {
    return `${totalMin} min ${String(s).padStart(2, '0')}s`
  }

  const m = totalMin % 60
  const totalHours = Math.floor(totalMin / 60)
  if (totalSec < 86400) {
    return `${totalHours} horas ${m} min`
  }

  const h = totalHours % 24
  const d = Math.floor(totalHours / 24)
  return `${d} dias ${h} horas ${m} min`
}

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta', bars: 3 },
  { value: 'medium', label: 'Media', bars: 2 },
  { value: 'low', label: 'Baja', bars: 1 }
]

export const STATUS_OPTIONS = [
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'done', label: 'Hecha' },
  { value: 'cancelled', label: 'Cancelada' }
]

export const DUE_OPTIONS = [
  { value: 'overdue', label: 'Vencidas', icon: 'event_busy', iconClass: 'text-error' },
  { value: 'today', label: 'Hoy', icon: 'today', iconClass: 'text-secondary' },
  { value: 'upcoming', label: 'Próximas (48 h)', icon: 'event_upcoming', iconClass: 'text-primary' },
  { value: 'set', label: 'Con fecha', icon: 'event', iconClass: 'text-on-surface-variant' },
  { value: 'none', label: 'Sin fecha', icon: 'block', iconClass: 'text-outline' }
]

const STATUS_ICON_MAP = {
  in_progress: 'text-primary',
  done: 'text-primary',
  cancelled: 'text-outline',
  blocked: 'text-secondary'
}

export function statusIconClass(status) {
  return STATUS_ICON_MAP[status] ?? 'text-on-surface-variant'
}

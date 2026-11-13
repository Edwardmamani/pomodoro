import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPeriodTitle,
  getMonthGridDays,
  getWeekDays,
  shiftDate
} from '../../ui/lib/calendar-dates.js'
import { groupTasksByDate } from '../../ui/lib/calendar-grouping.js'
import { collectAvailableTags, filterCalendarItems } from '../../ui/lib/calendar-filters.js'

test('getMonthGridDays generates 28-42 cells aligned Mon-Sun', () => {
  const feb2024 = getMonthGridDays('2024-02-15', '2024-02-15')
  assert.equal(feb2024.length % 7, 0)
  assert.equal(feb2024.find((d) => d.iso === '2024-02-29')?.inMonth, true)
  assert.equal(feb2024.find((d) => d.iso === '2024-02-15')?.isToday, true)
})

test('getWeekDays returns 7 consecutive days Mon-Sun', () => {
  const week = getWeekDays('2026-11-13', '2026-11-13')
  assert.equal(week.length, 7)
  assert.equal(week[0].iso, '2026-11-09')
  assert.equal(week[6].iso, '2026-11-15')
  assert.equal(week[4].isToday, true)
})

test('shiftDate handles day, week, month and leap/clamp transitions', () => {
  assert.equal(shiftDate('2026-12-31', 'day', 1), '2027-01-01')
  assert.equal(shiftDate('2026-11-13', 'week', -1), '2026-11-06')
  assert.equal(shiftDate('2026-01-31', 'month', 1), '2026-02-28')
  assert.equal(shiftDate('2026-12-15', 'month', 1), '2027-01-15')
})

test('formatPeriodTitle formats Spanish labels for all modes', () => {
  assert.equal(formatPeriodTitle('2026-11-13', 'month'), 'Noviembre 2026')
  assert.match(formatPeriodTitle('2026-11-13', 'week'), /9 – 15 nov 2026/)
  assert.equal(formatPeriodTitle('2026-11-13', 'day'), 'Viernes, 13 nov 2026')
})

test('groupTasksByDate groups, sorts, separates unscheduled, and projects future routines', () => {
  const tasks = [
    { id: 1, title: 'Hecha', status: 'done', priority_score: 15, due_date: '2026-11-13' },
    { id: 2, title: 'Urgente', status: 'todo', priority_score: 12, due_date: '2026-11-13' },
    { id: 3, title: 'Sin fecha', status: 'todo', priority_score: 5, due_date: null },
    { id: 4, title: 'Rutina hoy', status: 'todo', priority_score: 8, due_date: '2026-11-13', routine_id: 10 }
  ]
  const routines = [{ routine_id: 10, title: 'Rutina diaria', days_of_week: [5, 6], priority_score: 8 }]
  const { byDate, unscheduled } = groupTasksByDate(tasks, routines, '2026-11-09', '2026-11-15', '2026-11-13')

  assert.equal(unscheduled.length, 1)
  assert.equal(byDate.get('2026-11-13')[0].id, 2)
  assert.equal(byDate.get('2026-11-13').at(-1).id, 1)
  assert.equal(byDate.get('2026-11-13').filter((t) => t.routine_id === 10).length, 1)
  assert.equal(byDate.get('2026-11-14').length, 1)
  assert.equal(byDate.get('2026-11-14')[0].is_projected, true)
})

test('filterCalendarItems filters by tag, routineType, and showCompleted', () => {
  const items = [
    { id: 1, status: 'done', is_routine: false, tags: ['Trabajo'] },
    { id: 2, status: 'todo', is_routine: true, routine_id: 5, tags: ['Salud'] },
    { id: 3, status: 'todo', is_routine: false, tags: ['trabajo', 'Urgente'] }
  ]
  assert.equal(filterCalendarItems(items, { tag: '', routineType: 'all', showCompleted: false }).length, 2)
  assert.deepEqual(filterCalendarItems(items, { tag: '', routineType: 'routine', showCompleted: true }).map((i) => i.id), [2])
  assert.deepEqual(filterCalendarItems(items, { tag: '', routineType: 'non_routine', showCompleted: false }).map((i) => i.id), [3])
  assert.deepEqual(filterCalendarItems(items, { tag: 'trabajo', routineType: 'all', showCompleted: true }).map((i) => i.id), [1, 3])
  assert.deepEqual(collectAvailableTags(items, []), ['Salud', 'Trabajo', 'Urgente'])
})

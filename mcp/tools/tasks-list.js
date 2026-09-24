module.exports = {
  name: 'tasks_list',
  description: 'Lista tareas con filtros opcionales (status, q, priority)',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      q: { type: 'string' },
      priority: { type: 'string' }
    }
  },
  handler: async (args, { taskService }) => {
    const data = taskService.list(args || {})
    return { ok: true, data }
  }
}

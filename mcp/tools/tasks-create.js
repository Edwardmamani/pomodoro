module.exports = {
  name: 'tasks_create',
  description: 'Crea una tarea nueva',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      status: { type: 'string' },
      priority: { type: 'string' },
      due_date: { type: 'string' },
      estimated_pomodoros: { type: 'number' },
      tags: { type: 'array', items: { type: 'string' } }
    },
    required: ['title']
  },
  handler: async (args, { taskService }) => taskService.create(args || {})
}

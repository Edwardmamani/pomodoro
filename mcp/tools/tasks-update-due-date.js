module.exports = {
  name: 'tasks_update_due_date',
  description: 'Actualiza la fecha límite de una tarea',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      due_date: { type: ['string', 'null'] }
    },
    required: ['id']
  },
  handler: async (args, { taskService }) =>
    taskService.updateDueDate(args.id, args.due_date ?? null)
}

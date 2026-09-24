class ToolRegistry {
  constructor() {
    this.tools = new Map()
  }

  register(tool) {
    if (!tool?.name || typeof tool.handler !== 'function') {
      throw new Error('Tool inválida')
    }
    this.tools.set(tool.name, tool)
  }

  list() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  }

  async call(name, args = {}) {
    const tool = this.tools.get(name)
    if (!tool) {
      return { ok: false, error: 'TOOL_NOT_FOUND' }
    }
    return tool.handler(args)
  }
}

module.exports = { ToolRegistry }

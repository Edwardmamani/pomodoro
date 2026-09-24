class McpProtocolAdapter {
  constructor({ registry, isEnabled, deps }) {
    this.registry = registry
    this.isEnabled = isEnabled
    this.deps = deps
  }

  async handle(message) {
    if (!this.isEnabled()) {
      return this.error(message?.id, -32001, 'MCP deshabilitado (mcp_enabled=false)')
    }

    const { method, id, params } = message || {}

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'pomodoro-mcp', version: '0.1.0' }
        }
      }
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: this.registry.list() }
      }
    }

    if (method === 'tools/call') {
      const name = params?.name
      const args = params?.arguments || {}
      const tool = this.registry.tools.get(name)
      if (!tool) {
        return this.error(id, -32601, `Tool no encontrada: ${name}`)
      }
      try {
        const result = await tool.handler(args, this.deps)
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }]
          }
        }
      } catch (err) {
        return this.error(id, -32000, err.message || 'Error en tool')
      }
    }

    if (method === 'notifications/initialized') {
      return null
    }

    return this.error(id, -32601, `Método no soportado: ${method}`)
  }

  error(id, code, message) {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code, message }
    }
  }
}

module.exports = { McpProtocolAdapter }

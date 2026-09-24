const readline = require('readline')

function startStdioTransport(adapter) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })

  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let message
    try {
      message = JSON.parse(trimmed)
    } catch {
      const err = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }
      process.stdout.write(`${JSON.stringify(err)}\n`)
      return
    }

    const response = await adapter.handle(message)
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`)
    }
  })
}

module.exports = { startStdioTransport }

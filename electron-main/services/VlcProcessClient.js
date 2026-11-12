const { spawn } = require('child_process')

class VlcProcessClient {
  constructor(onStateChange) {
    this.proc = null
    this.onStateChange = onStateChange
    this._stdoutBuffer = ''
    this._pendingResolvers = []
    this._queryQueue = Promise.resolve()
  }

  isAlive() {
    return Boolean(this.proc && !this.proc.killed)
  }

  ensureProcess() {
    if (this.isAlive()) return this.proc

    this.proc = spawn(
      'cvlc',
      ['-I', 'rc', '--no-video', '--quiet', '--no-loop', '--no-repeat', '--network-caching=5000'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )
    this.proc.unref()

    this.proc.stdout.on('data', (chunk) => this._handleStdout(chunk))
    this.proc.on('exit', () => this._cleanup())
    this.proc.on('error', () => {
      this.proc = null
      this.onStateChange('stopped')
    })

    return this.proc
  }

  _handleStdout(chunk) {
    this._stdoutBuffer += chunk.toString()
    const lines = this._stdoutBuffer.split(/\r?\n/)
    this._stdoutBuffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.replace(/^>\s*/, '').trim()
      if (!line) continue

      if (line.includes('( state playing )')) this.onStateChange('playing')
      else if (line.includes('( state paused )')) this.onStateChange('paused')
      else if (line.includes('( state stopped )')) this.onStateChange('stopped')

      if (this._pendingResolvers.length > 0) {
        const waiter = this._pendingResolvers[0]
        if (waiter.match(line)) {
          this._pendingResolvers.shift()
          clearTimeout(waiter.timer)
          waiter.resolve(line)
        }
      }
    }
  }

  _cleanup() {
    this.proc = null
    this.onStateChange('stopped')
    while (this._pendingResolvers.length > 0) {
      const waiter = this._pendingResolvers.shift()
      clearTimeout(waiter.timer)
      waiter.resolve(null)
    }
  }

  send(cmd) {
    const proc = this.ensureProcess()
    if (proc?.stdin?.writable) proc.stdin.write(`${cmd}\n`)
  }

  ask(cmd, matchFn, timeoutMs = 600) {
    this._queryQueue = this._queryQueue.then(
      () =>
        new Promise((resolve) => {
          const proc = this.ensureProcess()
          if (!proc?.stdin?.writable) {
            resolve(null)
            return
          }
          const waiter = {
            match: matchFn,
            resolve,
            timer: setTimeout(() => {
              const idx = this._pendingResolvers.indexOf(waiter)
              if (idx >= 0) this._pendingResolvers.splice(idx, 1)
              resolve(null)
            }, timeoutMs)
          }
          this._pendingResolvers.push(waiter)
          proc.stdin.write(`${cmd}\n`)
        })
    )
    return this._queryQueue
  }

  destroy() {
    if (this.isAlive()) {
      try {
        this.send('quit')
      } catch { /* ignore */ }
      try {
        this.proc.kill('SIGTERM')
      } catch { /* ignore */ }
    }
    this.proc = null
  }
}

module.exports = VlcProcessClient

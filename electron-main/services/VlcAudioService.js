const { spawn } = require('child_process')

/**
 * Servicio de reproducción de audio nativo mediante VLC (cvlc -I rc),
 * equivalente al AudioPlayerService de youtube-api-v3.
 */
class VlcAudioService {
  constructor() {
    this.proc = null
    this.currentTrackId = null
    this.currentDuration = 0
    this.volume = 75
    this.state = 'stopped' // 'playing' | 'paused' | 'stopped'
    this.userStopped = false
    this.hasStarted = false
    this._stdoutBuffer = ''
    this._pendingResolvers = []
    this._lastTime = 0
    this._lastLength = 0
    this._queryQueue = Promise.resolve()
  }

  _ensureProcess() {
    if (this.proc && !this.proc.killed) return this.proc

    this.proc = spawn(
      'cvlc',
      [
        '-I',
        'rc',
        '--no-video',
        '--quiet',
        '--no-loop',
        '--no-repeat',
        '--network-caching=5000'
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    )

    // No bloquear el cierre de procesos Node en pruebas unitarias
    this.proc.unref()

    this.proc.stdout.on('data', (chunk) => {
      this._stdoutBuffer += chunk.toString()
      const lines = this._stdoutBuffer.split(/\r?\n/)
      this._stdoutBuffer = lines.pop() || ''

      for (const rawLine of lines) {
        const line = rawLine.replace(/^>\s*/, '').trim()
        if (!line) continue

        if (line.includes('( state playing )')) {
          this.state = 'playing'
        } else if (line.includes('( state paused )')) {
          this.state = 'paused'
        } else if (line.includes('( state stopped )')) {
          this.state = 'stopped'
        }

        if (this._pendingResolvers.length > 0) {
          const waiter = this._pendingResolvers[0]
          if (waiter.match(line)) {
            this._pendingResolvers.shift()
            clearTimeout(waiter.timer)
            waiter.resolve(line)
          }
        }
      }
    })

    this.proc.on('exit', () => {
      this.proc = null
      this.state = 'stopped'
      while (this._pendingResolvers.length > 0) {
        const waiter = this._pendingResolvers.shift()
        clearTimeout(waiter.timer)
        waiter.resolve(null)
      }
    })

    this.proc.on('error', () => {
      this.proc = null
      this.state = 'stopped'
    })

    return this.proc
  }

  _send(cmd) {
    const proc = this._ensureProcess()
    if (proc && proc.stdin && proc.stdin.writable) {
      proc.stdin.write(`${cmd}\n`)
    }
  }

  _ask(cmd, matchFn, timeoutMs = 600) {
    this._queryQueue = this._queryQueue.then(
      () =>
        new Promise((resolve) => {
          const proc = this._ensureProcess()
          if (!proc || !proc.stdin || !proc.stdin.writable) {
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

  _toVlcVolume(level) {
    const clamped = Math.max(0, Math.min(100, Number(level) || 0))
    return Math.round((clamped / 100) * 256)
  }

  playStream(streamUrl, trackId, duration = 0) {
    this._ensureProcess()
    this.userStopped = false
    this.hasStarted = true
    this.currentTrackId = trackId
    this.currentDuration = Number(duration) || 0
    this._lastTime = 0
    this._lastLength = this.currentDuration
    this.state = 'playing'

    this._send('clear')
    this._send(`add ${streamUrl}`)
    this._send(`volume ${this._toVlcVolume(this.volume)}`)
  }

  play() {
    this.userStopped = false
    this.state = 'playing'
    this._send('play')
    return true
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused'
      this._send('pause')
    }
    return false
  }

  seek(seconds) {
    const target = Math.max(0, Math.floor(Number(seconds) || 0))
    this._lastTime = target
    this._send(`seek ${target}`)
  }

  setVolume(level) {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(level) || 0)))
    this.volume = clamped
    if (this.proc && !this.proc.killed) {
      this._send(`volume ${this._toVlcVolume(clamped)}`)
    }
    return clamped
  }

  stop() {
    this.userStopped = true
    this.hasStarted = false
    this.state = 'stopped'
    this._lastTime = 0
    if (this.proc && !this.proc.killed) {
      this._send('stop')
    }
  }

  async getStatus() {
    if (!this.proc || this.proc.killed) {
      return {
        state: 'stopped',
        time: 0,
        duration: this.currentDuration,
        volume: this.volume,
        currentId: this.currentTrackId,
        ended: false
      }
    }

    const prevState = this.state
    const statusLine = await this._ask(
      'status',
      (line) =>
        line.includes('( state playing )') ||
        line.includes('( state paused )') ||
        line.includes('( state stopped )')
    )

    if (statusLine && statusLine.includes('playing')) {
      this.state = 'playing'
    } else if (statusLine && statusLine.includes('paused')) {
      this.state = 'paused'
    } else if (statusLine && statusLine.includes('stopped')) {
      this.state = 'stopped'
    }

    const ended =
      this.hasStarted &&
      !this.userStopped &&
      prevState === 'playing' &&
      this.state === 'stopped'

    if (ended) {
      this.hasStarted = false
    }

    if (this.state === 'playing' || this.state === 'paused') {
      const timeLine = await this._ask('get_time', (line) => /^\d+$/.test(line))
      if (timeLine !== null) {
        this._lastTime = Number(timeLine) || 0
      }

      const lenLine = await this._ask('get_length', (line) => /^\d+$/.test(line))
      if (lenLine !== null) {
        const len = Number(lenLine) || 0
        if (len > 0) this._lastLength = len
      }
    }

    const duration = this._lastLength > 0 ? this._lastLength : this.currentDuration

    return {
      state: this.state,
      time: this._lastTime,
      duration,
      volume: this.volume,
      currentId: this.currentTrackId,
      ended
    }
  }

  destroy() {
    this.userStopped = true
    this.hasStarted = false
    if (this.proc && !this.proc.killed) {
      try {
        this._send('quit')
      } catch {
        /* ignore */
      }
      try {
        this.proc.kill('SIGTERM')
      } catch {
        /* ignore */
      }
    }
    this.proc = null
  }
}

module.exports = new VlcAudioService()


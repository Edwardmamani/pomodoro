const VlcProcessClient = require('./VlcProcessClient')

class VlcAudioService {
  constructor() {
    this.currentTrackId = null
    this.currentDuration = 0
    this.volume = 75
    this.state = 'stopped'
    this.userStopped = false
    this.hasStarted = false
    this._lastTime = 0
    this._lastLength = 0
    this.client = new VlcProcessClient((nextState) => {
      this.state = nextState
    })
  }

  _toVlcVolume(level) {
    const clamped = Math.max(0, Math.min(100, Number(level) || 0))
    return Math.round((clamped / 100) * 256)
  }

  playStream(streamUrl, trackId, duration = 0) {
    this.client.ensureProcess()
    this.userStopped = false
    this.hasStarted = true
    this.currentTrackId = trackId
    this.currentDuration = Number(duration) || 0
    this._lastTime = 0
    this._lastLength = this.currentDuration
    this.state = 'playing'

    this.client.send('clear')
    this.client.send(`add ${streamUrl}`)
    this.client.send(`volume ${this._toVlcVolume(this.volume)}`)
  }

  play() {
    this.userStopped = false
    this.state = 'playing'
    this.client.send('play')
    return true
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused'
      this.client.send('pause')
    }
    return false
  }

  seek(seconds) {
    const target = Math.max(0, Math.floor(Number(seconds) || 0))
    this._lastTime = target
    this.client.send(`seek ${target}`)
  }

  setVolume(level) {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(level) || 0)))
    this.volume = clamped
    if (this.client.isAlive()) {
      this.client.send(`volume ${this._toVlcVolume(clamped)}`)
    }
    return clamped
  }

  stop() {
    this.userStopped = true
    this.hasStarted = false
    this.state = 'stopped'
    this._lastTime = 0
    if (this.client.isAlive()) this.client.send('stop')
  }

  async getStatus() {
    if (!this.client.isAlive()) {
      return { state: 'stopped', time: 0, duration: this.currentDuration, volume: this.volume, currentId: this.currentTrackId, ended: false }
    }

    const prevState = this.state
    const statusLine = await this.client.ask(
      'status',
      (line) => line.includes('( state playing )') || line.includes('( state paused )') || line.includes('( state stopped )')
    )
    if (statusLine?.includes('playing')) this.state = 'playing'
    else if (statusLine?.includes('paused')) this.state = 'paused'
    else if (statusLine?.includes('stopped')) this.state = 'stopped'

    const ended = this.hasStarted && !this.userStopped && prevState === 'playing' && this.state === 'stopped'
    if (ended) this.hasStarted = false

    if (this.state === 'playing' || this.state === 'paused') {
      const timeLine = await this.client.ask('get_time', (line) => /^\d+$/.test(line))
      if (timeLine !== null) this._lastTime = Number(timeLine) || 0

      const lenLine = await this.client.ask('get_length', (line) => /^\d+$/.test(line))
      if (lenLine !== null && Number(lenLine) > 0) this._lastLength = Number(lenLine)
    }

    return {
      state: this.state,
      time: this._lastTime,
      duration: this._lastLength > 0 ? this._lastLength : this.currentDuration,
      volume: this.volume,
      currentId: this.currentTrackId,
      ended
    }
  }

  destroy() {
    this.userStopped = true
    this.hasStarted = false
    this.client.destroy()
  }
}

module.exports = new VlcAudioService()

/** Sintetiza una campana breve con Web Audio (sin archivo externo). */
let sharedCtx = null

function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioCtx()
  }
  return sharedCtx
}

/** Desbloquea el AudioContext tras un gesto del usuario (política de autoplay). */
export function unlockAudio() {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/**
 * @param {number} volumePercent 0–100
 */
export function playBell(volumePercent = 75) {
  const ctx = getContext()
  if (!ctx) return

  const resume =
    ctx.state === 'suspended' ? ctx.resume().catch(() => {}) : Promise.resolve()

  resume.then(() => {
    const now = ctx.currentTime
    const master = ctx.createGain()
    const level = Math.max(0, Math.min(1, Number(volumePercent) / 100)) * 0.45
    master.gain.setValueAtTime(level, now)
    master.connect(ctx.destination)

    // Parciales tipo campana (frecuencia fundamental ~830 Hz)
    const partials = [
      { freq: 830, peak: 1, decay: 1.6 },
      { freq: 1660, peak: 0.45, decay: 1.1 },
      { freq: 2489, peak: 0.22, decay: 0.75 },
      { freq: 3320, peak: 0.1, decay: 0.45 }
    ]

    for (const { freq, peak, decay } of partials) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain)
      gain.connect(master)
      osc.start(now)
      osc.stop(now + decay + 0.05)
    }
  })
}

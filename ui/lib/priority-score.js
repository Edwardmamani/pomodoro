export class PriorityScoreHelper {
  static clamp(val, fallback = 3) {
    return Math.max(1, Math.min(5, Number(val) || fallback))
  }

  static calculate(d) {
    const i = PriorityScoreHelper.clamp(d.impact, 3)
    const u = PriorityScoreHelper.clamp(d.urgency, 3)
    const e = PriorityScoreHelper.clamp(d.effort, 3)
    const dep = PriorityScoreHelper.clamp(d.dependencies, 1)
    const r = PriorityScoreHelper.clamp(d.risk, 1)
    return Number(((i * u + dep * r) / e).toFixed(2))
  }

  static chipClass(sc) {
    if (sc >= 12) return 'bg-error/15 text-error border border-error/30'
    if (sc >= 6) return 'bg-secondary/15 text-secondary border border-secondary/30'
    if (sc >= 3) return 'bg-primary/15 text-primary border border-primary/30'
    return 'bg-white/10 text-on-surface-variant border border-white/10'
  }

  static dotClass(sc) {
    if (sc >= 12) return 'bg-error'
    if (sc >= 6) return 'bg-secondary'
    if (sc >= 3) return 'bg-primary'
    return 'bg-outline'
  }
}

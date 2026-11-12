class PriorityCalculator {
  static clamp(val, fallback = 3) {
    return Math.max(1, Math.min(5, Number(val) || fallback))
  }

  static normalizeVectors(input = {}, defaults = {}) {
    const pick = (key, fb) =>
      input[key] !== undefined
        ? PriorityCalculator.clamp(input[key], fb)
        : (defaults[key] ?? fb)

    const impact = pick('impact', 3)
    const urgency = pick('urgency', 3)
    const effort = pick('effort', 3)
    const dependencies = pick('dependencies', 1)
    const risk = pick('risk', 1)
    const score = PriorityCalculator.calculateScore(impact, urgency, effort, dependencies, risk)
    return { impact, urgency, effort, dependencies, risk, score }
  }

  static calculateScore(impact, urgency, effort, dependencies, risk) {
    const i = PriorityCalculator.clamp(impact, 3)
    const u = PriorityCalculator.clamp(urgency, 3)
    const e = PriorityCalculator.clamp(effort, 3)
    const d = PriorityCalculator.clamp(dependencies, 1)
    const r = PriorityCalculator.clamp(risk, 1)
    return Number(((i * u + d * r) / e).toFixed(2))
  }

  static deriveLabel(score) {
    if (score >= 12) return 'high'
    if (score >= 4) return 'medium'
    return 'low'
  }
}

module.exports = PriorityCalculator

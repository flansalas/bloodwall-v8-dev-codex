import type { Metric } from '@/types/api'

export const getProgressToGoal = (metric: Metric | null | undefined) => {
  if (!metric) return 0
  const denominator = metric.baseline - metric.goal
  if (Math.abs(denominator) < Number.EPSILON) {
    return 0
  }
  const raw = ((metric.baseline - metric.current) / denominator) * 100
  if (!Number.isFinite(raw)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(raw)))
}

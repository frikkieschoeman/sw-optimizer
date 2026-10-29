import type { Stage, Strictness } from '../types'
import { DEFAULT_RULES } from './defaults'
import type { RulesConfig, StatMap } from './types'

const STAGE_FACTOR: Record<Stage, number> = { Early: 0.85, Mid: 1, Late: 1.1 }

const scale = (m: StatMap, f: number): StatMap =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * f)]))

/**
 * Mid + Strictness 4 is exactly DEFAULT_RULES (the verdict.py port).
 * Other presets move the same knobs: line strength, stat-strength bar,
 * minimum lines, and the relaxed retry at Strictness 1-3.
 */
export function buildRules(stage: Stage, strictness: Strictness): RulesConfig {
  const d = DEFAULT_RULES
  const step = strictness - 4
  const f = STAGE_FACTOR[stage] * (1 + 0.03 * step)
  return {
    ...d,
    high: scale(d.high, f),
    god: scale(d.god, f),
    duos: d.duos.map(([a, b, x, y]) => [a, b, Math.round(x * f), Math.round(y * f)]),
    needBase: d.needBase + 0.4 * step + (STAGE_FACTOR[stage] - 1) * 4,
    minLinesOdd: strictness <= 2 ? d.minLinesOdd - 1 : d.minLinesOdd,
    minLinesEven: strictness <= 2 ? d.minLinesEven - 1 : d.minLinesEven,
    relaxedRetry: strictness <= 3,
    anchorFromLevel: stage === 'Early' ? 15 : d.anchorFromLevel,
  }
}

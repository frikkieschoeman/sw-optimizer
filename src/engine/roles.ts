import { isFlat } from './constants'
import type { RulesConfig, RoleRule } from './rules/types'
import { lines, rollEq, type RuneShape } from './stats'
import type { Role } from './types'

export interface FitResult {
  role: Role | null
  score: number
  relaxed: boolean
}

function fitStrict(
  rules: RulesConfig, r: RuneShape, lvl: number, minLinesDrop: number, needDrop: number,
): { role: RoleRule['name']; score: number } | null {
  const L = lines(r)
  const rollsDone = Math.min(rules.needRollsCap, Math.floor(lvl / 3))
  const need = rules.needBase + rules.needPerRoll * rollsDone - needDrop
  for (const role of rules.roles) {
    const allowed = role.mains[r.slot as 2 | 4 | 6]
    if (allowed && !allowed.includes(r.main)) continue
    const wasted = r.subs
      .filter((s) => role.bad.includes(s.stat))
      .reduce((a, s) => a + rollEq(rules, s.stat, s.value + s.grind), 0)
    if (wasted > rules.wastedMaxRolls) continue
    const pool = Object.entries(L).filter(([k]) => role.good.includes(k as never)) as [never, number][]
    const names = new Set<string>([...pool.map(([k]) => k), r.main])
    if (!role.must.some((m) => names.has(m))) continue
    const mins = (r.slot % 2 ? rules.minLinesOdd : rules.minLinesEven) - minLinesDrop
    if (pool.length < mins) continue
    if (lvl >= rules.anchorFromLevel && !pool.some(([k, v]) => v >= (rules.high[k] ?? 999))) continue
    const qs = pool.filter(([k]) => !isFlat(k)).reduce((a, [k, v]) => a + rollEq(rules, k, v), 0)
    if (qs < need) continue
    return { role: role.name, score: Math.min(100, Math.round((qs / (need + rules.scoreSpan)) * 75)) }
  }
  return null
}

/** First matching build role in priority order, with a 0-100 fit score. */
export function fit(rules: RulesConfig, r: RuneShape, lvl: number): FitResult {
  const strict = fitStrict(rules, r, lvl, 0, 0)
  if (strict) return { role: strict.role, score: strict.score, relaxed: false }
  if (rules.relaxedRetry) {
    const soft = fitStrict(rules, r, lvl, 1, rules.relaxedNeedDrop)
    if (soft) return { role: soft.role, score: soft.score, relaxed: true }
  }
  return { role: null, score: 0, relaxed: false }
}

/** God or Duo line, as a plain-English description. */
export function godDuo(rules: RulesConfig, r: RuneShape): string | null {
  const L = lines(r)
  for (const [k, v] of Object.entries(L)) {
    if (v >= (rules.god[k as never] ?? 999)) return `God roll ${k} ${v}`
  }
  for (const [a, b, x, y] of rules.duos) {
    if ((L[a] ?? 0) >= x && (L[b] ?? 0) >= y) return `Duo ${a} ${L[a]}+${b} ${L[b]}`
  }
  return null
}

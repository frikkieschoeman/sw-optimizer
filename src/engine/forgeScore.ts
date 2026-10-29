import { isFlat } from './constants'
import type { RulesConfig } from './rules/types'
import type { Rune, Stat } from './types'

/*
 * Forge Score per reference/sw-forge-guide.md section 6:
 *   raw   = (mainPts + subPts + innatePts) x mainSubSyn x subSubSyn x dupSub x archetypeMul
 *   Score = round(min(100, raw / 295 * 100))
 *
 * The guide gives the tiers, synergies and multipliers but not the scale of
 * subPts / innatePts, so those are calibrated here (see SUB_WEIGHT): a maxed,
 * clean rune lands near 100. Compare against SW Forge and tune if needed.
 */

const MAIN_TIER: Partial<Record<Stat, number>> = {
  SPD: 100, CDmg: 93, 'ATK%': 91, CRate: 89, ACC: 80, 'HP%': 76, 'DEF%': 73, RES: 71,
}
const FLAT_ODD_MAIN = 72
const FLAT_EVEN_MAIN = 30 // not in the guide; flat main on slots 2/4/6 is junk
const SUB_TIER: Record<Stat, number> = {
  SPD: 100, CRate: 95, CDmg: 93, 'ATK%': 90, ACC: 84, 'HP%': 78, 'DEF%': 74,
  RES: 72, ATK: 62, DEF: 60, HP: 58,
}
const SUB_WEIGHT = 0.5
const INNATE_MUL = 0.38
const EVEN_FLAT_SUB_MUL = 0.88
const QUALITY_CAP = 1.12
const DIVISOR = 295

const key = (a: Stat, b: Stat) => [a, b].sort().join('|')
const table = (rows: [Stat, Stat, number][]) =>
  new Map(rows.map(([a, b, v]) => [key(a, b), v]))

const MAIN_SUB = table([
  ['ATK%', 'CDmg', 1.13], ['CDmg', 'CRate', 1.12], ['HP%', 'DEF%', 1.11],
  ['SPD', 'ACC', 1.1], ['ATK%', 'CRate', 1.1], ['HP%', 'HP', 1.1], ['ATK%', 'ATK', 1.1],
  ['DEF%', 'DEF', 1.1], ['HP%', 'RES', 1.1], ['DEF%', 'RES', 1.09], ['HP%', 'SPD', 1.04],
  ['CDmg', 'RES', 0.94], ['ATK%', 'DEF%', 0.91], ['ATK%', 'RES', 0.9],
])
const SUB_SUB = table([
  ['CRate', 'CDmg', 1.12], ['ATK%', 'CDmg', 1.1], ['SPD', 'ACC', 1.09], ['ATK%', 'SPD', 1.09],
  ['ATK%', 'CRate', 1.08], ['HP%', 'DEF%', 1.08], ['SPD', 'CDmg', 1.07], ['HP%', 'RES', 1.07],
  ['DEF%', 'RES', 1.06], ['CDmg', 'RES', 0.94], ['ATK%', 'RES', 0.93],
])

const ARCHETYPES: Stat[][] = [
  ['ATK', 'CRate', 'CDmg'], ['HP', 'DEF', 'SPD'], ['SPD', 'ACC', 'HP'], ['HP', 'CRate', 'CDmg'],
]
const baseType = (s: Stat): string => (s.endsWith('%') ? s.slice(0, -1) : s)

export function forgeScore(r: Rune, rules: RulesConfig): number {
  const even = r.slot % 2 === 0
  const main = r.main.stat
  const mainPts = isFlat(main) ? (even ? FLAT_EVEN_MAIN : FLAT_ODD_MAIN) : (MAIN_TIER[main] ?? 70)

  const quality = (s: Stat, v: number) => Math.min(QUALITY_CAP, v / (rules.rollMax[s] * 2))
  let subPts = 0
  for (const s of r.subs) {
    const flatMul = even && isFlat(s.stat) ? EVEN_FLAT_SUB_MUL : 1
    subPts += SUB_TIER[s.stat] * quality(s.stat, s.value + s.grind) * SUB_WEIGHT * flatMul
  }
  const innatePts = r.innate
    ? SUB_TIER[r.innate.stat] * quality(r.innate.stat, r.innate.value) * SUB_WEIGHT * INNATE_MUL
    : 0

  let mainSub = 1
  for (const s of r.subs) {
    mainSub *= MAIN_SUB.get(key(main, s.stat)) ?? (even ? 0.94 : 1)
  }
  let subSub = 1
  for (let i = 0; i < r.subs.length; i++)
    for (let j = i + 1; j < r.subs.length; j++)
      subSub *= SUB_SUB.get(key(r.subs[i].stat, r.subs[j].stat)) ?? 1

  const all: Stat[] = [main, ...(r.innate ? [r.innate.stat] : []), ...r.subs.map((s) => s.stat)]
  const types = all.map(baseType)
  const overlaps = types.length - new Set(types).size
  const dup = 0.88 ** overlaps

  const distinct = new Set(types)
  const golden = ARCHETYPES.some((a) => a.filter((s) => distinct.has(s)).length >= 3) ? 1.04 : 1

  const raw = (mainPts + subPts + innatePts) * mainSub * subSub * dup * golden
  return Math.round(Math.min(100, (raw / DIVISOR) * 100))
}

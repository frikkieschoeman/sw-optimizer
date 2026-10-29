import { isFlat } from './constants'
import type { ForgeWeights, RulesConfig } from './rules/types'
import type { Rune, Stat } from './types'

/*
 * Forge Score per reference/sw-forge-guide.md section 6:
 *   raw   = (mainPts + subPts + innatePts) x mainSubSyn x subSubSyn x dupSub x archetypeMul
 *   Score = round(min(100, raw / 295 * 100))
 *
 * From the guide: tiers, synergies, multipliers, the 1.12 quality cap, the
 * x0.88 even-slot flat sub and the x0.38 innate. Not in the guide, so read
 * as follows and kept tunable in rules.forge:
 *   - "Roll quality = value / max" uses effMax (five max rolls), which is
 *     the only reading where a 1.12 cap means anything: only grinds and
 *     gems push a line past five max rolls.
 *   - subPts = tier x quality x subWeight (subWeight 1 is the literal reading).
 *   - a flat main on slots 2/4/6 (flatEvenMain).
 */

const key = (a: Stat, b: Stat) => [a, b].sort().join('|')
const table = (rows: [Stat, Stat, number][]) =>
  new Map(rows.map(([a, b, v]) => [key(a, b), v]))

// Directional main -> sub pairs, checked before the symmetric table.
const MAIN_SUB_DIRECTED = new Map<string, number>([
  ['ATK%>SPD', 1.11], ['SPD>ATK%', 1.1],
])
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

export function mainSubSynergy(main: Stat, sub: Stat, even: boolean, w: ForgeWeights): number {
  return MAIN_SUB_DIRECTED.get(`${main}>${sub}`) ?? MAIN_SUB.get(key(main, sub)) ?? (even ? w.unlistedEvenSyn : 1)
}

export interface ForgeBreakdown {
  mainPts: number
  subPts: number
  innatePts: number
  mainSub: number
  subSub: number
  dup: number
  golden: number
  raw: number
  score: number
}

export function forgeBreakdown(r: Rune, rules: RulesConfig): ForgeBreakdown {
  const w = rules.forge
  const even = r.slot % 2 === 0
  const main = r.main.stat
  const mainPts = isFlat(main) ? (even ? w.flatEvenMain : w.flatOddMain) : (w.mainTier[main] ?? 70)

  const quality = (s: Stat, v: number) => Math.min(w.qualityCap, v / rules.effMax[s])
  let subPts = 0
  for (const s of r.subs) {
    const flatMul = even && isFlat(s.stat) ? w.evenFlatSubMul : 1
    subPts += w.subTier[s.stat] * quality(s.stat, s.value + s.grind) * w.subWeight * flatMul
  }
  const innatePts = r.innate
    ? w.subTier[r.innate.stat] * quality(r.innate.stat, r.innate.value) * w.subWeight * w.innateMul
    : 0

  let mainSub = 1
  for (const s of r.subs) mainSub *= mainSubSynergy(main, s.stat, even, w)
  let subSub = 1
  for (let i = 0; i < r.subs.length; i++)
    for (let j = i + 1; j < r.subs.length; j++)
      subSub *= SUB_SUB.get(key(r.subs[i].stat, r.subs[j].stat)) ?? 1

  const all: Stat[] = [main, ...(r.innate ? [r.innate.stat] : []), ...r.subs.map((s) => s.stat)]
  const types = all.map(baseType)
  const dup = w.dupPenalty ** (types.length - new Set(types).size)

  const distinct = new Set(types)
  const golden = ARCHETYPES.some((a) => a.filter((s) => distinct.has(s)).length >= 3) ? w.goldenMul : 1

  const raw = (mainPts + subPts + innatePts) * mainSub * subSub * dup * golden
  const score = Math.round(Math.max(0, Math.min(100, (raw / w.divisor) * 100)))
  return { mainPts, subPts, innatePts, mainSub, subSub, dup, golden, raw, score }
}

export const forgeScore = (r: Rune, rules: RulesConfig): number => forgeBreakdown(r, rules).score

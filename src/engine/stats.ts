import { isFlat } from './constants'
import type { RulesConfig } from './rules/types'
import type { Rune, Stat, SubLine } from './types'

/** Minimal shape the role checks need, so grind simulations can tweak a copy. */
export interface RuneShape {
  slot: number
  main: Stat
  innate: { stat: Stat; value: number } | null
  subs: SubLine[]
}

export const shapeOf = (r: Rune): RuneShape => ({
  slot: r.slot, main: r.main.stat, innate: r.innate, subs: r.subs,
})

/** Innate + substat totals (roll + grind) per stat. */
export function lines(r: RuneShape): Partial<Record<Stat, number>> {
  const L: Partial<Record<Stat, number>> = {}
  if (r.innate) L[r.innate.stat] = r.innate.value
  for (const s of r.subs) L[s.stat] = (L[s.stat] ?? 0) + s.value + s.grind
  return L
}

/** Value in units of one maximum roll of that stat. */
export const rollEq = (rules: RulesConfig, stat: Stat, v: number) => v / rules.rollMax[stat]

export function efficiency(r: Rune, rules: RulesConfig): number {
  let s = 1.0
  if (r.innate) s += r.innate.value / rules.effMax[r.innate.stat]
  for (const sub of r.subs) s += (sub.value + sub.grind) / rules.effMax[sub.stat]
  return (s / 2.8) * 100
}

export const spdTotal = (r: Rune) => lines(shapeOf(r)).SPD ?? 0

export const hasFlatSub = (r: Rune) => r.subs.some((s) => isFlat(s.stat))

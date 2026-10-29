import type { Rune, Stat, Unit } from '../types'

/** Stats a monster ends up with; HP%, ATK% and DEF% runes fold into HP, ATK and DEF. */
export const TOTAL_STATS = ['HP', 'ATK', 'DEF', 'SPD', 'CRate', 'CDmg', 'RES', 'ACC'] as const
export type TotalStat = typeof TOTAL_STATS[number]
export type StatBlock = Record<TotalStat, number>

export type BaseStats = Unit['base']

export const emptyBlock = (): StatBlock =>
  ({ HP: 0, ATK: 0, DEF: 0, SPD: 0, CRate: 0, CDmg: 0, RES: 0, ACC: 0 })

export const baseBlock = (b: BaseStats): StatBlock =>
  ({ HP: b.hp, ATK: b.atk, DEF: b.def, SPD: b.spd, CRate: b.crate, CDmg: b.cdmg, RES: b.res, ACC: b.acc })

/** Stats whose rune and set bonuses can be a percent of base. */
const PCT_OF: Partial<Record<Stat, TotalStat>> = { 'HP%': 'HP', 'ATK%': 'ATK', 'DEF%': 'DEF' }

export interface SetBonus {
  pieces: 2 | 4
  /** Stat bonus of one completed set; absent for sets with a battle effect only. */
  stat?: TotalStat
  value?: number
  /** True when `value` is a percent of base (HP, ATK, DEF, SPD). */
  pct?: boolean
}

/** Set sizes and stat bonuses. Fight, Determination, Enhance, Accuracy and Tolerance are ally buffs: only the wearer's own copy is counted. */
export const SET_BONUS: Record<string, SetBonus> = {
  Energy: { pieces: 2, stat: 'HP', value: 15, pct: true },
  Guard: { pieces: 2, stat: 'DEF', value: 15, pct: true },
  Swift: { pieces: 4, stat: 'SPD', value: 25, pct: true },
  Blade: { pieces: 2, stat: 'CRate', value: 12 },
  Rage: { pieces: 4, stat: 'CDmg', value: 40 },
  Focus: { pieces: 2, stat: 'ACC', value: 20 },
  Endure: { pieces: 2, stat: 'RES', value: 20 },
  Fatal: { pieces: 4, stat: 'ATK', value: 35, pct: true },
  Despair: { pieces: 4 },
  Vampire: { pieces: 4 },
  Violent: { pieces: 4 },
  Nemesis: { pieces: 2 },
  Will: { pieces: 2 },
  Shield: { pieces: 2 },
  Revenge: { pieces: 2 },
  Destroy: { pieces: 2 },
  Fight: { pieces: 2, stat: 'ATK', value: 7, pct: true },
  Determination: { pieces: 2, stat: 'DEF', value: 7, pct: true },
  Enhance: { pieces: 2, stat: 'HP', value: 7, pct: true },
  Accuracy: { pieces: 2, stat: 'ACC', value: 10 },
  Tolerance: { pieces: 2, stat: 'RES', value: 10 },
  Seal: { pieces: 2 },
  // Immemorial (set 99): no rune of it in the reference export and its effect is unconfirmed,
  // so it is treated as a 2-piece set without a stat bonus.
  Immemorial: { pieces: 2 },
}

/** Intangible runes count as a piece of any one set; only one Intangible rune counts per build. */
export const INTANGIBLE = 'Intangible'

export const piecesOf = (set: string) => SET_BONUS[set]?.pieces ?? 2

/** A rune's own stats: flat values, and percent-of-base values for HP, ATK and DEF. */
export interface RuneStats {
  flat: StatBlock
  pct: StatBlock
}

export function runeStats(r: Rune): RuneStats {
  const flat = emptyBlock()
  const pct = emptyBlock()
  const add = (stat: Stat, v: number) => {
    const p = PCT_OF[stat]
    if (p) pct[p] += v
    else flat[stat as TotalStat] += v
  }
  add(r.main.stat, r.main.value)
  if (r.innate) add(r.innate.stat, r.innate.value)
  for (const s of r.subs) add(s.stat, s.value + s.grind)
  return { flat, pct }
}

/** Completed sets of a build, e.g. ['Fatal', 'Blade']; `intangibleAs` names the set an Intangible rune joins. */
export function completedSets(runes: Rune[], intangibleAs: string | null = null): string[] {
  const count = new Map<string, number>()
  for (const r of runes) if (r.set !== INTANGIBLE) count.set(r.set, (count.get(r.set) ?? 0) + 1)
  if (intangibleAs && runes.some((r) => r.set === INTANGIBLE)) count.set(intangibleAs, (count.get(intangibleAs) ?? 0) + 1)
  const out: string[] = []
  for (const [set, n] of count) for (let i = 0; i < Math.floor(n / piecesOf(set)); i++) out.push(set)
  return out
}

export interface Build {
  totals: StatBlock
  /** Where each total comes from; parts add up to the total. */
  parts: { base: StatBlock; runes: StatBlock; sets: StatBlock; totem: StatBlock }
  sets: string[]
  intangibleAs: string | null
}

/**
 * Total stats of a monster wearing `runes`. Percent bonuses on HP, ATK and DEF are rounded up and
 * SPD bonuses (Swift, totem) rounded down, so a total can differ from the game's by 1.
 * Artifacts are not counted.
 */
export function computeBuild(base: BaseStats, runes: Rune[], totemSpdPct = 0, intangibleAs: string | null = null): Build {
  const b = baseBlock(base)
  const flat = emptyBlock()
  const pct = emptyBlock()
  for (const r of runes) {
    const s = runeStats(r)
    for (const k of TOTAL_STATS) { flat[k] += s.flat[k]; pct[k] += s.pct[k] }
  }
  const sets = completedSets(runes, intangibleAs)
  const setFlat = emptyBlock()
  const setPct = emptyBlock()
  for (const set of sets) {
    const bonus = SET_BONUS[set]
    if (bonus?.stat && bonus.value) (bonus.pct ? setPct : setFlat)[bonus.stat] += bonus.value
  }
  const ofBase = (k: TotalStat, p: number) => (k === 'SPD' ? Math.floor : Math.ceil)((b[k] * p) / 100 - 1e-9 * Math.sign(p))
  const runesPart = emptyBlock()
  const setsPart = emptyBlock()
  const totem = emptyBlock()
  const totals = emptyBlock()
  for (const k of TOTAL_STATS) {
    runesPart[k] = flat[k] + ofBase(k, pct[k])
    setsPart[k] = setFlat[k] + ofBase(k, setPct[k])
    totals[k] = b[k] + runesPart[k] + setsPart[k]
  }
  totem.SPD = Math.floor((b.SPD * totemSpdPct) / 100)
  totals.SPD += totem.SPD
  return { totals, parts: { base: b, runes: runesPart, sets: setsPart, totem }, sets, intangibleAs }
}

/** Like computeBuild, but an Intangible rune joins whichever set it completes, so equipped builds show their real bonus. */
export function bestBuild(base: BaseStats, runes: Rune[], totemSpdPct = 0): Build {
  const options: (string | null)[] = [null, ...new Set(runes.map((r) => r.set).filter((s) => s !== INTANGIBLE))]
  let best: Build | null = null
  for (const as of options) {
    const b = computeBuild(base, runes, totemSpdPct, as)
    if (!best || b.sets.length > best.sets.length) best = b
  }
  return best!
}

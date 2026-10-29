import type { Role, Slot, Stat } from '../types'

export interface RoleRule {
  name: Exclude<Role, 'Universal (High Value)'>
  /** Substats that count towards the role. */
  good: Stat[]
  /** Substats that waste a roll for this role. */
  bad: Stat[]
  /** At least one of these must be on the rune (substat, innate or main). */
  must: Stat[]
  /** Allowed main stats on even slots. Odd slots are unrestricted. */
  mains: Partial<Record<2 | 4 | 6, Stat[]>>
}

export type StatMap = Partial<Record<Stat, number>>

/** Forge Score weights (reference/sw-forge-guide.md section 6). */
export interface ForgeWeights {
  /** Points for a %/SPD/CRate/CDmg/RES/ACC main stat. */
  mainTier: StatMap
  /** Flat HP/ATK/DEF main on slots 1/3/5. */
  flatOddMain: number
  /** Flat HP/ATK/DEF main on slots 2/4/6 (not in the guide). */
  flatEvenMain: number
  /** Points for a sub at quality 1 (five max rolls), before subWeight. */
  subTier: Record<Stat, number>
  /** Scales every sub and the innate (not in the guide; 1 = literal reading). */
  subWeight: number
  /** Roll quality = (roll + grind) / effMax, capped here. */
  qualityCap: number
  innateMul: number
  /** Flat subs on slots 2/4/6. */
  evenFlatSubMul: number
  /** Main/sub pair not in the synergy table, slots 2/4/6. */
  unlistedEvenSyn: number
  /** Per overlap of the same base stat across main, innate and subs. */
  dupPenalty: number
  /** Golden triplet: three stats from one archetype. */
  goldenMul: number
  /** raw / divisor x 100 = Score. */
  divisor: number
}

export interface RulesConfig {
  /** Maximum value of a single 6* roll, per stat. */
  rollMax: Record<Stat, number>
  /** Maximum value used by the efficiency formula, per stat. */
  effMax: Record<Stat, number>
  /** "High-roll anchor": a good sub at or above this passes the +12 check. */
  high: StatMap
  /** God roll: a single line this high is worth keeping on its own. */
  god: StatMap
  /** Duo roll: [statA, statB, minA, minB]. */
  duos: [Stat, Stat, number, number][]
  roles: RoleRule[]

  /** Rolls of forbidden stats tolerated, in roll-equivalents. */
  wastedMaxRolls: number
  minLinesOdd: number
  minLinesEven: number
  /** Stat-strength bar: needBase + needPerRoll * rollsLanded. */
  needBase: number
  needPerRoll: number
  needRollsCap: number
  /** Fit score = qs / (need + scoreSpan) * 75. */
  scoreSpan: number
  /** Level from which the high-roll anchor is required. */
  anchorFromLevel: number
  /** Strictness 1-3: retry a failed role check once with softer limits. */
  relaxedRetry: boolean
  relaxedNeedDrop: number

  /** Below this level the verdict is Upgrade. */
  upgradeBelow: number
  /** Below this level (and at/above upgradeBelow) the verdict is Finish. */
  finishBelow: number
  /** Hero/Rare without an SPD line is sold instead of levelled. */
  sellLowGradeWithoutSpd: boolean

  /** Efficiency (%) at +12 or higher that makes a rune Universal. */
  universalEff: number
  universalFromLevel: number

  grind: {
    stats: Stat[]
    spdAdd: number
    pctAdd: number
    /** Level used when asking "would one grind give this rune a role?". */
    evalLevel: number
  }

  reapp: {
    sets: string[]
    /** Allowed innate stats; use 'none' for runes without an innate. */
    innates: (Stat | 'none')[]
    mains: Stat[]
    effCap: number
    /** Odd slots are always allowed when true (main stat is fixed there). */
    allowOddSlots: boolean
    legendOnly: boolean
  }

  forge: ForgeWeights

  /** Gem check ignores flat subs on runes that already have a gemmed sub. */
  gem: { enabled: boolean }
}

export type SlotNo = Slot

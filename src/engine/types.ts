export type Stat =
  | 'HP' | 'HP%' | 'ATK' | 'ATK%' | 'DEF' | 'DEF%'
  | 'SPD' | 'CRate' | 'CDmg' | 'RES' | 'ACC'

export type Slot = 1 | 2 | 3 | 4 | 5 | 6
export type Grade = 'Rare' | 'Hero' | 'Legend'
export type Stage = 'Early' | 'Mid' | 'Late'
export type Strictness = 1 | 2 | 3 | 4 | 5

export type Verdict =
  | 'Upgrade' | 'Finish' | 'Keep' | 'Gem' | 'Grind' | 'Reapp' | 'Sell' | 'Replace'

export type Role =
  | 'Fast CC' | 'Classic DPS' | 'Bomber' | 'Tank' | 'Bruiser' | 'Slow DPS'
  | 'Universal (High Value)'

export interface SubLine {
  stat: Stat
  value: number
  grind: number
  gemmed: boolean
}

export type RuneLocation =
  | { kind: 'inventory' }
  | { kind: 'equipped'; unitId: number; masterId: number }

export interface Rune {
  id: number
  setId: number
  set: string
  slot: Slot
  stars: number
  ancient: boolean
  /** Original grade, from `extra % 10`. */
  grade: Grade
  level: number
  main: { stat: Stat; value: number }
  innate: { stat: Stat; value: number } | null
  subs: SubLine[]
  sellValue: number
  location: RuneLocation
  locked: boolean
}

export interface Unit {
  id: number
  masterId: number
  level: number
  stars: number
  base: {
    hp: number; atk: number; def: number; spd: number
    res: number; acc: number; crate: number; cdmg: number
  }
  runeIds: number[]
}

export interface Account {
  wizardId: number
  exportedAt: number
  runes: Rune[]
  units: Unit[]
  /** Sky Tribe Totem SPD bonus in percent of base SPD (0 when unknown). */
  totemSpdPct: number
}

export interface RuneResult {
  runeId: number
  verdict: Verdict
  /** Verdict before the equipped / locked override. */
  rawVerdict: Verdict
  reason: string
  role: Role | null
  fit: number
  relaxed: boolean
  efficiency: number
  forgeScore: number
  /** Total SPD on the rune (innate + subs + grind). */
  spd: number
  grindTarget?: { stat: Stat; to: number }
  gemTarget?: { stat: Stat }
}

export interface ProgressionBar {
  value: number
  max: number
  count: number
  full: number
}

export interface Progression {
  total: number
  speedDepth: ProgressionBar
  powerDepth: ProgressionBar
  eliteQuality: ProgressionBar & { avgTop50: number }
  rosterDepth: ProgressionBar
  suggestedStage: Stage
}

export interface Analysis {
  results: Map<number, RuneResult>
  progression: Progression
}

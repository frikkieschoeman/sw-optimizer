import {
  INTANGIBLE, SET_BONUS, TOTAL_STATS, computeBuild, completedSets, piecesOf, runeStats,
  type BaseStats, type Build, type StatBlock, type TotalStat,
} from './build'
import type { Rune, Slot, Stat } from '../types'

export interface StatTarget {
  min?: number
  max?: number
  /** Score per point of the final stat; 0 or absent means the stat is not optimised. */
  weight?: number
}

export interface OptimizerInput {
  base: BaseStats
  /** Every rune the search may pick from, already limited to what the user allows. */
  runes: Rune[]
  targets: Partial<Record<TotalStat, StatTarget>>
  /** Sets that must each be completed (an Intangible rune can stand in for one piece). */
  requiredSets?: string[]
  /** If given, only runes of these sets (and Intangible) are used. */
  allowedSets?: string[]
  /** Allowed main stats for slots 2, 4 and 6; missing means any. Slots 1 and 3 are fixed by the game. */
  mainStats?: Partial<Record<2 | 4 | 6, Stat[]>>
  /** Rune id to force into its slot. */
  locked?: number[]
  minLevel?: number
  totemSpdPct?: number
  /** Number of best distinct builds to return. */
  top?: number
  /** Search stops after this many nodes and reports `exhaustive: false`. */
  nodeBudget?: number
  /** Candidates kept per slot after removing dominated runes. */
  maxPerSlot?: number
}

export interface Candidate {
  slots: Rune[]
  build: Build
  score: number
}

export interface OptimizerResult {
  builds: Candidate[]
  nodes: number
  /** False when the node budget ran out or candidates were capped, so a better build may exist. */
  exhaustive: boolean
  candidatesPerSlot: number[]
}

const SLOTS: Slot[] = [1, 2, 3, 4, 5, 6]
const FIXED_MAIN: Partial<Record<Slot, Stat>> = { 1: 'ATK', 3: 'DEF' }

interface Cand {
  rune: Rune
  /** Contribution as fractional totals (percent stats scaled by the base). */
  v: StatBlock
  score: number
}

const weightOf = (input: OptimizerInput, k: TotalStat) => input.targets[k]?.weight ?? 0

export function scoreOf(totals: StatBlock, input: Pick<OptimizerInput, 'targets'>): number {
  let s = 0
  for (const k of TOTAL_STATS) s += (input.targets[k]?.weight ?? 0) * totals[k]
  return s
}

/** The first violated target, or null when the build meets every min and max. */
export function violation(totals: StatBlock, targets: OptimizerInput['targets']): string | null {
  for (const k of TOTAL_STATS) {
    const t = targets[k]
    if (!t) continue
    if (t.min !== undefined && totals[k] < t.min) return `${k} ${totals[k]} < ${t.min}`
    if (t.max !== undefined && totals[k] > t.max) return `${k} ${totals[k]} > ${t.max}`
  }
  return null
}

function candidatesFor(input: OptimizerInput, slot: Slot): Cand[] {
  const base: StatBlock = { HP: input.base.hp, ATK: input.base.atk, DEF: input.base.def, SPD: input.base.spd, CRate: input.base.crate, CDmg: input.base.cdmg, RES: input.base.res, ACC: input.base.acc }
  const allowed = input.allowedSets ? new Set([...input.allowedSets, INTANGIBLE]) : null
  const locked = new Set(input.locked ?? [])
  const lockedHere = input.runes.find((r) => r.slot === slot && locked.has(r.id))
  const pool = lockedHere ? [lockedHere] : input.runes.filter((r) => {
    if (r.slot !== slot) return false
    if (allowed && !allowed.has(r.set)) return false
    if (r.level < (input.minLevel ?? 0)) return false
    const fixed = FIXED_MAIN[slot]
    if (fixed && r.main.stat !== fixed) return false
    const want = input.mainStats?.[slot as 2 | 4 | 6]
    return !want || want.includes(r.main.stat)
  })
  return pool.map((rune) => {
    const { flat, pct } = runeStats(rune)
    const v = { ...flat }
    for (const k of TOTAL_STATS) v[k] += (pct[k] * base[k]) / 100
    let score = 0
    for (const k of TOTAL_STATS) score += weightOf(input, k) * v[k]
    return { rune, v, score }
  })
}

/** Drop runes that another rune of the same set and main stat beats or ties on every stat that matters. */
function dropDominated(cands: Cand[], input: OptimizerInput, keep: Set<number>): Cand[] {
  const exact = TOTAL_STATS.filter((k) => input.targets[k]?.max !== undefined || weightOf(input, k) < 0)
  const matters = TOTAL_STATS.filter((k) => weightOf(input, k) !== 0 || input.targets[k]?.min !== undefined || input.targets[k]?.max !== undefined)
  const dominates = (a: Cand, b: Cand) =>
    a.rune.set === b.rune.set && a.rune.main.stat === b.rune.main.stat &&
    matters.every((k) => (exact.includes(k) ? a.v[k] === b.v[k] : a.v[k] >= b.v[k]))
  const sorted = [...cands].sort((x, y) => y.score - x.score)
  const out: Cand[] = []
  for (const c of sorted) {
    if (keep.has(c.rune.id) || !out.some((o) => dominates(o, c))) out.push(c)
  }
  return out
}

export function optimize(input: OptimizerInput): OptimizerResult {
  const top = input.top ?? 5
  const budget = input.nodeBudget ?? 40_000_000
  const required = [...new Set(input.requiredSets ?? [])]
  const keep = new Set(input.locked ?? [])
  const maxPer = input.maxPerSlot ?? 250
  let capped = false

  const perSlot = SLOTS.map((slot) => {
    let c = dropDominated(candidatesFor(input, slot), input, keep)
    if (c.length > maxPer) { c = c.slice(0, maxPer); capped = true }
    return c
  })
  const candidatesPerSlot = perSlot.map((c) => c.length)
  if (perSlot.some((c) => c.length === 0)) return { builds: [], nodes: 0, exhaustive: true, candidatesPerSlot }

  const K = TOTAL_STATS.length
  const baseTotals: StatBlock = { HP: input.base.hp, ATK: input.base.atk, DEF: input.base.def, SPD: input.base.spd, CRate: input.base.crate, CDmg: input.base.cdmg, RES: input.base.res, ACC: input.base.acc }
  const baseScore = TOTAL_STATS.reduce((a, k) => a + weightOf(input, k) * baseTotals[k], 0)
  // Rounding slack between fractional search values and the game's rounded totals.
  const slack = TOTAL_STATS.reduce((a, k) => a + Math.abs(weightOf(input, k)), 0) * 2
  /** Stat bonus the given completed sets add, as the bound sees it (rounded up). */
  const bonusOf = (sets: string[]): StatBlock => {
    const out: StatBlock = { HP: 0, ATK: 0, DEF: 0, SPD: 0, CRate: 0, CDmg: 0, RES: 0, ACC: 0 }
    for (const set of sets) {
      const b = SET_BONUS[set]
      if (b?.stat && b.value) out[b.stat] += b.pct ? Math.ceil((b.value * baseTotals[b.stat]) / 100) : b.value
    }
    out.SPD += Math.floor((input.base.spd * (input.totemSpdPct ?? 0)) / 100)
    return out
  }

  const toArr = (b: StatBlock) => TOTAL_STATS.map((t) => b[t])
  const wArr = TOTAL_STATS.map((t) => weightOf(input, t))
  const minArr = TOTAL_STATS.map((t) => input.targets[t]?.min)
  const maxArr = TOTAL_STATS.map((t) => input.targets[t]?.max)
  const constrained = TOTAL_STATS.map((_, k) => minArr[k] !== undefined || maxArr[k] !== undefined)
  const vArr = new Map<Cand, number[]>()
  for (const list of perSlot) for (const c of list) vArr.set(c, toArr(c.v))
  const baseArr = toArr(baseTotals)

  let nodes = 0
  let aborted = false
  const best: Candidate[] = []
  const sigs = new Set<string>()
  const worst = () => (best.length < top ? -Infinity : best[best.length - 1].score)
  const hasJoker = perSlot.some((c) => c.some((x) => x.rune.set === INTANGIBLE))
  const bySlot: Cand[] = new Array(6)

  function leaf(plan: string[]) {
    const runes = bySlot.map((c) => c.rune)
    const hasIntangible = runes.some((r) => r.set === INTANGIBLE)
    const options: (string | null)[] = hasIntangible ? [null, ...new Set(runes.map((r) => r.set).filter((s) => s !== INTANGIBLE))] : [null]
    for (const as of options) {
      const sets = completedSets(runes, as)
      if (plan.some((s) => !sets.includes(s))) continue
      const build = computeBuild(input.base, runes, input.totemSpdPct ?? 0, as)
      if (violation(build.totals, input.targets)) continue
      const score = scoreOf(build.totals, input)
      const sig = runes.map((r) => r.id).join(',') + '|' + (as ?? '')
      if (score <= worst() || sigs.has(sig)) continue
      sigs.add(sig)
      best.push({ slots: runes, build, score })
      best.sort((a, b) => b.score - a.score)
      if (best.length > top) best.pop()
    }
  }

  /** Search the builds that complete every set of `plan`; their bonus is known, so the bounds are tight. */
  function search(plan: string[]) {
    const bonus = toArr(bonusOf(plan))
    const bonusScore = bonus.reduce((a, b, k) => a + wArr[k] * b, 0)
    const pieces = plan.reduce((a, s) => a + piecesOf(s), 0)
    // A plan that fills every slot can only use its own sets (and Intangible).
    const only = pieces >= 6 ? new Set([...plan, INTANGIBLE]) : null
    const lists = perSlot.map((l) => (only ? l.filter((c) => only.has(c.rune.set)) : l))
    if (lists.some((l) => l.length === 0)) return
    // Fill the slot with the fewest candidates first.
    const order = [0, 1, 2, 3, 4, 5].sort((a, b) => lists[a].length - lists[b].length)
    const cand = order.map((o) => lists[o])
    const sufScore = new Array<number>(7).fill(0)
    const sufMax = Array.from({ length: 7 }, () => new Array<number>(K).fill(0))
    const sufMin = Array.from({ length: 7 }, () => new Array<number>(K).fill(0))
    for (let i = 5; i >= 0; i--) {
      sufScore[i] = sufScore[i + 1] + Math.max(...cand[i].map((c) => c.score))
      for (let k = 0; k < K; k++) {
        sufMax[i][k] = sufMax[i + 1][k] + Math.max(...cand[i].map((c) => vArr.get(c)![k]))
        sufMin[i][k] = sufMin[i + 1][k] + Math.min(...cand[i].map((c) => vArr.get(c)![k]))
      }
    }
    const acc = [...baseArr]
    const counts = new Map<string, number>()
    const planSet = new Set(plan)
    let filled = 0 // plan pieces still missing, ignoring the Intangible joker
    for (const s of plan) filled += piecesOf(s)
    const deficit = filled
    let missing = deficit
    function dfs(i: number, prefix: number) {
      if (aborted) return
      if (++nodes > budget) { aborted = true; return }
      if (i === 6) { leaf(plan); return }
      const list = cand[i]
      const slotIdx = order[i]
      for (let n = 0; n < list.length; n++) {
        const c = list[n]
        const set = c.rune.set
        const inPlan = planSet.has(set) && (counts.get(set) ?? 0) < piecesOf(set)
        const np = prefix + c.score
        if (np + sufScore[i + 1] + bonusScore + slack <= worst()) {
          break // candidates are sorted by score, so the rest are no better
        }
        const v = vArr.get(c)!
        const nextMissing = missing - (inPlan ? 1 : 0)
        const joker = hasJoker || set === INTANGIBLE || (counts.get(INTANGIBLE) ?? 0) > 0 ? 1 : 0
        if (nextMissing - joker > 5 - i) continue
        let ok = true
        for (let k = 0; k < K; k++) {
          acc[k] += v[k]
        }
        for (let k = 0; k < K && ok; k++) {
          if (!constrained[k]) continue
          const lo = minArr[k]
          const hi = maxArr[k]
          if (lo !== undefined && acc[k] + sufMax[i + 1][k] + bonus[k] + 1 < lo) ok = false
          else if (hi !== undefined && acc[k] + sufMin[i + 1][k] - 1 > hi) ok = false
        }
        if (ok) {
          counts.set(set, (counts.get(set) ?? 0) + 1)
          bySlot[slotIdx] = c
          const before = missing
          missing = nextMissing
          dfs(i + 1, np)
          missing = before
          counts.set(set, counts.get(set)! - 1)
        }
        for (let k = 0; k < K; k++) acc[k] -= v[k]
        if (aborted) return
      }
    }
    dfs(0, baseScore)
  }

  // Plans: every group of up to three distinct sets that fits in six slots (one slot more with an Intangible rune).
  const present = [...new Set(perSlot.flat().map((c) => c.rune.set))].filter((s) => s !== INTANGIBLE)
  const room = 6 + (hasJoker ? 1 : 0)
  const plans: string[][] = [[]]
  for (let a = 0; a < present.length; a++) {
    plans.push([present[a]])
    for (let b = a + 1; b < present.length; b++) {
      if (piecesOf(present[a]) + piecesOf(present[b]) > room) continue
      plans.push([present[a], present[b]])
      for (let c = b + 1; c < present.length; c++) {
        if (piecesOf(present[a]) + piecesOf(present[b]) + piecesOf(present[c]) <= room) plans.push([present[a], present[b], present[c]])
      }
    }
  }
  const wanted = plans.filter((pl) => required.every((s) => pl.includes(s)))
  // Try the plans with the largest bonus first so good builds raise the bar early.
  const planScore = (pl: string[]) => { const b = bonusOf(pl); return TOTAL_STATS.reduce((a, k) => a + weightOf(input, k) * b[k], 0) }
  wanted.sort((x, y) => planScore(y) - planScore(x))
  for (const plan of wanted) { search(plan); if (aborted) break }

  return { builds: best, nodes, exhaustive: !aborted && !capped, candidatesPerSlot }
}

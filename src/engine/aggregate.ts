import type { Account, RuneResult, Verdict } from './types'

export const VERDICTS: Verdict[] = [
  'Upgrade', 'Finish', 'Keep', 'Gem', 'Grind', 'Reapp', 'Sell', 'Replace',
]

export type VerdictCounts = Record<Verdict, number>

const emptyCounts = (): VerdictCounts =>
  Object.fromEntries(VERDICTS.map((v) => [v, 0])) as VerdictCounts

type Results = Map<number, RuneResult>

/** Verdict totals, split into inventory and equipped runes. */
export function verdictCounts(account: Account, results: Results) {
  const inventory = emptyCounts()
  const equipped = emptyCounts()
  for (const r of account.runes) {
    const v = results.get(r.id)!.verdict
    ;(r.location.kind === 'inventory' ? inventory : equipped)[v]++
  }
  return { inventory, equipped }
}

/** Mana from selling every rune marked Sell. */
export function sellMana(account: Account, results: Results): number {
  let total = 0
  for (const r of account.runes) if (results.get(r.id)!.verdict === 'Sell') total += r.sellValue
  return total
}

export interface Heatmap {
  sets: string[]
  /** Sell count per set name and slot (1-6). */
  cells: Map<string, number>
  max: number
}

export const cellKey = (set: string, slot: number) => `${set}|${slot}`

/** Set x slot grid of Sell counts. Sets are listed in game id order. */
export function sellHeatmap(account: Account, results: Results): Heatmap {
  const cells = new Map<string, number>()
  const setIds = new Map<string, number>()
  let max = 0
  for (const r of account.runes) {
    setIds.set(r.set, r.setId)
    if (results.get(r.id)!.verdict !== 'Sell') continue
    const k = cellKey(r.set, r.slot)
    const n = (cells.get(k) ?? 0) + 1
    cells.set(k, n)
    max = Math.max(max, n)
  }
  const sets = [...setIds].sort((a, b) => a[1] - b[1]).map(([s]) => s)
  return { sets, cells, max }
}

export interface Bin {
  label: string
  /** Inclusive lower and exclusive upper bound; the last bin is open-ended. */
  from: number
  to: number
  counts: VerdictCounts
}

/**
 * Histogram of a rune value, stacked by verdict. Values below the first edge
 * go in the first bin and values above the last edge go in the last bin.
 */
export function histogram(
  account: Account, results: Results, value: (runeIndex: number) => number, edges: number[],
): Bin[] {
  const bins: Bin[] = edges.map((from, i) => ({
    from,
    to: i + 1 < edges.length ? edges[i + 1] : Infinity,
    label: i + 1 < edges.length ? `${from}` : `${from}+`,
    counts: emptyCounts(),
  }))
  account.runes.forEach((r, i) => {
    const x = value(i)
    let idx = bins.findIndex((b) => x >= b.from && x < b.to)
    if (idx < 0) idx = x < bins[0].from ? 0 : bins.length - 1
    bins[idx].counts[results.get(r.id)!.verdict]++
  })
  return bins
}

export const efficiencyHistogram = (account: Account, results: Results) =>
  histogram(account, results, (i) => results.get(account.runes[i].id)!.efficiency,
    Array.from({ length: 17 }, (_, i) => 30 + i * 5))

/** Total SPD on substats (roll + grind), not counting the innate. */
export const spdSub = (r: Account['runes'][number]) =>
  r.subs.reduce((a, s) => a + (s.stat === 'SPD' ? s.value + s.grind : 0), 0)

export const spdSubHistogram = (account: Account, results: Results) =>
  histogram(account, results, (i) => spdSub(account.runes[i]),
    Array.from({ length: 16 }, (_, i) => i * 2))

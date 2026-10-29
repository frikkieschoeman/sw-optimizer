import type { Account, Rune, RuneResult, Stat } from './types'

export type PassId = 'sell' | 'power' | 'grind' | 'gem'

export const PASSES: { id: PassId; title: string; blurb: string }[] = [
  { id: 'sell', title: 'Sell', blurb: 'Inventory runes marked Sell, in the same order as the in-game rune filter.' },
  { id: 'power', title: 'Power up next', blurb: 'Runes to take to +12 first. HIGH priority (Legend with SPD) comes first.' },
  { id: 'grind', title: 'Grindstone targets', blurb: 'Runes where one grind unlocks a build. Grind the stat shown.' },
  { id: 'gem', title: 'Gem targets', blurb: 'Good runes with a flat sub worth replacing with a gem.' },
]

export interface CleanupRune {
  rune: Rune
  res: RuneResult
  /** What to do with this rune in this pass, in plain English. */
  action: string
  high: boolean
}

export interface CleanupGroup {
  /** Stable key: pass|set|slot|main. Progress is tracked per rune, not per key. */
  key: string
  set: string
  slot: number
  main: Stat
  runes: CleanupRune[]
  mana: number
}

const STAT_ORDER: Stat[] = ['HP', 'HP%', 'ATK', 'ATK%', 'DEF', 'DEF%', 'SPD', 'CRate', 'CDmg', 'RES', 'ACC']

const hasSpd = (r: Rune) => r.main.stat === 'SPD' || r.innate?.stat === 'SPD' || r.subs.some((s) => s.stat === 'SPD')

/** HIGH priority power-up: a Legend rune with SPD anywhere on it. */
export const isHighPriority = (r: Rune) => r.grade === 'Legend' && hasSpd(r)

function actionFor(pass: PassId, r: Rune, res: RuneResult): string {
  switch (pass) {
    case 'sell': return res.reason
    case 'power': return isHighPriority(r) ? 'HIGH: take to +12' : `Take to +12 (now +${r.level})`
    case 'grind': return res.grindTarget ? `Grind ${res.grindTarget.stat} (+${res.grindTarget.to})` : res.reason
    case 'gem': return res.gemTarget ? `Replace the flat ${res.gemTarget.stat} sub with a gem` : res.reason
  }
}

const passVerdict = { sell: 'Sell', power: 'Upgrade', grind: 'Grind', gem: 'Gem' } as const

/**
 * Inventory runes for one pass, grouped set -> slot -> main stat (the order the
 * in-game filter walks). Equipped runes are never listed: they are handled from
 * the Monsters view.
 */
export function cleanupGroups(account: Account, results: Map<number, RuneResult>, pass: PassId): CleanupGroup[] {
  const groups = new Map<string, CleanupGroup & { setId: number }>()
  for (const rune of account.runes) {
    if (rune.location.kind !== 'inventory') continue
    const res = results.get(rune.id)!
    if (res.verdict !== passVerdict[pass]) continue
    const key = `${pass}|${rune.set}|${rune.slot}|${rune.main.stat}`
    let g = groups.get(key)
    if (!g) {
      g = { key, set: rune.set, setId: rune.setId, slot: rune.slot, main: rune.main.stat, runes: [], mana: 0 }
      groups.set(key, g)
    }
    g.runes.push({ rune, res, action: actionFor(pass, rune, res), high: pass === 'power' && isHighPriority(rune) })
    g.mana += rune.sellValue
  }
  const list = [...groups.values()]
  for (const g of list) {
    g.runes.sort((a, b) =>
      Number(b.high) - Number(a.high) || b.rune.level - a.rune.level || b.res.efficiency - a.res.efficiency)
  }
  const inGameOrder = (a: (typeof list)[number], b: (typeof list)[number]) =>
    a.setId - b.setId || a.slot - b.slot || STAT_ORDER.indexOf(a.main) - STAT_ORDER.indexOf(b.main)
  if (pass !== 'power') return list.sort(inGameOrder).map(stripSetId)
  // Power-up: groups holding HIGH priority runes come first, then the game's order.
  return list
    .sort((a, b) => Number(b.runes.some((x) => x.high)) - Number(a.runes.some((x) => x.high)) || inGameOrder(a, b))
    .map(stripSetId)
}

function stripSetId({ setId: _s, ...g }: CleanupGroup & { setId: number }): CleanupGroup {
  return g
}

/** Progress of a list of groups, given the set of checked rune ids. */
export function progressOf(groups: CleanupGroup[], done: ReadonlySet<number>) {
  let total = 0
  let checked = 0
  for (const g of groups) {
    for (const x of g.runes) {
      total++
      if (done.has(x.rune.id)) checked++
    }
  }
  return { total, checked }
}

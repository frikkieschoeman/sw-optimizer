import { VERDICTS, verdictCounts, sellMana } from './aggregate'
import type { Account, Analysis } from './types'

export interface Snapshot {
  account: Account
  analysis: Analysis
}

export interface DeltaRow {
  label: string
  before: number
  after: number
  delta: number
  /** True when a rising number is good news (rune counts are neutral). */
  higherIsBetter: boolean | null
}

export interface Comparison {
  rows: DeltaRow[]
  verdicts: DeltaRow[]
  progression: DeltaRow[]
  /** Runes present before but not after (sold, or fed to other runes), and the reverse. */
  removed: number
  added: number
  sellValueRemoved: number
}

const row = (label: string, before: number, after: number, higherIsBetter: boolean | null): DeltaRow =>
  ({ label, before, after, delta: after - before, higherIsBetter })

const inInventory = (a: Account) => a.runes.filter((r) => r.location.kind === 'inventory').length

/** Deltas between two exports analysed with the same rules. */
export function compareSnapshots(before: Snapshot, after: Snapshot): Comparison {
  const vb = verdictCounts(before.account, before.analysis.results)
  const va = verdictCounts(after.account, after.analysis.results)
  const pb = before.analysis.progression
  const pa = after.analysis.progression

  const afterIds = new Set(after.account.runes.map((r) => r.id))
  const beforeIds = new Set(before.account.runes.map((r) => r.id))
  const gone = before.account.runes.filter((r) => !afterIds.has(r.id))

  return {
    rows: [
      row('Runes total', before.account.runes.length, after.account.runes.length, null),
      row('Runes in inventory', inInventory(before.account), inInventory(after.account), null),
      row('Sell mana waiting', sellMana(before.account, before.analysis.results), sellMana(after.account, after.analysis.results), false),
    ],
    verdicts: VERDICTS.flatMap((v) => [
      row(`${v} (inventory)`, vb.inventory[v], va.inventory[v], v === 'Sell' || v === 'Upgrade' ? false : null),
      row(`${v} (equipped)`, vb.equipped[v], va.equipped[v], v === 'Replace' || v === 'Sell' ? false : null),
    ]).filter((r) => r.before || r.after),
    progression: [
      row('Progression score', pb.total, pa.total, true),
      row('Speed depth (points)', pb.speedDepth.value, pa.speedDepth.value, true),
      row('Speed depth (runes)', pb.speedDepth.count, pa.speedDepth.count, true),
      row('Power depth (points)', pb.powerDepth.value, pa.powerDepth.value, true),
      row('Elite quality (points)', pb.eliteQuality.value, pa.eliteQuality.value, true),
      row('Roster depth (points)', pb.rosterDepth.value, pa.rosterDepth.value, true),
    ],
    removed: gone.length,
    added: after.account.runes.filter((r) => !beforeIds.has(r.id)).length,
    sellValueRemoved: gone.reduce((a, r) => a + r.sellValue, 0),
  }
}

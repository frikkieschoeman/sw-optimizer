import type { Account, Rune, RuneResult, Unit, Verdict } from './types'

export interface SlotRune {
  rune: Rune
  res: RuneResult
}

export interface Suggestion {
  slot: number
  current: SlotRune
  /** Same set and slot, better efficiency, Keep/Gem/Finish only, best first. */
  better: SlotRune[]
}

export interface UnitSummary {
  unit: Unit
  /** Equipped runes by slot (index 0 = slot 1); null for an empty slot. */
  slots: (SlotRune | null)[]
  avgEfficiency: number
  spd: { base: number; runes: number; swift: number; totem: number; total: number }
  replaceSlots: number[]
  suggestions: Suggestion[]
}

const SWIFT_BONUS_PCT = 25
const SWIFT_PIECES = 4

const runeSpd = (r: Rune) =>
  (r.main.stat === 'SPD' ? r.main.value : 0) +
  (r.innate?.stat === 'SPD' ? r.innate.value : 0) +
  r.subs.reduce((a, s) => a + (s.stat === 'SPD' ? s.value + s.grind : 0), 0)

/**
 * Total SPD = base + rune SPD + Swift set bonus (25% of base per full 4-piece set)
 * + Sky Tribe Totem (percent of base). Percent bonuses are floored like the game.
 */
export function totalSpd(base: number, runes: Rune[], totemPct: number) {
  const fromRunes = runes.reduce((a, r) => a + runeSpd(r), 0)
  const swiftSets = Math.floor(runes.filter((r) => r.set === 'Swift').length / SWIFT_PIECES)
  const swift = Math.floor((base * SWIFT_BONUS_PCT * swiftSets) / 100)
  const totem = Math.floor((base * totemPct) / 100)
  return { base, runes: fromRunes, swift, totem, total: base + fromRunes + swift + totem }
}

/** Only runes the verdict engine would keep are worth suggesting. */
const USABLE = new Set<Verdict>(['Keep', 'Gem', 'Finish'])

/** Suggest better inventory runes for each Replace rune on a unit. */
function suggest(slotRune: SlotRune, inventory: SlotRune[]): SlotRune[] {
  const { rune, res } = slotRune
  const sameMain = (c: SlotRune) => c.rune.main.stat === rune.main.stat
  return inventory
    .filter((c) => USABLE.has(c.res.verdict) && c.rune.set === rune.set && c.rune.slot === rune.slot && c.res.efficiency > res.efficiency)
    .sort((a, b) =>
      Number(sameMain(b)) - Number(sameMain(a)) || b.res.efficiency - a.res.efficiency)
    .slice(0, 3)
}

export function unitSummaries(
  account: Account, results: Map<number, RuneResult>, totemPct: number,
): UnitSummary[] {
  const byId = new Map(account.runes.map((r) => [r.id, r]))
  const inventory: SlotRune[] = account.runes
    .filter((r) => r.location.kind === 'inventory')
    .map((rune) => ({ rune, res: results.get(rune.id)! }))

  return account.units.map((unit) => {
    const slots: (SlotRune | null)[] = [null, null, null, null, null, null]
    const equipped: Rune[] = []
    for (const id of unit.runeIds) {
      const rune = byId.get(id)!
      slots[rune.slot - 1] = { rune, res: results.get(id)! }
      equipped.push(rune)
    }
    const present = slots.filter((s): s is SlotRune => !!s)
    const avgEfficiency = present.length
      ? present.reduce((a, s) => a + s.res.efficiency, 0) / present.length
      : 0
    const replace = present.filter((s) => s.res.verdict === 'Replace')
    return {
      unit,
      slots,
      avgEfficiency,
      spd: totalSpd(unit.base.spd, equipped, totemPct),
      replaceSlots: replace.map((s) => s.rune.slot),
      suggestions: replace
        .map((current) => ({ slot: current.rune.slot, current, better: suggest(current, inventory) }))
        .filter((s) => s.better.length > 0),
    }
  })
}

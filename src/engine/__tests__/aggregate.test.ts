import { describe, expect, it } from 'vitest'
import { analyze, buildRules } from '..'
import { cellKey, efficiencyHistogram, sellHeatmap, sellMana, spdSub, verdictCounts } from '../aggregate'
import type { Account } from '../types'
import { rune, sub } from './helpers'

const junk = { level: 15, grade: 'Hero' as const, set: 'Rage', setId: 5, sellValue: 1000,
  subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] }

const account = (runes: Account['runes']): Account =>
  ({ wizardId: 1, exportedAt: 0, runes, units: [], totemSpdPct: 0 })

describe('aggregates', () => {
  const runes = [
    rune({ ...junk, slot: 2 }),
    rune({ ...junk, slot: 2 }),
    rune({ ...junk, slot: 4, main: { stat: 'HP%', value: 63 } }),
    rune({ ...junk, location: { kind: 'equipped', unitId: 1, masterId: 1 } }),
    rune({ ...junk, locked: true }),
  ]
  const acc = account(runes)
  const { results } = analyze(acc, buildRules('Mid', 4))

  it('splits verdicts into inventory and equipped; locked and equipped are not Sell', () => {
    const c = verdictCounts(acc, results)
    expect(c.inventory.Sell).toBe(3)
    expect(c.inventory.Keep).toBe(1)
    expect(c.equipped.Replace).toBe(1)
    expect(c.equipped.Sell).toBe(0)
  })

  it('sums the sell value of Sell runes only', () => {
    expect(sellMana(acc, results)).toBe(3000)
  })

  it('counts Sell runes per set and slot', () => {
    const h = sellHeatmap(acc, results)
    expect(h.cells.get(cellKey('Rage', 2))).toBe(2)
    expect(h.cells.get(cellKey('Rage', 4))).toBe(1)
    expect(h.max).toBe(2)
  })

  it('puts every rune in exactly one histogram bin', () => {
    const total = efficiencyHistogram(acc, results)
      .reduce((a, b) => a + Object.values(b.counts).reduce((x, y) => x + y, 0), 0)
    expect(total).toBe(runes.length)
  })

  it('spdSub adds roll and grind of SPD subs only', () => {
    expect(spdSub(rune({ innate: { stat: 'SPD', value: 5 }, subs: [sub('SPD', 8, 4), sub('HP%', 8)] }))).toBe(12)
  })
})

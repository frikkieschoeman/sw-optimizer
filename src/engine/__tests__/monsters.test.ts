import { describe, expect, it } from 'vitest'
import { analyze, buildRules } from '..'
import { totalSpd, unitSummaries } from '../monsters'
import type { Account, Rune, Unit } from '../types'
import { rune, sub } from './helpers'

const unit = (runeIds: number[]): Unit => ({
  id: 1, masterId: 1, level: 40, stars: 6, runeIds,
  base: { hp: 10000, atk: 700, def: 600, spd: 100, res: 15, acc: 0, crate: 15, cdmg: 50 },
})

describe('totalSpd', () => {
  it('adds rune SPD, the Swift set bonus and the totem, flooring percentages', () => {
    const swift = (n: number): Rune[] => Array.from({ length: n }, () =>
      rune({ set: 'Swift', setId: 3, main: { stat: 'HP%', value: 1 }, innate: { stat: 'SPD', value: 5 }, subs: [sub('SPD', 6, 4)] }))
    expect(totalSpd(101, [], 0).total).toBe(101)
    const t = totalSpd(101, swift(4), 10)
    expect(t.runes).toBe(4 * (5 + 10))
    expect(t.swift).toBe(25)      // floor(101 * 25%)
    expect(t.totem).toBe(10)      // floor(101 * 10%)
    expect(t.total).toBe(101 + 60 + 25 + 10)
    expect(totalSpd(101, swift(3), 0).swift).toBe(0)
  })

  it('counts a SPD main stat', () => {
    expect(totalSpd(100, [rune({ main: { stat: 'SPD', value: 42 }, subs: [] })], 0).runes).toBe(42)
  })
})

describe('unitSummaries', () => {
  const junk = { level: 15, grade: 'Hero' as const, set: 'Rage', setId: 5, slot: 4 as const,
    main: { stat: 'HP%' as const, value: 63 },
    subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] }
  const weak = rune({ ...junk, location: { kind: 'equipped', unitId: 1, masterId: 1 } })
  const strong = rune({
    ...junk, grade: 'Legend',
    subs: [sub('SPD', 18), sub('HP%', 16), sub('ACC', 8), sub('DEF%', 8)],
  })
  const otherSlot = rune({ ...junk, slot: 2, main: { stat: 'SPD', value: 42 }, subs: [sub('SPD', 18), sub('HP%', 16)] })
  const account: Account = { wizardId: 1, exportedAt: 0, runes: [weak, strong, otherSlot], units: [unit([weak.id])], totemSpdPct: 0 }
  const { results } = analyze(account, buildRules('Mid', 4))
  const [s] = unitSummaries(account, results, 0)

  it('flags Replace slots and averages efficiency', () => {
    expect(s.replaceSlots).toEqual([4])
    expect(s.avgEfficiency).toBeCloseTo(results.get(weak.id)!.efficiency)
    expect(s.slots[3]?.rune.id).toBe(weak.id)
    expect(s.slots[0]).toBeNull()
  })

  it('suggests better inventory runes of the same set and slot only', () => {
    expect(s.suggestions).toHaveLength(1)
    expect(s.suggestions[0].better.map((b) => b.rune.id)).toEqual([strong.id])
  })
})

import { describe, expect, it } from 'vitest'
import { analyze, buildRules } from '..'
import { cleanupGroups, isHighPriority, progressOf } from '../cleanup'
import type { Account } from '../types'
import { rune, sub } from './helpers'

const junk = { level: 15, grade: 'Hero' as const, sellValue: 100,
  subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] }

const runes = [
  rune({ ...junk, set: 'Rage', setId: 5, slot: 4, main: { stat: 'HP%', value: 63 } }),
  rune({ ...junk, set: 'Energy', setId: 1, slot: 4, main: { stat: 'HP%', value: 63 } }),
  rune({ ...junk, set: 'Rage', setId: 5, slot: 2, main: { stat: 'SPD', value: 42 } }),
  rune({ ...junk, set: 'Rage', setId: 5, slot: 4, main: { stat: 'HP%', value: 63 }, location: { kind: 'equipped', unitId: 1, masterId: 1 } }),
  rune({ ...junk, set: 'Rage', setId: 5, slot: 4, main: { stat: 'HP%', value: 63 }, locked: true }),
  // power-up candidates
  rune({ level: 3, grade: 'Hero', main: { stat: 'HP%', value: 30 }, subs: [sub('SPD', 5)], set: 'Violent', setId: 13 }),
  rune({ level: 3, grade: 'Legend', main: { stat: 'ATK%', value: 30 }, subs: [sub('SPD', 5)], set: 'Violent', setId: 13, slot: 4 }),
]
const account: Account = { wizardId: 1, exportedAt: 0, runes, units: [], totemSpdPct: 0 }
const { results } = analyze(account, buildRules('Mid', 4))

describe('cleanup groups', () => {
  const groups = cleanupGroups(account, results, 'sell')

  it('lists only inventory Sell runes; equipped and locked runes are excluded', () => {
    const ids = groups.flatMap((g) => g.runes.map((x) => x.rune.id))
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain(runes[3].id)
    expect(ids).not.toContain(runes[4].id)
  })

  it('orders by set, then slot, then main stat like the in-game filter', () => {
    expect(groups.map((g) => g.key)).toEqual([
      'sell|Energy|4|HP%', 'sell|Rage|2|SPD', 'sell|Rage|4|HP%',
    ])
  })

  it('sums mana per group', () => {
    expect(groups.every((g) => g.mana === g.runes.length * 100)).toBe(true)
  })
})

describe('power-up pass', () => {
  it('puts HIGH priority (Legend with SPD) first', () => {
    const power = cleanupGroups(account, results, 'power')
    expect(isHighPriority(runes[6])).toBe(true)
    expect(power[0].runes[0].rune.id).toBe(runes[6].id)
    expect(power[0].runes[0].high).toBe(true)
  })
})

describe('progress', () => {
  it('counts checked runes', () => {
    const groups = cleanupGroups(account, results, 'sell')
    const first = groups[0].runes[0].rune.id
    expect(progressOf(groups, new Set([first, 999]))).toEqual({ total: 3, checked: 1 })
  })
})

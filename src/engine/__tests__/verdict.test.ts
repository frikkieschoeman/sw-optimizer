import { describe, expect, it } from 'vitest'
import { buildRules, DEFAULT_RULES } from '..'
import { judge } from '../verdict'
import { rune, sub } from './helpers'

const rules = DEFAULT_RULES
const equipped = { kind: 'equipped', unitId: 1, masterId: 1 } as const

describe('verdict levels', () => {
  it('Upgrade: Legend with SPD below +9 is HIGH priority', () => {
    const r = rune({ level: 3, subs: [sub('SPD', 6), sub('HP%', 5)] })
    const res = judge(rules, r)
    expect(res.verdict).toBe('Upgrade')
    expect(res.reason).toContain('HIGH priority')
  })

  it('Sell: 5-star rune', () => {
    expect(judge(rules, rune({ stars: 5, level: 15 })).verdict).toBe('Sell')
  })

  it('Sell: flat main on an even slot', () => {
    const r = rune({ slot: 4, main: { stat: 'ATK', value: 160 }, level: 15 })
    expect(judge(rules, r).reason).toContain('flat main')
  })

  it('Sell: Hero without SPD below +9', () => {
    const r = rune({ grade: 'Hero', level: 6, main: { stat: 'HP%', value: 38 }, subs: [sub('HP%', 5), sub('ACC', 6)] })
    expect(judge(rules, r).verdict).toBe('Sell')
  })

  it('Keep: Fast CC with strong SPD sub at +15', () => {
    const r = rune({
      main: { stat: 'SPD', value: 42 }, level: 15,
      subs: [sub('SPD', 12, 4), sub('HP%', 8), sub('ACC', 8), sub('DEF%', 8)],
    })
    const res = judge(rules, r)
    expect(res.verdict).toBe('Keep')
    expect(res.role).toBe('Fast CC')
  })

  it('Gem: role OK but un-gemmed flat sub', () => {
    const r = rune({
      level: 15, subs: [sub('SPD', 18, 4), sub('HP%', 16), sub('ACC', 8), sub('HP', 300)],
    })
    const res = judge(rules, r)
    expect(res.verdict).toBe('Gem')
    expect(res.gemTarget).toEqual({ stat: 'HP' })
  })

  it('Finish at +9..+11 when a role matches', () => {
    const r = rune({
      level: 9, subs: [sub('SPD', 14), sub('HP%', 8), sub('ACC', 8), sub('DEF%', 5)],
    })
    expect(judge(rules, r).verdict).toBe('Finish')
  })
})

describe('equipped and locked overrides', () => {
  const junk = { level: 15, grade: 'Hero' as const, subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] }

  it('a junk rune in the inventory is Sell', () => {
    expect(judge(rules, rune(junk)).verdict).toBe('Sell')
  })

  it('an equipped junk rune becomes Replace, never Sell', () => {
    const res = judge(rules, rune({ ...junk, location: equipped }))
    expect(res.verdict).toBe('Replace')
    expect(res.rawVerdict).toBe('Sell')
  })

  it('a locked junk rune is never Sell', () => {
    const res = judge(rules, rune({ ...junk, locked: true }))
    expect(res.verdict).toBe('Keep')
    expect(res.reason).toContain('Locked')
  })
})

describe('rule presets', () => {
  it('Mid / Strictness 4 equals the verdict.py defaults', () => {
    const p = buildRules('Mid', 4)
    expect(p.high).toEqual(DEFAULT_RULES.high)
    expect(p.god).toEqual(DEFAULT_RULES.god)
    expect(p.needBase).toBe(DEFAULT_RULES.needBase)
    expect(p.relaxedRetry).toBe(false)
  })

  it('Strictness 5 is harder than 1', () => {
    expect(buildRules('Mid', 5).needBase).toBeGreaterThan(buildRules('Mid', 1).needBase)
    expect(buildRules('Mid', 1).relaxedRetry).toBe(true)
  })
})

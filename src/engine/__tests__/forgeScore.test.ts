import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, type RulesConfig } from '..'
import { forgeBreakdown, forgeScore, mainSubSynergy } from '../forgeScore'
import { rune, sub } from './helpers'

const W = DEFAULT_RULES.forge
const withForge = (over: Partial<RulesConfig['forge']>): RulesConfig =>
  ({ ...DEFAULT_RULES, forge: { ...W, ...over } })

describe('forgeScore', () => {
  it('follows the guide formula step by step', () => {
    // slot 2 SPD main, no innate. Quality = value / effMax.
    const r = rune({ subs: [sub('HP%', 16), sub('ACC', 16), sub('DEF%', 8), sub('RES', 8)] })
    const b = forgeBreakdown(r, DEFAULT_RULES)
    expect(b.mainPts).toBe(100)
    expect(b.subPts).toBeCloseTo(78 * 0.4 + 84 * 0.4 + 74 * 0.2 + 72 * 0.2, 6)
    // SPD+ACC 1.10, HP%+SPD 1.04, DEF% and RES are unlisted on an even slot
    expect(b.mainSub).toBeCloseTo(1.1 * 1.04 * 0.94 ** 2, 6)
    // HP%+DEF% 1.08, HP%+RES 1.07, DEF%+RES 1.06
    expect(b.subSub).toBeCloseTo(1.08 * 1.07 * 1.06, 6)
    expect(b.dup).toBe(1)
    // SPD, ACC and HP (HP% counts as HP) is the Control triplet
    expect(b.golden).toBe(1.04)
    const raw = (b.mainPts + b.subPts) * b.mainSub * b.subSub * 1.04
    expect(b.score).toBe(Math.round((raw / 295) * 100))
  })

  it('caps roll quality at 1.12 and the score at 100', () => {
    const r = rune({ slot: 1, main: { stat: 'ATK', value: 160 }, subs: [sub('HP%', 40, 10)] })
    expect(forgeBreakdown(r, DEFAULT_RULES).subPts).toBeCloseTo(78 * 1.12, 6)
    const god = rune({ subs: [sub('CRate', 30), sub('CDmg', 35), sub('ATK%', 40, 10), sub('ACC', 40)] })
    expect(forgeScore(god, DEFAULT_RULES)).toBe(100)
  })

  it('counts the innate at x0.38 and even-slot flat subs at x0.88', () => {
    const innate = rune({ slot: 1, main: { stat: 'ATK', value: 160 }, innate: { stat: 'SPD', value: 6 } })
    expect(forgeBreakdown(innate, DEFAULT_RULES).innatePts).toBeCloseTo(100 * 0.2 * 0.38, 6)
    const flatEven = rune({ subs: [sub('HP', 375)] })
    expect(forgeBreakdown(flatEven, DEFAULT_RULES).subPts).toBeCloseTo(58 * 0.2 * 0.88, 6)
  })

  it('reads directional main/sub synergies', () => {
    expect(mainSubSynergy('ATK%', 'SPD', true, W)).toBe(1.11)
    expect(mainSubSynergy('SPD', 'ATK%', true, W)).toBe(1.1)
    expect(mainSubSynergy('CRate', 'CDmg', true, W)).toBe(1.12)
    expect(mainSubSynergy('ATK%', 'RES', true, W)).toBe(0.9)
    expect(mainSubSynergy('ATK', 'ACC', false, W)).toBe(1)
    expect(mainSubSynergy('HP%', 'ACC', true, W)).toBe(0.94)
  })

  it('applies the duplicate penalty and the golden triplet', () => {
    // ATK main + ATK% sub overlap once; ATK, CRate, CDmg is the Nuker triplet
    const r = rune({ slot: 1, main: { stat: 'ATK', value: 160 }, subs: [sub('ATK%', 8), sub('CRate', 6), sub('CDmg', 7)] })
    const b = forgeBreakdown(r, DEFAULT_RULES)
    expect(b.dup).toBeCloseTo(0.88, 6)
    expect(b.golden).toBe(1.04)
  })

  it('uses the weights from the rules', () => {
    const r = rune({ subs: [sub('SPD', 18), sub('HP%', 12), sub('ACC', 12), sub('DEF%', 8)] })
    const base = forgeScore(r, DEFAULT_RULES)
    expect(forgeScore(r, withForge({ subWeight: 0.5 }))).toBeLessThan(base)
    expect(forgeScore(r, withForge({ divisor: 200 }))).toBeGreaterThan(base)
    expect(forgeScore(r, withForge({ unlistedEvenSyn: 1 }))).toBeGreaterThan(base)
    expect(forgeScore(r, withForge({ mainTier: { ...W.mainTier, SPD: 50 } }))).toBeLessThan(base)
  })

  it('ranks a strong SPD rune above a flat one', () => {
    const strong = rune({ subs: [sub('SPD', 18), sub('HP%', 12), sub('ACC', 12), sub('DEF%', 8)] })
    const weak = rune({ subs: [sub('HP', 300), sub('DEF', 20), sub('ATK', 20), sub('RES', 5)] })
    expect(forgeScore(strong, DEFAULT_RULES)).toBeGreaterThan(forgeScore(weak, DEFAULT_RULES))
  })
})

/*
 * Real scores read off SW Forge, to check the readings the guide leaves open
 * (quality denominator, subWeight, flat even mains). Add rows as they come in.
 */
const SW_FORGE_SAMPLES: { note: string; rune: Parameters<typeof rune>[0]; score: number }[] = []

describe.skipIf(SW_FORGE_SAMPLES.length === 0)('forgeScore vs SW Forge', () => {
  it.each(SW_FORGE_SAMPLES)('$note', ({ rune: over, score }) => {
    expect(Math.abs(forgeScore(rune(over), DEFAULT_RULES) - score)).toBeLessThanOrEqual(1)
  })
})

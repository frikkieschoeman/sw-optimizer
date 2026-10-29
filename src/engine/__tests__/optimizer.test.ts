import { describe, expect, it } from 'vitest'
import { completedSets, computeBuild, optimize, scoreOf, violation, type OptimizerInput } from '../optimizer'
import type { Rune, Slot, Stat } from '../types'
import { rune, sub } from './helpers'

const base = { hp: 10000, atk: 800, def: 600, spd: 100, res: 15, acc: 0, crate: 15, cdmg: 50 }
const MAIN: Record<Slot, Stat> = { 1: 'ATK', 2: 'ATK%', 3: 'DEF', 4: 'CDmg', 5: 'HP', 6: 'ATK%' }
const VAL: Partial<Record<Stat, number>> = { ATK: 160, DEF: 160, HP: 2200, 'ATK%': 63, CDmg: 80 }

const mk = (slot: Slot, set: string, over: Partial<Rune> = {}) =>
  rune({ slot, set, main: { stat: MAIN[slot], value: VAL[MAIN[slot]]! }, ...over })

describe('computeBuild', () => {
  it('adds rune stats, percent stats of base, and set bonuses', () => {
    const runes = ([1, 2, 3, 4, 5, 6] as Slot[]).map((s) => mk(s, s <= 4 ? 'Fatal' : 'Blade'))
    const b = computeBuild(base, runes)
    // ATK: 800 + 160 flat + 2 x 63% of 800 + Fatal 35% of 800
    expect(b.totals.ATK).toBe(800 + 160 + Math.ceil(1.26 * 800) + 280)
    expect(b.totals.CDmg).toBe(50 + 80)
    expect(b.sets).toEqual(['Fatal', 'Blade'])
    expect(b.totals.CRate).toBe(15 + 12)
  })

  it('floors Swift and totem SPD', () => {
    const runes = ([1, 2, 3, 4, 5, 6] as Slot[]).map((s) => mk(s, s === 6 ? 'Blade' : 'Swift'))
    expect(computeBuild({ ...base, spd: 101 }, runes.slice(0, 4), 15).totals.SPD).toBe(101 + 25 + 15)
  })
})

describe('completedSets / Intangible', () => {
  it('lets one Intangible rune complete a set', () => {
    const runes = [mk(1, 'Fatal'), mk(2, 'Fatal'), mk(3, 'Fatal'), mk(4, 'Intangible'), mk(5, 'Blade'), mk(6, 'Blade')]
    expect(completedSets(runes, null).sort()).toEqual(['Blade'])
    expect(completedSets(runes, 'Fatal').sort()).toEqual(['Blade', 'Fatal'])
  })
})

describe('optimize', () => {
  const pool = (): Rune[] => {
    const out: Rune[] = []
    for (const s of [1, 2, 3, 4, 5, 6] as Slot[]) {
      out.push(mk(s, 'Fatal', { subs: [sub('CRate', 6)] }))
      out.push(mk(s, 'Fatal', { subs: [sub('SPD', 10)] }))
      out.push(mk(s, 'Blade', { subs: [sub('CRate', 9), sub('ATK%', 8)] }))
      out.push(mk(s, 'Violent', { subs: [sub('ATK%', 12)] }))
    }
    return out
  }
  const input = (over: Partial<OptimizerInput> = {}): OptimizerInput =>
    ({ base, runes: pool(), targets: { ATK: { weight: 1 } }, ...over })

  it('completes the required sets and meets the minimum', () => {
    const res = optimize(input({ requiredSets: ['Fatal', 'Blade'], targets: { ATK: { weight: 1 }, CRate: { min: 30 } } }))
    expect(res.exhaustive).toBe(true)
    const b = res.builds[0]
    expect(b.build.sets.sort()).toEqual(['Blade', 'Fatal'])
    expect(violation(b.build.totals, { CRate: { min: 30 } })).toBeNull()
    expect(b.slots.map((r) => r.slot)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('matches brute force on a small pool', () => {
    const small = pool().filter((_, i) => i % 4 !== 3)
    const targets = { ATK: { weight: 1 }, CRate: { min: 20 }, SPD: { weight: 2 } }
    const res = optimize(input({ runes: small, targets, top: 1 }))
    let best = -Infinity
    const bySlot = [1, 2, 3, 4, 5, 6].map((s) => small.filter((r) => r.slot === s))
    const walk = (i: number, picked: Rune[]) => {
      if (i === 6) {
        const b = computeBuild(base, picked)
        if (!violation(b.totals, targets)) best = Math.max(best, scoreOf(b.totals, { targets }))
        return
      }
      for (const r of bySlot[i]) walk(i + 1, [...picked, r])
    }
    walk(0, [])
    expect(res.builds[0].score).toBe(best)
  })

  it('respects allowed main stats on slots 2/4/6', () => {
    const runes = [...pool(), mk(2, 'Fatal', { main: { stat: 'SPD', value: 42 } })]
    const res = optimize(input({ runes, mainStats: { 2: ['SPD'] } }))
    expect(res.builds[0].slots[1].main.stat).toBe('SPD')
  })

  it('keeps locked runes and honours the allowed sets', () => {
    const runes = pool()
    const lock = runes.find((r) => r.slot === 5 && r.set === 'Blade')!
    const res = optimize(input({ runes, locked: [lock.id], allowedSets: ['Fatal', 'Blade'] }))
    expect(res.builds[0].slots[4].id).toBe(lock.id)
    expect(res.builds[0].slots.every((r) => ['Fatal', 'Blade'].includes(r.set))).toBe(true)
  })

  it('returns nothing when no build can meet the targets', () => {
    expect(optimize(input({ targets: { CRate: { min: 500 } } })).builds).toEqual([])
  })

  it('uses an Intangible rune as the missing set piece', () => {
    const runes = pool().filter((r) => r.set === 'Fatal' && !(r.slot === 6 && r.subs[0]?.stat === 'SPD'))
      .filter((r) => r.slot !== 5 && r.slot !== 6)
    runes.push(mk(6, 'Blade'), mk(5, 'Intangible'))
    const res = optimize({ base, runes, targets: { ATK: { weight: 1 } }, requiredSets: ['Fatal', 'Blade'] })
    expect(res.builds[0].build.intangibleAs).toBeTruthy()
    expect(res.builds[0].build.sets.sort()).toEqual(['Blade', 'Fatal'])
  })
})

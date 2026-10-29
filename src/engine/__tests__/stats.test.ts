import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, parseSwex } from '..'
import { efficiency } from '../stats'
import { rune, sub } from './helpers'

describe('efficiency', () => {
  it('counts innate and grinds, like verdict.py eff()', () => {
    const r = rune({
      innate: { stat: 'SPD', value: 6 },
      subs: [sub('SPD', 12, 4), sub('HP%', 8), sub('ACC', 8), sub('DEF%', 8)],
    })
    const expected = ((1 + 6 / 30 + 16 / 30 + 8 / 40 + 8 / 40 + 8 / 40) / 2.8) * 100
    expect(efficiency(r, DEFAULT_RULES)).toBeCloseTo(expected, 6)
  })
})

describe('parseSwex', () => {
  const swex = {
    runes: [{
      rune_id: 1, set_id: 13, slot_no: 2, class: 16, extra: 15, upgrade_curr: 15,
      pri_eff: [8, 42], prefix_eff: [8, 5], sec_eff: [[2, 10, 1, 3]], sell_value: 99,
    }],
    unit_list: [{
      unit_id: 7, unit_master_id: 100, unit_level: 40, class: 6, con: 800, atk: 1, def: 1,
      spd: 100, resist: 15, accuracy: 0, critical_rate: 15, critical_damage: 50,
      // SWEX sometimes emits equipped runes as an object keyed by slot
      runes: { 1: {
        rune_id: 2, set_id: 3, slot_no: 1, class: 6, extra: 4, upgrade_curr: 12,
        pri_eff: [3, 160], prefix_eff: [0, 0], sec_eff: [], sell_value: 1,
      } },
    }],
    rune_lock_list: [{ rune_id: 1 }],
  }

  it('normalizes runes, locks and equipped runes', () => {
    const a = parseSwex(swex)
    expect(a.runes).toHaveLength(2)
    const [inv, eq] = a.runes
    expect(inv).toMatchObject({ ancient: true, grade: 'Legend', locked: true, set: 'Violent' })
    expect(inv.innate).toEqual({ stat: 'SPD', value: 5 })
    expect(inv.subs[0]).toEqual({ stat: 'HP%', value: 10, gemmed: true, grind: 3 })
    expect(eq.location).toEqual({ kind: 'equipped', unitId: 7, masterId: 100 })
    expect(eq.grade).toBe('Hero')
    expect(a.units[0].runeIds).toEqual([2])
  })

  it('rejects non-SWEX input', () => {
    expect(() => parseSwex({})).toThrow(/SWEX/)
  })
})

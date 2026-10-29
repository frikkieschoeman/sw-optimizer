import { describe, expect, it } from 'vitest'
import { analyze, buildRules } from '..'
import { compareSnapshots } from '../compare'
import type { Account } from '../types'
import { rune, sub } from './helpers'

const junk = () => rune({ level: 15, grade: 'Hero', sellValue: 500,
  subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] })
const good = () => rune({ level: 15, subs: [sub('SPD', 18, 4), sub('HP%', 16), sub('ACC', 8), sub('DEF%', 8)] })

const snap = (runes: ReturnType<typeof rune>[]) => {
  const account: Account = { wizardId: 1, exportedAt: 0, runes, units: [], totemSpdPct: 0 }
  return { account, analysis: analyze(account, buildRules('Mid', 4)) }
}

describe('compareSnapshots', () => {
  const g = good()
  const j1 = junk()
  const j2 = junk()
  const cmp = compareSnapshots(snap([g, j1, j2]), snap([g]))

  it('reports rune counts and how many runes left', () => {
    expect(cmp.rows[0]).toMatchObject({ before: 3, after: 1, delta: -2 })
    expect(cmp.removed).toBe(2)
    expect(cmp.added).toBe(0)
    expect(cmp.sellValueRemoved).toBe(1000)
  })

  it('shows Sell shrinking after a cleanup', () => {
    const sell = cmp.verdicts.find((r) => r.label === 'Sell (inventory)')!
    expect(sell).toMatchObject({ before: 2, after: 0, delta: -2 })
    expect(cmp.rows.find((r) => r.label === 'Sell mana waiting')).toMatchObject({ before: 1000, after: 0 })
  })

  it('compares speed depth and score', () => {
    const labels = cmp.progression.map((r) => r.label)
    expect(labels).toContain('Speed depth (runes)')
    // dropping junk lifts the average of the best runes, so the score cannot fall
    expect(cmp.progression[0].delta).toBeGreaterThanOrEqual(0)
    expect(cmp.progression.find((r) => r.label === 'Speed depth (runes)')).toMatchObject({ before: 1, after: 1 })
  })
})

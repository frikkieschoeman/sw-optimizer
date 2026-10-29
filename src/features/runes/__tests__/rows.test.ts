import { describe, expect, it } from 'vitest'
import { analyze, buildRules, type Account } from '../../../engine'
import { rune, sub } from '../../../engine/__tests__/helpers'
import { parseFilters, runesLink } from '../filters'
import { buildRows, matches, monsterName, rowsToCsv } from '../rows'

const monsters = { 100: { name: 'Lushen' } }
const junk = { level: 15, grade: 'Hero' as const, set: 'Rage', setId: 5,
  subs: [sub('HP', 300), sub('DEF', 20), sub('RES', 5), sub('ACC', 5)] }
const runes = [
  rune({ ...junk }),
  rune({ ...junk, location: { kind: 'equipped', unitId: 1, masterId: 100 } }),
  rune({ level: 15, subs: [sub('SPD', 18, 4, true), sub('HP%', 16), sub('ACC', 8), sub('DEF%', 8)] }),
]
const account: Account = { wizardId: 1, exportedAt: 0, runes, units: [], totemSpdPct: 0 }
const rows = buildRows(account, analyze(account, buildRules('Mid', 4)), monsters)

describe('URL filters', () => {
  it('round-trips through the URL', () => {
    const f = { verdict: 'Sell', set: 'Rage', slot: 2, effMin: 40, effMax: 45 } as const
    expect(parseFilters(new URLSearchParams(runesLink(f).split('?')[1]))).toEqual(f)
  })
  it('ignores unknown verdicts and non-numeric numbers', () => {
    expect(parseFilters(new URLSearchParams('verdict=Nope&slot=abc&loc=zzz'))).toEqual({})
  })
})

describe('row filtering', () => {
  it('filters by verdict and location', () => {
    expect(rows.filter((r) => matches(r, { verdict: 'Sell', loc: 'inv' }))).toHaveLength(1)
    expect(rows.filter((r) => matches(r, { verdict: 'Replace', loc: 'eq' }))).toHaveLength(1)
  })
  it('searches the monster name and ranges are half-open', () => {
    expect(rows.filter((r) => matches(r, { q: 'lushen' }))).toHaveLength(1)
    const eff = rows[2].res.efficiency
    expect(matches(rows[2], { effMin: eff, effMax: eff + 1 })).toBe(true)
    expect(matches(rows[2], { effMin: eff - 1, effMax: eff })).toBe(false)
  })
  it('names unknown monsters by id', () => {
    expect(monsterName(5, monsters)).toBe('Monster #5')
  })
})

describe('CSV export', () => {
  it('shows grind in brackets, marks gemmed subs and quotes commas', () => {
    const csv = rowsToCsv(rows)
    expect(csv.split('\n')).toHaveLength(4)
    expect(csv).toContain('SPD 22 [4] (gemmed)')
    expect(csv).toContain('"')
  })
})

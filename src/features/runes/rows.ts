import { spdSub, type Account, type Analysis, type Rune, type RuneResult } from '../../engine'
import monsters from '../../data/monsters.json'
import type { RuneFilters } from './filters'

export interface RuneRow {
  rune: Rune
  res: RuneResult
  /** Unit name for equipped runes, otherwise "Inventory". */
  location: string
  spdSub: number
  /** Lower-cased text the search box matches against. */
  haystack: string
}

type MonsterData = Record<string, { name: string } | undefined>

export const monsterName = (masterId: number, data: MonsterData = monsters as MonsterData) =>
  data[masterId]?.name ?? `Monster #${masterId}`

export function buildRows(account: Account, analysis: Analysis, data?: MonsterData): RuneRow[] {
  return account.runes.map((rune) => {
    const res = analysis.results.get(rune.id)!
    const location = rune.location.kind === 'equipped' ? monsterName(rune.location.masterId, data) : 'Inventory'
    const haystack = [
      location, rune.set, rune.main.stat, rune.innate?.stat, res.role, res.verdict, res.reason, rune.grade,
      ...rune.subs.map((s) => s.stat),
    ].filter(Boolean).join(' ').toLowerCase()
    return { rune, res, location, spdSub: spdSub(rune), haystack }
  })
}

export function matches(row: RuneRow, f: RuneFilters): boolean {
  const { rune, res } = row
  if (f.verdict && res.verdict !== f.verdict) return false
  if (f.loc && (f.loc === 'inv') !== (rune.location.kind === 'inventory')) return false
  if (f.set && rune.set !== f.set) return false
  if (f.slot && rune.slot !== f.slot) return false
  if (f.role && res.role !== f.role) return false
  if (f.effMin !== undefined && res.efficiency < f.effMin) return false
  if (f.effMax !== undefined && res.efficiency >= f.effMax) return false
  if (f.spdMin !== undefined && row.spdSub < f.spdMin) return false
  if (f.spdMax !== undefined && row.spdSub >= f.spdMax) return false
  if (f.q) {
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.every((t) => row.haystack.includes(t))) return false
  }
  return true
}

const fmtSub = (s: { stat: string; value: number; grind: number; gemmed: boolean }) =>
  `${s.stat} ${s.value + s.grind}${s.grind ? ` [${s.grind}]` : ''}${s.gemmed ? ' (gemmed)' : ''}`

export const CSV_HEADER = [
  'Verdict', 'Reason', 'Role', 'Fit', 'Set', 'Slot', 'Grade', 'Stars', 'Level', 'Main', 'Innate',
  'Subs', 'SPD', 'Efficiency', 'Forge', 'Location', 'Locked', 'Sell value',
]

const esc = (v: string | number | boolean) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function rowsToCsv(rows: RuneRow[]): string {
  const lines = rows.map(({ rune: r, res, location }) => [
    res.verdict, res.reason, res.role ?? '', res.fit, r.set, r.slot,
    `${r.ancient ? 'Ancient ' : ''}${r.grade}`, r.stars, r.level,
    `${r.main.stat} ${r.main.value}`, r.innate ? `${r.innate.stat} ${r.innate.value}` : '',
    r.subs.map(fmtSub).join('; '), res.spd, res.efficiency.toFixed(1), res.forgeScore,
    location, r.locked, r.sellValue,
  ].map(esc).join(','))
  return [CSV_HEADER.join(','), ...lines].join('\n')
}

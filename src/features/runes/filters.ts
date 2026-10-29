import { VERDICTS, type Verdict } from '../../engine'

/** Filters the rune table reads from the URL (#/runes?...). */
export interface RuneFilters {
  verdict?: Verdict
  loc?: 'inv' | 'eq'
  set?: string
  slot?: number
  role?: string
  /** Efficiency range [min, max). */
  effMin?: number
  effMax?: number
  /** Total SPD on substats, range [min, max). */
  spdMin?: number
  spdMax?: number
  /** Free-text search. */
  q?: string
}

const NUMERIC = ['slot', 'effMin', 'effMax', 'spdMin', 'spdMax'] as const

export function runesLink(f: RuneFilters): string {
  const q = toParams(f).toString()
  return q ? `/runes?${q}` : '/runes'
}

export function toParams(f: RuneFilters): URLSearchParams {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== '') p.set(k, String(v))
  return p
}

/** Read filters from the URL; unknown or malformed values are ignored. */
export function parseFilters(p: URLSearchParams): RuneFilters {
  const f: RuneFilters = {}
  const verdict = p.get('verdict')
  if (verdict && (VERDICTS as string[]).includes(verdict)) f.verdict = verdict as Verdict
  const loc = p.get('loc')
  if (loc === 'inv' || loc === 'eq') f.loc = loc
  for (const k of ['set', 'role', 'q'] as const) {
    const v = p.get(k)
    if (v) f[k] = v
  }
  for (const k of NUMERIC) {
    const v = p.get(k)
    if (v !== null && v !== '' && Number.isFinite(Number(v))) f[k] = Number(v)
  }
  return f
}

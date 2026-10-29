import type { Verdict } from '../../engine'

/** Filters the rune table reads from the URL (#/runes?...). */
export interface RuneFilters {
  verdict?: Verdict
  loc?: 'inv' | 'eq'
  set?: string
  slot?: number
  /** Efficiency range [min, max). */
  effMin?: number
  effMax?: number
  /** Total SPD on substats, range [min, max). */
  spdMin?: number
  spdMax?: number
}

export function runesLink(f: RuneFilters): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v !== undefined) p.set(k, String(v))
  const q = p.toString()
  return q ? `/runes?${q}` : '/runes'
}

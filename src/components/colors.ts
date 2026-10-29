import type { Verdict } from '../engine'

export const VERDICT_COLOR: Record<Verdict, string> = {
  Upgrade: '#60a5fa',
  Finish: '#2dd4bf',
  Keep: '#4ade80',
  Gem: '#c084fc',
  Grind: '#fbbf24',
  Reapp: '#f472b6',
  Sell: '#f87171',
  Replace: '#fb923c',
}

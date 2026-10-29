import type { Stat } from './types'

export const STAT_BY_ID: Record<number, Stat> = {
  1: 'HP', 2: 'HP%', 3: 'ATK', 4: 'ATK%', 5: 'DEF', 6: 'DEF%',
  8: 'SPD', 9: 'CRate', 10: 'CDmg', 11: 'RES', 12: 'ACC',
}

export const SET_BY_ID: Record<number, string> = {
  1: 'Energy', 2: 'Guard', 3: 'Swift', 4: 'Blade', 5: 'Rage', 6: 'Focus',
  7: 'Endure', 8: 'Fatal', 10: 'Despair', 11: 'Vampire', 13: 'Violent',
  14: 'Nemesis', 15: 'Will', 16: 'Shield', 17: 'Revenge', 18: 'Destroy',
  19: 'Fight', 20: 'Determination', 21: 'Enhance', 22: 'Accuracy',
  23: 'Tolerance', 24: 'Seal', 25: 'Intangible', 99: 'Immemorial',
}

export const FLAT_STATS: readonly Stat[] = ['HP', 'ATK', 'DEF']

export const isFlat = (s: Stat) => s === 'HP' || s === 'ATK' || s === 'DEF'

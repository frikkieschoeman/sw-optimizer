import type { Rune, Stat, SubLine } from '../types'

let nextId = 1

export const sub = (stat: Stat, value: number, grind = 0, gemmed = false): SubLine =>
  ({ stat, value, grind, gemmed })

export function rune(over: Partial<Rune> & { subs?: SubLine[] } = {}): Rune {
  return {
    id: nextId++, setId: 13, set: 'Violent', slot: 2, stars: 6, ancient: false,
    grade: 'Legend', level: 15,
    main: { stat: 'SPD', value: 42 }, innate: null, subs: [],
    sellValue: 0, location: { kind: 'inventory' }, locked: false,
    ...over,
  }
}

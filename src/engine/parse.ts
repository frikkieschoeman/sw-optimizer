import { SET_BY_ID, STAT_BY_ID } from './constants'
import type { Account, Grade, Rune, Slot, SubLine, Unit } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */

const GRADES: Record<number, Grade> = { 3: 'Rare', 4: 'Hero', 5: 'Legend' }

function parseRune(raw: any, locked: Set<number>, loc: Rune['location']): Rune {
  const innateId = raw.prefix_eff?.[0]
  const subs: SubLine[] = (raw.sec_eff ?? []).map((s: number[]) => ({
    stat: STAT_BY_ID[s[0]],
    value: s[1],
    gemmed: !!s[2],
    grind: s[3] ?? 0,
  }))
  return {
    id: raw.rune_id,
    setId: raw.set_id,
    set: SET_BY_ID[raw.set_id] ?? `Set ${raw.set_id}`,
    slot: raw.slot_no as Slot,
    stars: raw.class % 10,
    ancient: raw.class > 10,
    grade: GRADES[raw.extra % 10] ?? 'Rare',
    level: raw.upgrade_curr,
    main: { stat: STAT_BY_ID[raw.pri_eff[0]], value: raw.pri_eff[1] },
    innate: innateId ? { stat: STAT_BY_ID[innateId], value: raw.prefix_eff[1] } : null,
    subs,
    sellValue: raw.sell_value ?? 0,
    location: loc,
    locked: locked.has(raw.rune_id),
  }
}

/** Convert a SWEX export into the normalized Account. */
export function parseSwex(json: any): Account {
  if (!json || !Array.isArray(json.runes) || !Array.isArray(json.unit_list)) {
    throw new Error('Not a SWEX export: missing runes[] or unit_list[]')
  }
  const locked = new Set<number>((json.rune_lock_list ?? []).map((l: any) => l.rune_id))
  const runes: Rune[] = json.runes.map((r: any) => parseRune(r, locked, { kind: 'inventory' }))
  const units: Unit[] = []
  for (const u of json.unit_list) {
    const eq = Array.isArray(u.runes) ? u.runes : Object.values(u.runes ?? {})
    const ids: number[] = []
    for (const r of eq as any[]) {
      runes.push(parseRune(r, locked, { kind: 'equipped', unitId: u.unit_id, masterId: u.unit_master_id }))
      ids.push(r.rune_id)
    }
    units.push({
      id: u.unit_id,
      masterId: u.unit_master_id,
      level: u.unit_level,
      stars: u.class,
      base: {
        hp: u.con * 15, atk: u.atk, def: u.def, spd: u.spd,
        res: u.resist, acc: u.accuracy, crate: u.critical_rate, cdmg: u.critical_damage,
      },
      runeIds: ids,
    })
  }
  return {
    wizardId: json.wizard_info?.wizard_id ?? json.wizard_id ?? 0,
    exportedAt: json.tvalue ?? json.ts_val ?? 0,
    runes,
    units,
    totemSpdPct: 0,
  }
}

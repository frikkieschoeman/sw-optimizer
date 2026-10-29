import { del, get, set } from 'idb-keyval'
import type { Stage, Strictness } from '../engine'

/** Everything stays in this browser's IndexedDB. Nothing is uploaded. */
export interface Settings {
  stage: Stage
  strictness: Strictness
  totemSpdPct: number
}

export const DEFAULT_SETTINGS: Settings = { stage: 'Mid', strictness: 4, totemSpdPct: 0 }

const exportKey = (slot: number) => `export:${slot}`

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export const saveExport = (slot: number, text: string) => safe(() => set(exportKey(slot), text), undefined)
export const loadExport = (slot: number) => safe(() => get<string>(exportKey(slot)), undefined)
export const clearExport = (slot: number) => safe(() => del(exportKey(slot)), undefined)

export const saveSettings = (s: Settings) => safe(() => set('settings', s), undefined)
export const loadSettings = async (): Promise<Settings> =>
  ({ ...DEFAULT_SETTINGS, ...(await safe(() => get<Settings>('settings'), undefined)) })

import { del, get, set } from 'idb-keyval'
import type { ForgeWeights, RulesConfig, Stage, Strictness } from '../engine'

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

/** Walk-through checkboxes: rune ids ticked off, per game account. */
const doneKey = (wizardId: number) => `cleanup-done:${wizardId}`
export const saveDone = (wizardId: number, ids: number[]) => safe(() => set(doneKey(wizardId), ids), undefined)
export const loadDone = (wizardId: number) => safe(() => get<number[]>(doneKey(wizardId)), undefined)

/** Custom rules saved from the Rules page. Absent means "use the Stage/Strictness preset". */
export const saveRules = (r: RulesConfig) => safe(() => set('rules', r), undefined)
export const loadRules = () => safe(() => get<RulesConfig>('rules'), undefined)
export const clearRules = () => safe(() => del('rules'), undefined)

/** Forge Score weights live apart from the rules so a Stage/Strictness change keeps them. */
export const saveForge = (w: ForgeWeights) => safe(() => set('forge', w), undefined)
export const loadForge = () => safe(() => get<Partial<ForgeWeights>>('forge'), undefined)
export const clearForge = () => safe(() => del('forge'), undefined)

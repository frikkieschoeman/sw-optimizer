import { create } from 'zustand'
import {
  analyze, buildRules, parseSwex, type Account, type Analysis, type Stage, type Strictness,
} from '../engine'
import { DEFAULT_SETTINGS, loadDone, loadExport, loadSettings, saveDone, saveExport, saveSettings } from './db'

interface AppState {
  ready: boolean
  account: Account | null
  analysis: Analysis | null
  stage: Stage
  strictness: Strictness
  totemSpdPct: number
  error: string | null
  /** Rune ids ticked off in the cleanup walk-through. */
  done: ReadonlySet<number>
  setDone: (ids: number[], checked: boolean) => void
  init: () => Promise<void>
  importText: (text: string) => Promise<void>
  setStage: (s: Stage) => void
  setStrictness: (s: Strictness) => void
}

function compute(account: Account | null, stage: Stage, strictness: Strictness) {
  return account ? analyze(account, buildRules(stage, strictness)) : null
}

export const useAppStore = create<AppState>((set, get) => {
  const persist = () => {
    const { stage, strictness, totemSpdPct } = get()
    void saveSettings({ stage, strictness, totemSpdPct })
  }
  return {
    ready: false,
    account: null,
    analysis: null,
    ...DEFAULT_SETTINGS,
    error: null,
    done: new Set<number>(),

    setDone(ids, checked) {
      const next = new Set(get().done)
      for (const id of ids) (checked ? next.add(id) : next.delete(id))
      set({ done: next })
      const wizardId = get().account?.wizardId
      if (wizardId !== undefined) void saveDone(wizardId, [...next])
    },

    async init() {
      const settings = await loadSettings()
      const text = await loadExport(1)
      let account: Account | null = null
      if (text) {
        try { account = parseSwex(JSON.parse(text)) } catch { /* corrupt save: start empty */ }
      }
      const done = account ? new Set((await loadDone(account.wizardId)) ?? []) : new Set<number>()
      set({ ...settings, account, done, analysis: compute(account, settings.stage, settings.strictness), ready: true })
    },

    async importText(text) {
      try {
        const account = parseSwex(JSON.parse(text))
        const { stage, strictness } = get()
        const done = new Set((await loadDone(account.wizardId)) ?? [])
        set({ account, done, analysis: compute(account, stage, strictness), error: null })
        await saveExport(1, text)
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Could not read that file' })
      }
    },

    setStage(stage) {
      set({ stage, analysis: compute(get().account, stage, get().strictness) })
      persist()
    },
    setStrictness(strictness) {
      set({ strictness, analysis: compute(get().account, get().stage, strictness) })
      persist()
    },
  }
})

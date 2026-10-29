import { create } from 'zustand'
import {
  analyze, buildRules, parseSwex, type Account, type Analysis, type RulesConfig, type Stage, type Strictness,
} from '../engine'
import { DEFAULT_SETTINGS, clearRules, loadDone, loadRules, saveRules, loadExport, loadSettings, saveDone, saveExport, saveSettings } from './db'

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
  setTotem: (pct: number) => void
  /** Custom rules from the Rules page; null means the Stage/Strictness preset is used. */
  customRules: RulesConfig | null
  saveCustomRules: (rules: RulesConfig) => void
  /** Factory reset: drop custom rules and go back to Mid / Strictness 4. */
  resetRules: () => void
}

export const effectiveRules = (s: Pick<AppState, 'stage' | 'strictness' | 'customRules'>) =>
  s.customRules ?? buildRules(s.stage, s.strictness)

function compute(account: Account | null, rules: RulesConfig) {
  return account ? analyze(account, rules) : null
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
    customRules: null,

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
      const customRules = (await loadRules()) ?? null
      const rules = customRules ?? buildRules(settings.stage, settings.strictness)
      set({ ...settings, account, done, customRules, analysis: compute(account, rules), ready: true })
    },

    async importText(text) {
      try {
        const account = parseSwex(JSON.parse(text))
        const done = new Set((await loadDone(account.wizardId)) ?? [])
        set({ account, done, analysis: compute(account, effectiveRules(get())), error: null })
        await saveExport(1, text)
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Could not read that file' })
      }
    },

    setStage(stage) {
      set({ stage, customRules: null })
      void clearRules()
      set({ analysis: compute(get().account, effectiveRules(get())) })
      persist()
    },
    setTotem(pct) {
      set({ totemSpdPct: Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)) })
      persist()
    },
    setStrictness(strictness) {
      set({ strictness, customRules: null })
      void clearRules()
      set({ analysis: compute(get().account, effectiveRules(get())) })
      persist()
    },
    saveCustomRules(rules) {
      set({ customRules: rules, analysis: compute(get().account, rules) })
      void saveRules(rules)
    },
    resetRules() {
      set({ customRules: null, stage: DEFAULT_SETTINGS.stage, strictness: DEFAULT_SETTINGS.strictness })
      void clearRules()
      set({ analysis: compute(get().account, effectiveRules(get())) })
      persist()
    },
  }
})

import { create } from 'zustand'
import {
  DEFAULT_FORGE, analyze, buildRules, parseSwex, type Account, type Analysis, type ForgeWeights, type RulesConfig,
  type Stage, type Strictness,
} from '../engine'
import { DEFAULT_SETTINGS, clearForge, clearRules, loadDone, loadForge, loadRules, saveForge, saveRules, loadExport, loadSettings, saveDone, saveExport, saveSettings } from './db'

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
  /** Forge Score weights from the Rules page; null means DEFAULT_FORGE. Kept across Stage/Strictness changes. */
  forgeWeights: ForgeWeights | null
  /** Factory reset: drop custom rules and Forge weights, go back to Mid / Strictness 4. */
  resetRules: () => void
}

export const effectiveRules = (
  s: Pick<AppState, 'stage' | 'strictness' | 'customRules' | 'forgeWeights'>,
): RulesConfig => ({
  ...(s.customRules ?? buildRules(s.stage, s.strictness)),
  forge: s.forgeWeights ?? DEFAULT_FORGE,
})

/** Saved weights may predate a field: fill gaps from the defaults. */
const withForgeDefaults = (w: Partial<ForgeWeights> | undefined): ForgeWeights | null =>
  w ? { ...DEFAULT_FORGE, ...w, mainTier: { ...DEFAULT_FORGE.mainTier, ...w.mainTier }, subTier: { ...DEFAULT_FORGE.subTier, ...w.subTier } } : null

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
    forgeWeights: null,

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
      const forgeWeights = withForgeDefaults(await loadForge())
      const rules = effectiveRules({ ...settings, customRules, forgeWeights })
      set({ ...settings, account, done, customRules, forgeWeights, analysis: compute(account, rules), ready: true })
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
      set({ customRules: rules, forgeWeights: rules.forge })
      set({ analysis: compute(get().account, effectiveRules(get())) })
      void saveRules(rules)
      void saveForge(rules.forge)
    },
    resetRules() {
      set({ customRules: null, forgeWeights: null, stage: DEFAULT_SETTINGS.stage, strictness: DEFAULT_SETTINGS.strictness })
      void clearRules()
      void clearForge()
      set({ analysis: compute(get().account, effectiveRules(get())) })
      persist()
    },
  }
})

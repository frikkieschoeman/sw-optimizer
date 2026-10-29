import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_RULES } from '../../engine'
import { rune, sub } from '../../engine/__tests__/helpers'
import { useAppStore } from '../useAppStore'

const swexRune = (r: ReturnType<typeof rune>) => ({
  rune_id: r.id, set_id: r.setId, slot_no: r.slot, class: 6, extra: 5, upgrade_curr: r.level,
  pri_eff: [8, 42], prefix_eff: [0, 0], sell_value: 1,
  sec_eff: r.subs.map((s) => [{ SPD: 8, 'HP%': 2, ACC: 12, 'DEF%': 6, HP: 1, DEF: 5, RES: 11 }[s.stat as string], s.value, 0, s.grind]),
})

const good = rune({ level: 15, subs: [sub('SPD', 18, 4), sub('HP%', 16), sub('ACC', 8), sub('DEF%', 8)] })
const swex = { runes: [swexRune(good)], unit_list: [], rune_lock_list: [] }

describe('app store rules', () => {
  beforeEach(async () => {
    useAppStore.setState({ stage: 'Mid', strictness: 4, customRules: null })
    await useAppStore.getState().importText(JSON.stringify(swex))
  })

  const verdict = () => useAppStore.getState().analysis!.results.get(good.id)!.verdict

  it('recalculates when custom rules are saved', () => {
    expect(verdict()).toBe('Keep')
    const strict = structuredClone(DEFAULT_RULES)
    // make every anchor and god/duo line unreachable
    for (const k of Object.keys(strict.high)) { strict.high[k as 'SPD'] = 99; strict.god[k as 'SPD'] = 99 }
    strict.duos = []
    strict.universalEff = 999
    useAppStore.getState().saveCustomRules(strict)
    expect(useAppStore.getState().customRules).toBe(strict)
    expect(verdict()).not.toBe('Keep')
  })

  it('changing Stage or Strictness drops custom rules', () => {
    useAppStore.getState().saveCustomRules(structuredClone(DEFAULT_RULES))
    useAppStore.getState().setStrictness(5)
    expect(useAppStore.getState().customRules).toBeNull()
    useAppStore.getState().saveCustomRules(structuredClone(DEFAULT_RULES))
    useAppStore.getState().setStage('Late')
    expect(useAppStore.getState().customRules).toBeNull()
  })

  it('reset restores Mid / 4 and the default verdict', () => {
    useAppStore.getState().setStage('Late')
    useAppStore.getState().resetRules()
    const s = useAppStore.getState()
    expect([s.stage, s.strictness, s.customRules]).toEqual(['Mid', 4, null])
    expect(verdict()).toBe('Keep')
  })
})

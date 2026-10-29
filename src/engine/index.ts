import { forgeScore } from './forgeScore'
import { progression } from './progression'
import { buildRules } from './rules/presets'
import type { RulesConfig } from './rules/types'
import { judge } from './verdict'
import type { Account, Analysis, RuneResult } from './types'

export * from './types'
export * from './constants'
export { parseSwex } from './parse'
export { DEFAULT_RULES } from './rules/defaults'
export { buildRules } from './rules/presets'
export type { RulesConfig } from './rules/types'
export { stageFor } from './progression'
export * from './aggregate'
export * from './cleanup'

/** Judge every rune and compute the account progression score. */
export function analyze(account: Account, rules: RulesConfig = buildRules('Mid', 4)): Analysis {
  const results = new Map<number, RuneResult>()
  for (const r of account.runes) {
    const res = judge(rules, r)
    res.forgeScore = forgeScore(r, rules)
    results.set(r.id, res)
  }
  return { results, progression: progression(account, results) }
}

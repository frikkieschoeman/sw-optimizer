import { isFlat } from './constants'
import { fit, godDuo } from './roles'
import type { RulesConfig } from './rules/types'
import { efficiency, lines, shapeOf, spdTotal, type RuneShape } from './stats'
import type { Role, Rune, RuneResult, Stat, Verdict } from './types'

const UNIVERSAL: Role = 'Universal (High Value)'

interface Raw {
  role: Role | null
  verdict: Verdict
  reason: string
  fit: number
  relaxed: boolean
  grindTarget?: RuneResult['grindTarget']
  gemTarget?: RuneResult['gemTarget']
}

/** Would one grind on SPD / HP% / DEF% / ATK% give this rune a role? */
function grindTry(rules: RulesConfig, r: Rune) {
  for (const sub of r.subs) {
    if (!rules.grind.stats.includes(sub.stat)) continue
    const add = sub.stat === 'SPD' ? rules.grind.spdAdd : rules.grind.pctAdd
    if (sub.grind >= add) continue
    const shape: RuneShape = {
      ...shapeOf(r),
      subs: r.subs.map((s) => (s.stat === sub.stat ? { ...s, grind: add } : s)),
    }
    const f = fit(rules, shape, rules.grind.evalLevel)
    if (f.role) return { stat: sub.stat, to: add, role: f.role }
  }
  return null
}

function judgeRaw(rules: RulesConfig, r: Rune): Raw {
  const lvl = r.level
  const shape = shapeOf(r)
  const L = lines(shape)
  const m = r.main.stat
  const eff = efficiency(r, rules)
  const flatEven = r.slot % 2 === 0 && isFlat(m)
  const f = fit(rules, shape, lvl)
  let role: Role | null = f.role
  let gd = godDuo(rules, shape)
  if (!role && gd) role = UNIVERSAL
  if (!role && lvl >= rules.universalFromLevel && eff >= rules.universalEff) {
    role = UNIVERSAL
    gd = `efficiency ${Math.round(eff)}%`
  }
  const base = { role, fit: f.score, relaxed: f.relaxed }
  const out = (verdict: Verdict, reason: string, extra: Partial<Raw> = {}): Raw =>
    ({ ...base, verdict, reason, ...extra })

  const legend = r.grade === 'Legend'
  if (r.stars < 6) return out('Sell', '5★ rune')
  if (flatEven) return out('Sell', `flat main stat on slot ${r.slot}`)

  if (lvl < rules.upgradeBelow) {
    const hasSpd = 'SPD' in L || m === 'SPD'
    if (rules.sellLowGradeWithoutSpd && !legend && !hasSpd)
      return out('Sell', 'Hero/Rare with no SPD line, not worth powering up')
    if (hasSpd && legend) return out('Upgrade', 'HIGH priority: Legend with SPD, take to +12')
    if (role || gd || lvl < 3)
      return out('Upgrade', legend ? 'level it to +12 first' : 'level to +12 (Hero) first')
    return out('Upgrade', 'no promising lines yet')
  }
  if (lvl < rules.finishBelow) {
    if (role && !f.relaxed) return out('Finish', `${role} fit ${f.score}`)
    if (role && f.relaxed) return out('Finish', `${role} fit ${f.score} (Relaxed)`)
    if (gd) return out('Finish', gd)
    return out('Sell', `no role or high-value line at +${lvl}`)
  }

  if (role && role !== UNIVERSAL) {
    const enchanted = r.subs.some((s) => s.gemmed)
    const flat = r.subs.find((s) => isFlat(s.stat))
    if (rules.gem.enabled && flat && !enchanted)
      return out('Gem', `${role}; gem the flat ${flat.stat} sub`, { gemTarget: { stat: flat.stat } })
    return out('Keep', `${role} fit ${f.score}${f.relaxed ? ' (Relaxed)' : ''}`)
  }
  if (role) return out('Keep', gd ?? 'High value')

  const g = grindTry(rules, r)
  if (g)
    return out('Grind', `grind ${g.stat} -> ${g.role}`, { grindTarget: { stat: g.stat, to: g.to } })

  const inn: Stat | 'none' = r.innate?.stat ?? 'none'
  const ra = rules.reapp
  if (
    (!ra.legendOnly || legend) &&
    ra.sets.includes(r.set) &&
    ((ra.allowOddSlots && r.slot % 2 === 1) || ra.mains.includes(m)) &&
    ra.innates.includes(inn) &&
    eff < ra.effCap
  )
    return out('Reapp', `Legend ${r.set}, good set/main, weak subs`)

  return out('Sell', 'SPD' in L ? 'weak lines for Mid' : 'no SPD sub')
}

/**
 * Final verdict for a rune. Locked and equipped runes are never Sell:
 * equipped becomes Replace, locked inventory runes become Keep.
 */
export function judge(rules: RulesConfig, r: Rune): RuneResult {
  const raw = judgeRaw(rules, r)
  let { verdict, reason } = raw
  if (verdict === 'Sell') {
    if (r.location.kind === 'equipped') {
      verdict = 'Replace'
      reason = `Equipped, but would be Sell (${raw.reason}). Swap it when you have a better one.`
    } else if (r.locked) {
      verdict = 'Keep'
      reason = `Locked in-game; would be Sell (${raw.reason}).`
    }
  }
  return {
    runeId: r.id,
    verdict,
    rawVerdict: raw.verdict,
    reason,
    role: raw.role,
    fit: raw.fit,
    relaxed: raw.relaxed,
    efficiency: efficiency(r, rules),
    forgeScore: 0,
    spd: spdTotal(r),
    grindTarget: raw.grindTarget,
    gemTarget: raw.gemTarget,
  }
}

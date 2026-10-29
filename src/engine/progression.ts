import type { Account, Progression, ProgressionBar, RuneResult, Stage } from './types'

const FULL = { speed: 250, power: 600, eliteAvg: 105, eliteFloor: 80, roster: 50 }
const WEIGHT = { speed: 30, power: 15, elite: 35, roster: 20 }

const bar = (count: number, full: number, max: number): ProgressionBar => ({
  count, full, max, value: Math.min(max, (count / full) * max),
})

export const stageFor = (score: number): Stage => (score < 45 ? 'Early' : score < 85 ? 'Mid' : 'Late')

/** Account progression score per the guide; ignores verdicts and filters. */
export function progression(account: Account, results: Map<number, RuneResult>): Progression {
  const speedCount = account.runes.filter((r) => {
    const x = results.get(r.id)
    return x && x.efficiency >= 60 && r.subs.reduce((a, s) => a + (s.stat === 'SPD' ? s.value + s.grind : 0), 0) >= 18
  }).length
  const powerCount = account.runes.filter((r) => r.stars === 6 && r.level === 15).length

  const top50 = account.runes
    .map((r) => results.get(r.id)?.efficiency ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 50)
  const avgTop50 = top50.length ? top50.reduce((a, b) => a + b, 0) / top50.length : 0
  const eliteValue = Math.max(
    0,
    Math.min(WEIGHT.elite, ((avgTop50 - FULL.eliteFloor) / (FULL.eliteAvg - FULL.eliteFloor)) * WEIGHT.elite),
  )

  const byId = new Map(account.runes.map((r) => [r.id, r]))
  const rosterCount = account.units.filter((u) => {
    if (u.stars !== 6 || u.level !== 40 || u.runeIds.length !== 6) return false
    const rs = u.runeIds.map((id) => byId.get(id)!)
    if (!rs.every((r) => r.level === 15)) return false
    const avg = rs.reduce((a, r) => a + (results.get(r.id)?.efficiency ?? 0), 0) / 6
    return avg >= 60
  }).length

  const speedDepth = bar(speedCount, FULL.speed, WEIGHT.speed)
  const powerDepth = bar(powerCount, FULL.power, WEIGHT.power)
  const rosterDepth = bar(rosterCount, FULL.roster, WEIGHT.roster)
  const total = speedDepth.value + powerDepth.value + eliteValue + rosterDepth.value
  return {
    total,
    speedDepth,
    powerDepth,
    eliteQuality: { value: eliteValue, max: WEIGHT.elite, count: top50.length, full: FULL.eliteAvg, avgTop50 },
    rosterDepth,
    suggestedStage: stageFor(total),
  }
}

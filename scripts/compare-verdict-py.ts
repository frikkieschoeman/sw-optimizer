// Usage: npx tsx scripts/compare-verdict-py.ts export.json py-verdicts.json
// Runs the engine at Mid / Strictness 4 and compares rawVerdict with verdict.py.
import { readFileSync } from 'node:fs'
import { analyze, buildRules, parseSwex } from '../src/engine'

const [exportPath, pyPath] = process.argv.slice(2)
const account = parseSwex(JSON.parse(readFileSync(exportPath, 'utf8')))
const py = JSON.parse(readFileSync(pyPath, 'utf8')) as Record<string, { verdict: string; role: string | null }>
const { results } = analyze(account, buildRules('Mid', 4))

let diffs = 0
const count = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1)
const ts: Record<string, number> = {}, pyc: Record<string, number> = {}, final: Record<string, number> = {}
for (const r of account.runes) {
  const res = results.get(r.id)!
  const p = py[r.id]
  count(ts, res.rawVerdict); count(pyc, p.verdict); count(final, res.verdict)
  if (res.rawVerdict !== p.verdict || res.role !== p.role) {
    if (diffs++ < 15) console.log('DIFF', r.id, 'ts', res.rawVerdict, res.role, 'py', p.verdict, p.role)
  }
}
console.log({ runes: account.runes.length, diffs })
console.log('python  ', pyc)
console.log('ts raw  ', ts)
console.log('ts final', final)
console.log('progression', JSON.stringify(analyze(account).progression, null, 1))

import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyze, buildRules, parseSwex } from '..'

// Optional full-export check. Generate the python side with
//   python3 -I scripts/dump-verdict-py.py export.json py.json
// then: SW_EXPORT=export.json SW_PY=py.json npx vitest run
const exportPath = process.env.SW_EXPORT
const pyPath = process.env.SW_PY
const have = !!exportPath && !!pyPath && existsSync(exportPath) && existsSync(pyPath)

describe.skipIf(!have)('matches reference/verdict.py on a real export', () => {
  it('gives the same role and verdict for every rune at Mid / 4', () => {
    const account = parseSwex(JSON.parse(readFileSync(exportPath!, 'utf8')))
    const py = JSON.parse(readFileSync(pyPath!, 'utf8')) as Record<string, { verdict: string; role: string | null }>
    const { results } = analyze(account, buildRules('Mid', 4))
    const diffs = account.runes.filter((r) => {
      const res = results.get(r.id)!
      return res.rawVerdict !== py[r.id].verdict || res.role !== py[r.id].role
    })
    expect(diffs).toHaveLength(0)
  })
})

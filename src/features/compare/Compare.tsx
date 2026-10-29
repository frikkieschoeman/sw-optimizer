import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  VERDICTS, analyze, buildRules, compareSnapshots, parseSwex, verdictCounts,
  type DeltaRow, type Snapshot,
} from '../../engine'
import { loadExport, saveExport } from '../../store/db'
import { useAppStore } from '../../store/useAppStore'

type Side = 'before' | 'after'
const SLOT: Record<Side, number> = { before: 2, after: 3 }

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1))

function DeltaTable({ title, rows }: { title: string; rows: DeltaRow[] }) {
  return (
    <section className="rounded-xl bg-slate-900 p-4">
      <h2 className="mb-2 font-medium">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr><th className="text-left font-normal" /><th className="text-right font-normal">Before</th><th className="text-right font-normal">After</th><th className="text-right font-normal">Change</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const good = r.higherIsBetter === null || r.delta === 0 ? null : (r.delta > 0) === r.higherIsBetter
            return (
              <tr key={r.label} className="border-t border-slate-800">
                <td className="py-1">{r.label}</td>
                <td className="text-right tabular-nums text-slate-400">{fmt(r.before)}</td>
                <td className="text-right tabular-nums">{fmt(r.after)}</td>
                <td className={`text-right tabular-nums ${good === null ? 'text-slate-300' : good ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.delta > 0 ? '+' : ''}{fmt(r.delta)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function Slot({ side, snap, name, onText }: { side: Side; snap?: Snapshot; name?: string; onText: (t: string, name: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const current = useAppStore((s) => s.account)
  return (
    <div className="flex-1 rounded-xl border border-dashed border-slate-700 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{side === 'before' ? 'Before' : 'After'}</div>
      <div className="my-1 text-lg">{snap ? `${snap.account.runes.length.toLocaleString()} runes` : 'Not loaded'}</div>
      {name && <div className="text-xs text-slate-500">{name}</div>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800" onClick={() => input.current?.click()}>Choose export…</button>
        {current && (
          <button className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
            onClick={async () => {
              const text = await loadExport(1)
              if (text) onText(text, 'current export')
            }}>Use current export</button>
        )}
      </div>
      <input ref={input} type="file" accept=".json,application/json" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onText(await f.text(), f.name)
          e.target.value = ''
        }} />
    </div>
  )
}

export function Compare() {
  const { stage, strictness } = useAppStore()
  const [raw, setRaw] = useState<Partial<Record<Side, { account: ReturnType<typeof parseSwex>; name?: string }>>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (['before', 'after'] as Side[]).forEach(async (side) => {
      const text = await loadExport(SLOT[side])
      if (!text) return
      try { setRaw((r) => ({ ...r, [side]: { account: parseSwex(JSON.parse(text)), name: 'saved in this browser' } })) } catch { /* ignore corrupt save */ }
    })
  }, [])

  const set = (side: Side) => async (text: string, name: string) => {
    try {
      const account = parseSwex(JSON.parse(text))
      setRaw((r) => ({ ...r, [side]: { account, name } }))
      setError(null)
      await saveExport(SLOT[side], text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file')
    }
  }

  // both sides are judged with the same Stage and Strictness
  const snaps = useMemo(() => {
    const rules = buildRules(stage, strictness)
    const make = (side: Side): Snapshot | undefined => {
      const a = raw[side]?.account
      return a ? { account: a, analysis: analyze(a, rules) } : undefined
    }
    return { before: make('before'), after: make('after') }
  }, [raw, stage, strictness])

  const cmp = useMemo(
    () => (snaps.before && snaps.after ? compareSnapshots(snaps.before, snaps.after) : null),
    [snaps],
  )
  const chart = useMemo(() => {
    if (!snaps.before || !snaps.after) return []
    const b = verdictCounts(snaps.before.account, snaps.before.analysis.results)
    const a = verdictCounts(snaps.after.account, snaps.after.analysis.results)
    return VERDICTS.map((v) => ({
      verdict: v,
      Before: b.inventory[v] + b.equipped[v],
      After: a.inventory[v] + a.equipped[v],
    }))
  }, [snaps])

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Load an export from before and after a cleanup session. Both are judged with the current Stage ({stage}) and Strictness ({strictness}), so the changes come from your runes, not the rules.
      </p>
      <div className="flex flex-wrap gap-4">
        {(['before', 'after'] as Side[]).map((side) => (
          <Slot key={side} side={side} snap={snaps[side]} name={raw[side]?.name} onText={set(side)} />
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {cmp && (
        <>
          <p className="text-sm">
            <b>{cmp.removed.toLocaleString()}</b> runes gone ({cmp.sellValueRemoved.toLocaleString()} mana of sell value),
            <b className="ml-1">{cmp.added.toLocaleString()}</b> new.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <DeltaTable title="Runes" rows={cmp.rows} />
            <DeltaTable title="Progression" rows={cmp.progression} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DeltaTable title="Verdicts" rows={cmp.verdicts} />
            <section className="rounded-xl bg-slate-900 p-4">
              <h2 className="mb-2 font-medium">Verdicts, before and after</h2>
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={chart} margin={{ left: -16 }}>
                    <XAxis dataKey="verdict" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} cursor={{ fill: '#1e293b' }} />
                    <Legend />
                    <Bar dataKey="Before" fill="#64748b" isAnimationActive={false} />
                    <Bar dataKey="After" fill="#34d399" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

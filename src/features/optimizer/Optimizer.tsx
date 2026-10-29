import { useMemo, useState } from 'react'
import {
  SET_BONUS, TOTAL_STATS, bestBuild, scoreOf, violation,
  type Build, type Candidate, type OptimizerInput, type Rune, type Stat, type StatTarget, type TotalStat,
} from '../../engine'
import { monsterName } from '../runes/rows'
import { useAppStore } from '../../store/useAppStore'
import { useOptimizer } from './useOptimizer'

type Field = 'min' | 'max' | 'weight'
type Targets = Record<TotalStat, Record<Field, string>>

const blankTargets = (): Targets =>
  Object.fromEntries(TOTAL_STATS.map((s) => [s, { min: '', max: '', weight: '' }])) as Targets

const PRESETS: { name: string; set: Partial<Record<TotalStat, Partial<Record<Field, string>>>> }[] = [
  { name: 'Damage dealer', set: { ATK: { weight: '1' }, CDmg: { weight: '3' }, CRate: { min: '100' } } },
  { name: 'Fast support', set: { SPD: { weight: '10' }, HP: { weight: '0.1' }, DEF: { weight: '0.3' }, RES: { min: '60' } } },
  { name: 'Tank', set: { HP: { weight: '0.2' }, DEF: { weight: '1' }, RES: { weight: '1' } } },
  { name: 'Bruiser', set: { HP: { weight: '0.1' }, ATK: { weight: '0.5' }, CDmg: { weight: '1' }, CRate: { min: '80' } } },
]

const SLOT_MAINS: Record<2 | 4 | 6, Stat[]> = {
  2: ['SPD', 'ATK%', 'DEF%', 'HP%', 'ATK', 'DEF', 'HP'],
  4: ['ATK%', 'DEF%', 'HP%', 'CRate', 'CDmg', 'ATK', 'DEF', 'HP'],
  6: ['ATK%', 'DEF%', 'HP%', 'RES', 'ACC', 'ATK', 'DEF', 'HP'],
}
const SETS = Object.keys(SET_BONUS)
const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s))
const cell = 'w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm tabular-nums'

function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: readonly T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button key={o} type="button" aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{o}</button>
        )
      })}
    </div>
  )
}

function RuneTile({ rune, note, other }: { rune: Rune; note?: string; other?: string }) {
  return (
    <div className="rounded-lg bg-slate-800 p-2 text-xs">
      <div className="flex justify-between gap-2">
        <b>S{rune.slot} {rune.set}</b><span className="text-slate-400">+{rune.level}</span>
      </div>
      <div className="text-sky-300">{rune.main.stat} {rune.main.value}</div>
      <div className="text-slate-400">
        {rune.innate && <i>{rune.innate.stat} {rune.innate.value}; </i>}
        {rune.subs.map((s) => `${s.stat} ${s.value + s.grind}`).join(', ')}
      </div>
      {other && <div className="text-amber-300">on {other}</div>}
      {note && <div className="text-emerald-300">{note}</div>}
    </div>
  )
}

function StatTable({ base, current, picked, targets }: { base: Build; current: Build; picked: Build; targets: Partial<Record<TotalStat, StatTarget>> }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead className="text-xs text-slate-400">
        <tr><th className="text-left">Stat</th><th className="text-right">Base</th><th className="text-right">Equipped</th><th className="text-right">Optimized</th><th className="text-right">Change</th><th className="text-right">Target</th></tr>
      </thead>
      <tbody>
        {TOTAL_STATS.map((k) => {
          const d = picked.totals[k] - current.totals[k]
          const t = targets[k]
          const bad = t && ((t.min !== undefined && picked.totals[k] < t.min) || (t.max !== undefined && picked.totals[k] > t.max))
          return (
            <tr key={k} className="border-t border-slate-800">
              <td className="py-1">{k}</td>
              <td className="text-right text-slate-400">{base.parts.base[k]}</td>
              <td className="text-right">{current.totals[k]}</td>
              <td className={`text-right font-medium ${bad ? 'text-red-400' : ''}`}>{picked.totals[k]}</td>
              <td className={`text-right ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-orange-400' : 'text-slate-500'}`}>{d > 0 ? '+' : ''}{d}</td>
              <td className="text-right text-xs text-slate-500">{t?.min !== undefined ? `≥ ${t.min}` : ''}{t?.max !== undefined ? ` ≤ ${t.max}` : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function Optimizer() {
  const account = useAppStore((s) => s.account)!
  const totemSpdPct = useAppStore((s) => s.totemSpdPct)
  const { run, start, stop } = useOptimizer()

  const units = useMemo(() => [...account.units]
    .sort((a, b) => monsterName(a.masterId).localeCompare(monsterName(b.masterId)) || b.level - a.level), [account])
  const [unitId, setUnitId] = useState<number>(() => units.find((u) => u.runeIds.length > 0)?.id ?? units[0]?.id)
  const [q, setQ] = useState('')
  const [targets, setTargets] = useState<Targets>(blankTargets)
  const [required, setRequired] = useState<string[]>([])
  const [allowed, setAllowed] = useState<string[]>([])
  const [mains, setMains] = useState<Record<2 | 4 | 6, Stat[]>>({ 2: [], 4: [], 6: [] })
  const [useOthers, setUseOthers] = useState(false)
  const [minLevel, setMinLevel] = useState(0)
  const [locked, setLocked] = useState<number[]>([])
  const [excluded, setExcluded] = useState<number[]>([])
  const [pick, setPick] = useState(0)

  const unit = units.find((u) => u.id === unitId)
  const byId = useMemo(() => new Map(account.runes.map((r) => [r.id, r])), [account])
  const equipped = useMemo(() => (unit?.runeIds ?? []).map((id) => byId.get(id)!).sort((a, b) => a.slot - b.slot), [unit, byId])
  const current = useMemo(() => (unit ? bestBuild(unit.base, equipped, totemSpdPct) : null), [unit, equipped, totemSpdPct])

  const parsed = useMemo(() => {
    const out: Partial<Record<TotalStat, StatTarget>> = {}
    for (const k of TOTAL_STATS) {
      const t = { min: num(targets[k].min), max: num(targets[k].max), weight: num(targets[k].weight) }
      if (t.min !== undefined || t.max !== undefined || t.weight) out[k] = t
    }
    return out
  }, [targets])

  const shown = units.filter((u) => !q.trim() || monsterName(u.masterId).toLowerCase().includes(q.trim().toLowerCase()))
  const choose = (id: number) => { setUnitId(id); setLocked([]); setPick(0) }
  const setField = (k: TotalStat, f: Field, v: string) => setTargets((t) => ({ ...t, [k]: { ...t[k], [f]: v } }))
  const applyPreset = (p: typeof PRESETS[number]) => {
    const t = blankTargets()
    for (const [k, fields] of Object.entries(p.set)) Object.assign(t[k as TotalStat], fields)
    setTargets(t)
  }

  const canRun = !!unit && Object.values(parsed).some((t) => t.weight)
  const go = () => {
    if (!unit) return
    const pool = account.runes.filter((r) =>
      !excluded.includes(r.id) &&
      (r.location.kind === 'inventory' || r.location.unitId === unit.id || useOthers))
    const input: OptimizerInput = {
      base: unit.base, runes: pool, targets: parsed, totemSpdPct,
      requiredSets: required, allowedSets: allowed.length ? allowed : undefined,
      mainStats: Object.fromEntries(([2, 4, 6] as const).filter((s) => mains[s].length).map((s) => [s, mains[s]])),
      locked, minLevel, top: 5,
    }
    setPick(0)
    start(input)
  }

  const builds: Candidate[] = run.status === 'done' ? run.result.builds : []
  const chosen = builds[pick] ?? null
  const eqSlots = new Map(equipped.map((r) => [r.slot, r]))
  const weights = { targets: parsed }
  const swapped = chosen ? chosen.slots.filter((r) => eqSlots.get(r.slot)?.id !== r.id).length : 0
  const curViolation = current ? violation(current.totals, parsed) : null

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input type="search" placeholder="Search monster…" value={q} onChange={(e) => setQ(e.target.value)}
            className="w-52 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5" />
          <select value={unitId} onChange={(e) => choose(Number(e.target.value))}
            className="min-w-64 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5">
            {shown.map((u) => <option key={u.id} value={u.id}>{monsterName(u.masterId)} · {u.stars}★ lv{u.level} · {u.runeIds.length} runes</option>)}
          </select>
          <span className="text-slate-400">Base at its current level: HP {unit?.base.hp} · ATK {unit?.base.atk} · DEF {unit?.base.def} · SPD {unit?.base.spd}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-slate-900 p-4">
          <h2 className="font-medium">Target stats</h2>
          <p className="mb-2 text-xs text-slate-400">Min and max are hard limits on the final stat. Weight is the score per point; builds are ranked by the weighted total.</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => applyPreset(p)}
                className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800">{p.name}</button>
            ))}
            <button type="button" onClick={() => setTargets(blankTargets())} className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800">Clear</button>
          </div>
          <table className="text-sm">
            <thead className="text-xs text-slate-400"><tr><th className="text-left">Stat</th><th>Equipped</th><th>Min</th><th>Max</th><th>Weight</th></tr></thead>
            <tbody>
              {TOTAL_STATS.map((k) => (
                <tr key={k}>
                  <td className="pr-3">{k}</td>
                  <td className="pr-3 text-right tabular-nums text-slate-400">{current?.totals[k]}</td>
                  {(['min', 'max', 'weight'] as const).map((f) => (
                    <td key={f} className="px-1 py-0.5">
                      <input type="number" step={f === 'weight' ? 0.1 : 1} value={targets[k][f]} className={cell}
                        aria-label={`${k} ${f}`} onChange={(e) => setField(k, f, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3 rounded-xl bg-slate-900 p-4 text-sm">
          <div>
            <h2 className="font-medium">Required sets</h2>
            <p className="mb-1 text-xs text-slate-400">Each ticked set must be completed (4 pieces for Swift, Fatal, Rage, Despair, Vampire, Violent; otherwise 2). An Intangible rune counts as one piece of any set.</p>
            <Chips options={SETS} value={required} onChange={setRequired} />
          </div>
          <div>
            <h3 className="font-medium">Only use these sets <span className="text-xs font-normal text-slate-400">(none ticked means any)</span></h3>
            <Chips options={SETS} value={allowed} onChange={setAllowed} />
          </div>
          {([2, 4, 6] as const).map((s) => (
            <div key={s}>
              <h3 className="font-medium">Slot {s} main stat <span className="text-xs font-normal text-slate-400">(none ticked means any)</span></h3>
              <Chips options={SLOT_MAINS[s]} value={mains[s]} onChange={(v) => setMains((m) => ({ ...m, [s]: v }))} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1"><input type="checkbox" checked={useOthers} onChange={(e) => setUseOthers(e.target.checked)} className="accent-emerald-500" />Use runes equipped on other monsters</label>
            <label className="flex items-center gap-1">Minimum rune level
              <select value={minLevel} onChange={(e) => setMinLevel(Number(e.target.value))} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5">
                {[0, 9, 12, 15].map((n) => <option key={n} value={n}>+{n}</option>)}
              </select>
            </label>
          </div>
          <div>
            <h3 className="font-medium">Keep a currently equipped rune</h3>
            <div className="flex flex-wrap gap-3">
              {equipped.map((r) => (
                <label key={r.id} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={locked.includes(r.id)} className="accent-emerald-500"
                    onChange={(e) => setLocked(e.target.checked ? [...locked, r.id] : locked.filter((x) => x !== r.id))} />
                  S{r.slot} {r.set} {r.main.stat}
                </label>
              ))}
              {equipped.length === 0 && <span className="text-xs text-slate-500">Nothing equipped.</span>}
            </div>
          </div>
          {excluded.length > 0 && (
            <div className="text-xs">Excluded runes: {excluded.map((id) => {
              const r = byId.get(id)
              return <button key={id} type="button" onClick={() => setExcluded(excluded.filter((x) => x !== id))} className="mr-1 rounded border border-slate-700 px-1.5 py-0.5 hover:bg-slate-800" title="Click to allow again">S{r?.slot} {r?.set} {r?.main.stat} ✕</button>
            })}</div>
          )}
        </section>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={!canRun || run.status === 'running'} onClick={go}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium disabled:opacity-40">Find best runes</button>
        {run.status === 'running' && <button type="button" onClick={stop} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm">Stop</button>}
        {run.status === 'running' && <span className="text-sm text-slate-400">Searching…</span>}
        {!canRun && <span className="text-sm text-slate-500">Give at least one stat a weight to rank builds.</span>}
        {curViolation && <span className="text-sm text-orange-300">Equipped build misses a limit: {curViolation}</span>}
      </div>

      {run.status === 'error' && <p className="text-sm text-red-400">{run.message}</p>}
      {run.status === 'done' && builds.length === 0 && (
        <p className="rounded-xl bg-slate-900 p-4 text-sm text-orange-300">
          No six-rune build meets every limit with the runes allowed. Loosen a minimum, allow more sets, or tick “Use runes equipped on other monsters”.
        </p>
      )}
      {run.status === 'done' && chosen && current && unit && (
        <section className="space-y-3 rounded-xl bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {builds.map((b, i) => (
              <button key={i} type="button" onClick={() => setPick(i)}
                className={`rounded px-3 py-1 ${i === pick ? 'bg-slate-700' : 'bg-slate-800 text-slate-400'}`}>#{i + 1} · {b.score.toFixed(0)}</button>
            ))}
            <span className="ml-auto text-xs text-slate-400">
              {run.result.nodes.toLocaleString()} nodes in {(run.ms / 1000).toFixed(1)} s ·{' '}
              {run.result.exhaustive ? 'every combination checked' : 'search was cut short, a better build may exist'}
            </span>
          </div>
          <p className="text-sm">
            Score {chosen.score.toFixed(0)} vs equipped {scoreOf(current.totals, weights).toFixed(0)} · {swapped} rune{swapped === 1 ? '' : 's'} change ·
            sets: {chosen.build.sets.join(' + ') || 'none'}{chosen.build.intangibleAs ? ` (Intangible as ${chosen.build.intangibleAs})` : ''}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {chosen.slots.map((r) => {
              const here = eqSlots.get(r.slot)
              const other = r.location.kind === 'equipped' && r.location.unitId !== unit.id ? monsterName(r.location.masterId) : undefined
              return (
                <div key={r.id}>
                  <RuneTile rune={r} other={other} note={here?.id === r.id ? 'already equipped' : here ? 'replaces the equipped one' : 'fills an empty slot'} />
                  {here?.id !== r.id && (
                    <button type="button" className="mt-1 text-xs text-slate-500 hover:text-white"
                      onClick={() => setExcluded([...excluded, r.id])}>Exclude this rune</button>
                  )}
                </div>
              )
            })}
          </div>
          <StatTable base={chosen.build} current={current} picked={chosen.build} targets={parsed} />
        </section>
      )}
    </div>
  )
}

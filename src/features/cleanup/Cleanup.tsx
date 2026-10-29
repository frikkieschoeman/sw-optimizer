import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PASSES, cleanupGroups, progressOf, type CleanupGroup, type PassId } from '../../engine'
import { VerdictBadge } from '../runes/RuneTable'
import { useAppStore } from '../../store/useAppStore'

const Progress = ({ checked, total }: { checked: number; total: number }) => (
  <div className="flex items-center gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={checked}>
    <div className="h-1.5 w-28 rounded bg-slate-800">
      <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${total ? (checked / total) * 100 : 0}%` }} />
    </div>
    <span className="text-xs tabular-nums text-slate-400">{checked}/{total}</span>
  </div>
)

function Group({ group, pass, startOpen }: { group: CleanupGroup; pass: PassId; startOpen: boolean }) {
  const done = useAppStore((s) => s.done)
  const setDone = useAppStore((s) => s.setDone)
  const ids = group.runes.map((x) => x.rune.id)
  const checked = ids.filter((id) => done.has(id)).length
  const complete = checked === ids.length
  const [open, setOpen] = useState(startOpen)

  return (
    <section className={`rounded-xl border ${complete ? 'border-emerald-900 bg-emerald-950/20' : 'border-slate-800 bg-slate-900'}`}>
      <header className="flex flex-wrap items-center gap-3 px-3 py-2">
        <input
          type="checkbox" checked={complete} className="size-4 accent-emerald-500"
          aria-label={`Mark ${group.set} slot ${group.slot} ${group.main} done`}
          onChange={(e) => setDone(ids, e.target.checked)}
        />
        <button className="flex-1 text-left" onClick={() => setOpen(!open)}>
          <b>{group.set}</b> · slot {group.slot} · {group.main}
          <span className="ml-2 text-xs text-slate-400">
            {group.runes.length} runes{pass === 'sell' && ` · ${group.mana.toLocaleString()} mana`}
          </span>
        </button>
        <Progress checked={checked} total={ids.length} />
      </header>
      {open && (
        <ul className="divide-y divide-slate-800 border-t border-slate-800">
          {group.runes.map(({ rune: r, res, action, high }) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-sm">
              <input
                type="checkbox" checked={done.has(r.id)} className="size-4 accent-emerald-500"
                aria-label={`Done with rune ${r.id}`} onChange={(e) => setDone([r.id], e.target.checked)}
              />
              <VerdictBadge verdict={res.verdict} reason={res.reason} />
              <span className={done.has(r.id) ? 'text-slate-500 line-through' : ''}>
                {r.stars}★ {r.ancient && <b className="text-amber-300">Anc </b>}{r.grade} +{r.level} · {r.main.stat} {r.main.value}
                {r.innate && <span className="text-slate-400"> · innate {r.innate.stat} {r.innate.value}</span>}
              </span>
              <span className="text-slate-300">
                {r.subs.map((s) => `${s.gemmed ? '↻' : ''}${s.stat} ${s.value + s.grind}${s.grind ? ` [${s.grind}]` : ''}`).join(' · ')}
              </span>
              <span className={`ml-auto ${high ? 'font-medium text-sky-300' : 'text-slate-400'}`}>{action}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Cleanup() {
  const account = useAppStore((s) => s.account)!
  const analysis = useAppStore((s) => s.analysis)!
  const done = useAppStore((s) => s.done)
  const [params, setParams] = useSearchParams()
  const pass = (PASSES.find((p) => p.id === params.get('pass'))?.id ?? 'sell') as PassId
  const [hideDone, setHideDone] = useState(false)

  const all = useMemo(
    () => Object.fromEntries(PASSES.map((p) => [p.id, cleanupGroups(account, analysis.results, p.id)])) as Record<PassId, CleanupGroup[]>,
    [account, analysis],
  )
  const groups = all[pass]
  const { total, checked } = progressOf(groups, done)
  const visible = hideDone
    ? groups.filter((g) => g.runes.some((x) => !done.has(x.rune.id)))
    : groups
  const info = PASSES.find((p) => p.id === pass)!

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist">
        {PASSES.map((p) => {
          const pr = progressOf(all[p.id], done)
          return (
            <button key={p.id} role="tab" aria-selected={p.id === pass}
              onClick={() => setParams({ pass: p.id }, { replace: true })}
              className={`rounded-lg border px-4 py-2 text-left text-sm ${p.id === pass ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 hover:bg-slate-900'}`}>
              <div className="font-medium">{p.title}</div>
              <div className="text-xs tabular-nums text-slate-400">{pr.checked}/{pr.total} done</div>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-slate-400">{info.blurb}</p>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-emerald-500" />
          Hide finished groups
        </label>
        <Progress checked={checked} total={total} />
      </div>
      {visible.length === 0
        ? <p className="py-10 text-center text-slate-400">{total ? 'All groups are done.' : 'Nothing to do in this pass.'}</p>
        : <div className="space-y-2">{visible.map((g, i) => <Group key={g.key} group={g} pass={pass} startOpen={i === 0} />)}</div>}
    </div>
  )
}

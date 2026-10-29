import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createColumnHelper, createSortedRowModel, rowSortingFeature, sortFn_alphanumeric,
  tableFeatures, useTable,
} from '@tanstack/react-table'
import { VERDICTS, isFlat, type Verdict } from '../../engine'
import { VERDICT_COLOR } from '../../components/colors'
import { useAppStore } from '../../store/useAppStore'
import { parseFilters, toParams, type RuneFilters } from './filters'
import { buildRows, matches, rowsToCsv, type RuneRow } from './rows'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})
const helper = createColumnHelper<typeof features, RuneRow>()

const PAGE = 500

export function VerdictBadge({ verdict, reason }: { verdict: Verdict; reason: string }) {
  return (
    <span title={reason} className="cursor-help rounded px-2 py-0.5 text-xs font-medium text-slate-950"
      style={{ background: VERDICT_COLOR[verdict] }}>{verdict}</span>
  )
}

const columns = helper.columns([
  helper.accessor((r) => r.res.verdict, {
    id: 'verdict', header: 'Verdict',
    cell: (c) => <VerdictBadge verdict={c.row.original.res.verdict} reason={c.row.original.res.reason} />,
  }),
  helper.accessor((r) => r.res.reason, { id: 'reason', header: 'Reason', cell: (c) => <span className="text-slate-400">{c.getValue()}</span> }),
  helper.accessor((r) => r.res.role ?? '', { id: 'role', header: 'Role' }),
  helper.accessor((r) => r.res.fit, { id: 'fit', header: 'Fit' }),
  helper.accessor((r) => r.rune.set, { id: 'set', header: 'Set' }),
  helper.accessor((r) => r.rune.slot, { id: 'slot', header: 'Slot' }),
  helper.accessor((r) => `${r.rune.stars}${r.rune.ancient ? 'A' : ''}${r.rune.grade}`, {
    id: 'grade', header: 'Grade',
    cell: (c) => {
      const r = c.row.original.rune
      return <span>{r.stars}★ {r.ancient && <b className="text-amber-300">Anc </b>}{r.grade}</span>
    },
  }),
  helper.accessor((r) => r.rune.level, { id: 'level', header: 'Lv', cell: (c) => `+${c.getValue()}` }),
  helper.accessor((r) => r.rune.main.stat, {
    id: 'main', header: 'Main',
    cell: (c) => {
      const m = c.row.original.rune.main
      return <span className={isFlat(m.stat) && c.row.original.rune.slot % 2 === 0 ? 'text-red-400' : ''}>{m.stat} {m.value}</span>
    },
  }),
  helper.accessor((r) => r.rune.innate?.stat ?? '', {
    id: 'innate', header: 'Innate',
    cell: (c) => { const i = c.row.original.rune.innate; return i ? `${i.stat} ${i.value}` : '' },
  }),
  helper.display({
    id: 'subs', header: 'Subs',
    cell: (c) => (
      <div className="flex flex-col leading-tight">
        {c.row.original.rune.subs.map((s, i) => (
          <span key={i} className={s.stat === 'SPD' ? 'text-sky-300' : ''}>
            {s.gemmed && <span title="Gemmed" className="mr-0.5 text-purple-300">↻</span>}
            {s.stat} {s.value + s.grind}{s.grind > 0 && <span className="text-amber-300"> [{s.grind}]</span>}
          </span>
        ))}
      </div>
    ),
  }),
  helper.accessor((r) => r.res.spd, { id: 'spd', header: 'SPD' }),
  helper.accessor((r) => r.res.efficiency, { id: 'eff', header: 'Eff %', cell: (c) => c.getValue().toFixed(1) }),
  helper.accessor((r) => r.res.forgeScore, {
    id: 'forge', header: 'Forge',
    // chip colours from the guide: 88+ high, 72+ mid
    cell: (c) => <span className={c.getValue() >= 88 ? 'text-emerald-300' : c.getValue() >= 72 ? 'text-amber-200' : 'text-slate-400'}>{c.getValue()}</span>,
  }),
  helper.accessor((r) => r.location, {
    id: 'location', header: 'Location',
    cell: (c) => <span className={c.getValue() === 'Inventory' ? 'text-slate-400' : ''}>{c.getValue()}{c.row.original.rune.locked && ' 🔒'}</span>,
  }),
])

const chipClass = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs ${on ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-700 hover:bg-slate-800'}`

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs">
      {label}
      <button aria-label={`Remove filter ${label}`} className="text-slate-400 hover:text-white" onClick={onClear}>×</button>
    </span>
  )
}

function describe(k: keyof RuneFilters, f: RuneFilters): string | null {
  switch (k) {
    case 'set': return f.set ? `Set: ${f.set}` : null
    case 'slot': return f.slot ? `Slot ${f.slot}` : null
    case 'role': return f.role ? `Role: ${f.role}` : null
    case 'effMin': return f.effMin !== undefined ? `Eff ≥ ${f.effMin}%` : null
    case 'effMax': return f.effMax !== undefined && Number.isFinite(f.effMax) ? `Eff < ${f.effMax}%` : null
    case 'spdMin': return f.spdMin !== undefined ? `SPD subs ≥ ${f.spdMin}` : null
    case 'spdMax': return f.spdMax !== undefined && Number.isFinite(f.spdMax) ? `SPD subs < ${f.spdMax}` : null
    default: return null
  }
}

export function RuneTable() {
  const account = useAppStore((s) => s.account)!
  const analysis = useAppStore((s) => s.analysis)!
  const [params, setParams] = useSearchParams()
  const f = useMemo(() => parseFilters(params), [params])
  const [showAll, setShowAll] = useState(false)

  const setFilters = (next: RuneFilters) => setParams(toParams(next), { replace: true })
  const patch = (p: Partial<RuneFilters>) => setFilters({ ...f, ...p })
  const clear = (...keys: (keyof RuneFilters)[]) => {
    const next = { ...f }
    for (const k of keys) delete next[k]
    setFilters(next)
  }

  const allRows = useMemo(() => buildRows(account, analysis), [account, analysis])
  const q = useDeferredValue(f.q)
  const rows = useMemo(() => allRows.filter((r) => matches(r, { ...f, q })), [allRows, f, q])
  // verdict chip counts respect every filter except the verdict itself
  const verdictCounts = useMemo(() => {
    const c = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<Verdict, number>
    for (const r of allRows) if (matches(r, { ...f, q, verdict: undefined })) c[r.res.verdict]++
    return c
  }, [allRows, f, q])

  const shown = showAll ? rows : rows.slice(0, PAGE)
  const table = useTable({ features, columns, data: shown, initialState: { sorting: [] } })

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([rowsToCsv(rows)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'runes.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const extra = (['set', 'slot', 'role', 'effMin', 'effMax', 'spdMin', 'spdMax'] as const)
    .map((k) => [k, describe(k, f)] as const).filter(([, l]) => l)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search" placeholder="Search set, stat, role, monster…" value={f.q ?? ''}
          onChange={(e) => patch({ q: e.target.value || undefined })}
          className="w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <button className={chipClass(f.loc === 'inv')} onClick={() => patch({ loc: f.loc === 'inv' ? undefined : 'inv' })}>Inventory</button>
        <button className={chipClass(f.loc === 'eq')} onClick={() => patch({ loc: f.loc === 'eq' ? undefined : 'eq' })}>Equipped</button>
        <span className="mx-1 text-slate-700">|</span>
        {VERDICTS.map((v) => (
          <button key={v} className={chipClass(f.verdict === v)} onClick={() => patch({ verdict: f.verdict === v ? undefined : v })}>
            <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: VERDICT_COLOR[v] }} />
            {v} {verdictCounts[v]}
          </button>
        ))}
        <button onClick={exportCsv} className="ml-auto rounded-md border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800">Export CSV</button>
      </div>
      {extra.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {extra.map(([k, label]) => (
            <ActiveChip key={k} label={label!} onClear={() => clear(k)} />
          ))}
          <button className="text-xs text-slate-400 underline" onClick={() => setFilters({})}>Clear all</button>
        </div>
      )}
      <div className="text-sm text-slate-400">
        {rows.length.toLocaleString()} of {allRows.length.toLocaleString()} runes
        {rows.length > shown.length && (
          <> · showing {shown.length} <button className="underline" onClick={() => setShowAll(true)}>Load all</button></>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => {
                  const sorted = h.column.getIsSorted()
                  return (
                    <th key={h.id} className="whitespace-nowrap px-2 py-2 font-normal">
                      {h.column.getCanSort() ? (
                        <button className="uppercase hover:text-white" onClick={h.column.getToggleSortingHandler()}>
                          <table.FlexRender header={h} />{sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : ''}
                        </button>
                      ) : <table.FlexRender header={h} />}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800 align-top hover:bg-slate-900/60">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-1.5"><table.FlexRender cell={cell} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

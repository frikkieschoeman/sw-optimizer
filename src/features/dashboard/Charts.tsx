import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { VERDICTS, cellKey, type Bin, type Heatmap, type Verdict, type VerdictCounts } from '../../engine'
import { VERDICT_COLOR } from '../../components/colors'
import { runesLink, type RuneFilters } from '../runes/filters'

const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }

export function VerdictDonut({ inventory, equipped }: { inventory: VerdictCounts; equipped: VerdictCounts }) {
  const nav = useNavigate()
  const ring = (c: VerdictCounts, loc: 'inv' | 'eq') =>
    VERDICTS.filter((v) => c[v] > 0).map((v) => ({ name: v, value: c[v], loc }))
  const click = (d: { name?: string; loc?: 'inv' | 'eq' }) =>
    nav(runesLink({ verdict: d.name as Verdict, loc: d.loc }))
  return (
    <div className="h-72" role="img" aria-label="Verdict donut: inner ring inventory, outer ring equipped">
      <ResponsiveContainer>
        <PieChart>
          <Pie isAnimationActive={false} data={ring(inventory, 'inv')} dataKey="value" innerRadius="30%" outerRadius="60%" stroke="#0f172a" onClick={click}>
            {ring(inventory, 'inv').map((d) => <Cell key={d.name} fill={VERDICT_COLOR[d.name as Verdict]} cursor="pointer" />)}
          </Pie>
          <Pie isAnimationActive={false} data={ring(equipped, 'eq')} dataKey="value" innerRadius="64%" outerRadius="90%" stroke="#0f172a" onClick={click}>
            {ring(equipped, 'eq').map((d) => <Cell key={d.name} fill={VERDICT_COLOR[d.name as Verdict]} cursor="pointer" />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VerdictLegend({ inventory, equipped }: { inventory: VerdictCounts; equipped: VerdictCounts }) {
  const nav = useNavigate()
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-slate-400">
        <tr><th className="text-left font-normal">Verdict</th><th className="text-right font-normal">Inventory</th><th className="text-right font-normal">Equipped</th></tr>
      </thead>
      <tbody>
        {VERDICTS.map((v) => (
          <tr key={v} className="border-t border-slate-800">
            <td className="py-1"><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: VERDICT_COLOR[v] }} />{v}</td>
            {([['inv', inventory], ['eq', equipped]] as const).map(([loc, c]) => (
              <td key={loc} className="text-right tabular-nums">
                {c[v] ? <button className="hover:underline" onClick={() => nav(runesLink({ verdict: v, loc }))}>{c[v]}</button> : <span className="text-slate-600">0</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SellHeatmap({ heat }: { heat: Heatmap }) {
  const nav = useNavigate()
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead className="text-xs text-slate-400">
          <tr><th />{[1, 2, 3, 4, 5, 6].map((s) => <th key={s} className="px-1 font-normal">Slot {s}</th>)}</tr>
        </thead>
        <tbody>
          {heat.sets.map((set) => (
            <tr key={set}>
              <td className="pr-3 text-right text-slate-300">{set}</td>
              {[1, 2, 3, 4, 5, 6].map((slot) => {
                const n = heat.cells.get(cellKey(set, slot)) ?? 0
                const a = heat.max ? n / heat.max : 0
                return (
                  <td key={slot} className="p-0.5">
                    <button
                      disabled={!n}
                      title={`${set} slot ${slot}: ${n} Sell`}
                      onClick={() => nav(runesLink({ verdict: 'Sell', set, slot }))}
                      className="grid h-8 w-16 place-items-center rounded tabular-nums disabled:cursor-default"
                      style={{ background: n ? `rgba(248,113,113,${0.15 + a * 0.85})` : '#0f172a', color: a > 0.55 ? '#450a0a' : '#cbd5e1' }}
                    >{n || ''}</button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StackedHistogram({ bins, unit, filter }: {
  bins: Bin[]; unit: string; filter: (b: Bin) => RuneFilters
}) {
  const nav = useNavigate()
  const data = bins.map((b) => ({ ...b.counts, label: b.label, bin: b }))
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -16, right: 8 }}>
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} unit={unit} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1e293b' }} />
          {VERDICTS.map((v) => (
            <Bar key={v} isAnimationActive={false} dataKey={v} stackId="a" fill={VERDICT_COLOR[v]} cursor="pointer"
              onClick={(d) => nav(runesLink({ ...filter(d.payload.bin as Bin), verdict: v }))} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

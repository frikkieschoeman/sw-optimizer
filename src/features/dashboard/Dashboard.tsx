import { useMemo } from 'react'
import {
  efficiencyHistogram, sellHeatmap, sellMana, spdSubHistogram, verdictCounts,
} from '../../engine'
import { useAppStore } from '../../store/useAppStore'
import { Controls } from './Controls'
import { ProgressionCard } from './ProgressionCard'
import { SellHeatmap, StackedHistogram, VerdictDonut, VerdictLegend } from './Charts'

const Card = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-slate-900 p-4">
    <h2 className="font-medium">{title}</h2>
    {note && <p className="mb-3 text-xs text-slate-400">{note}</p>}
    {children}
  </section>
)

export function Dashboard() {
  const account = useAppStore((s) => s.account)!
  const analysis = useAppStore((s) => s.analysis)!
  const d = useMemo(() => {
    const { results } = analysis
    return {
      counts: verdictCounts(account, results),
      mana: sellMana(account, results),
      heat: sellHeatmap(account, results),
      eff: efficiencyHistogram(account, results),
      spd: spdSubHistogram(account, results),
    }
  }, [account, analysis])
  const sellCount = d.counts.inventory.Sell

  return (
    <div className="space-y-4">
      <Controls />
      <ProgressionCard />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Verdicts" note="Inner ring: inventory. Outer ring: equipped. Click a slice to filter the rune table.">
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <VerdictDonut {...d.counts} />
            <VerdictLegend {...d.counts} />
          </div>
        </Card>
        <Card title="Selling everything marked Sell">
          <div className="text-4xl font-semibold tabular-nums">{d.mana.toLocaleString()}</div>
          <div className="text-sm text-slate-400">mana from {sellCount.toLocaleString()} inventory runes</div>
        </Card>
      </div>
      <Card title="Where the junk piles up" note="Sell count per set and slot (inventory). Click a cell to open those runes.">
        <SellHeatmap heat={d.heat} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Efficiency" note="Runes per 5% efficiency bin, coloured by verdict.">
          <StackedHistogram bins={d.eff} unit="%" filter={(b) => ({ effMin: b.from, effMax: b.to })} />
        </Card>
        <Card title="SPD on substats" note="Roll plus grind, innate not counted.">
          <StackedHistogram bins={d.spd} unit="" filter={(b) => ({ spdMin: b.from, spdMax: b.to })} />
        </Card>
      </div>
    </div>
  )
}

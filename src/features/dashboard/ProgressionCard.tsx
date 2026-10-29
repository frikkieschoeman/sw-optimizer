import type { ProgressionBar } from '../../engine'
import { useAppStore } from '../../store/useAppStore'

function Bar({ label, bar, unit, hint }: { label: string; bar: ProgressionBar; unit: string; hint: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{bar.value.toFixed(1)} / {bar.max}</span>
      </div>
      <div className="mt-1 h-2 rounded bg-slate-800">
        <div className="h-2 rounded bg-emerald-500" style={{ width: `${(bar.value / bar.max) * 100}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-400">{bar.count} {unit} · {hint}</div>
    </div>
  )
}

export function ProgressionCard() {
  const p = useAppStore((s) => s.analysis!.progression)
  const { stage, setStage } = useAppStore()
  return (
    <section className="rounded-xl bg-slate-900 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Account progression</h2>
        <div className="text-sm text-slate-300">
          Score <b className="text-xl text-slate-50">{p.total.toFixed(1)}</b> / 100 · suggests <b>{p.suggestedStage}</b>
          {stage !== p.suggestedStage && (
            <button className="ml-2 rounded border border-slate-600 px-2 py-0.5 text-xs hover:bg-slate-800"
              onClick={() => setStage(p.suggestedStage)}>Apply suggestion</button>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Bar label="Speed depth" bar={p.speedDepth} unit="runes with 18+ SPD subs and 60%+ eff" hint={`full at ${p.speedDepth.full}`} />
        <Bar label="Power depth" bar={p.powerDepth} unit="6★ runes at +15" hint={`full at ${p.powerDepth.full}`} />
        <Bar label="Elite quality" bar={p.eliteQuality} unit={`best runes, avg ${p.eliteQuality.avgTop50.toFixed(1)}%`} hint="counts above 80%, full at 105%" />
        <Bar label="Roster depth" bar={p.rosterDepth} unit="level 40 units with six +15 runes" hint={`full at ${p.rosterDepth.full}`} />
      </div>
    </section>
  )
}

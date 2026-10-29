import { useState, type ReactNode } from 'react'
import { SET_BY_ID, type RulesConfig, type Stat } from '../../engine'
import { effectiveRules, useAppStore } from '../../store/useAppStore'

const STATS: Stat[] = ['SPD', 'HP%', 'ATK%', 'DEF%', 'CRate', 'CDmg', 'RES', 'ACC', 'HP', 'ATK', 'DEF']
const PCT_STATS: Stat[] = ['SPD', 'HP%', 'ATK%', 'DEF%', 'CRate', 'CDmg', 'RES', 'ACC']
const SETS = Object.values(SET_BY_ID)

const input = 'w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm tabular-nums'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-slate-900 p-4">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mb-3 text-xs text-slate-400">{hint}</p>}
      {children}
    </section>
  )
}

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <input type="number" step={step} value={value} className={input}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

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

export function Rules() {
  const store = useAppStore()
  const [draft, setDraft] = useState<RulesConfig>(() => structuredClone(effectiveRules(store)))
  const [saved, setSaved] = useState(false)
  const edit = (fn: (d: RulesConfig) => void) => {
    const next = structuredClone(draft)
    fn(next)
    setDraft(next)
    setSaved(false)
  }

  const save = () => { store.saveCustomRules(draft); setSaved(true) }
  const reset = () => {
    if (!confirm('Reset to defaults? This drops your custom rules and sets Stage to Mid and Strictness to 4.')) return
    store.resetRules()
    setDraft(structuredClone(effectiveRules(useAppStore.getState())))
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-12 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/95 p-3 backdrop-blur">
        <div className="flex-1 text-sm text-slate-300">
          {store.customRules ? 'Custom rules are active.' : `Showing the ${store.stage} / strictness ${store.strictness} preset.`}{' '}
          Edits apply when you press Save &amp; Recalculate. Changing Stage or Strictness on the Dashboard switches back to a preset.
        </div>
        {saved && <span className="text-sm text-emerald-400">Saved, verdicts recalculated.</span>}
        <button onClick={save} className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400">Save &amp; Recalculate</button>
        <button onClick={reset} className="rounded-md border border-slate-600 px-4 py-1.5 text-sm hover:bg-slate-800">Reset to defaults</button>
      </div>

      <Section title="High-roll anchors and God rolls" hint="A good sub at or above the anchor passes the +12 check. A single line at or above the God value is kept on its own. Values are totals (roll plus grind).">
        <table className="text-sm">
          <thead className="text-xs text-slate-400"><tr><th /><th className="px-2 font-normal">Anchor</th><th className="px-2 font-normal">God roll</th><th className="px-2 font-normal">Max roll</th><th className="px-2 font-normal">Eff. max</th></tr></thead>
          <tbody>
            {PCT_STATS.map((s) => (
              <tr key={s}>
                <td className="pr-3">{s}</td>
                {(['high', 'god'] as const).map((k) => (
                  <td key={k} className="p-1"><input type="number" className={input} value={draft[k][s] ?? 0} onChange={(e) => edit((d) => { d[k][s] = Number(e.target.value) })} /></td>
                ))}
                {(['rollMax', 'effMax'] as const).map((k) => (
                  <td key={k} className="p-1"><input type="number" className={input} value={draft[k][s]} onChange={(e) => edit((d) => { d[k][s] = Number(e.target.value) })} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Duo rolls" hint="Two stats that are strong together: both minimums must be met.">
        <div className="space-y-1">
          {draft.duos.map(([a, b, x, y], i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <select className={input} value={a} onChange={(e) => edit((d) => { d.duos[i][0] = e.target.value as Stat })}>{STATS.map((s) => <option key={s}>{s}</option>)}</select>
              <input type="number" className={input} value={x} onChange={(e) => edit((d) => { d.duos[i][2] = Number(e.target.value) })} />
              <span>+</span>
              <select className={input} value={b} onChange={(e) => edit((d) => { d.duos[i][1] = e.target.value as Stat })}>{STATS.map((s) => <option key={s}>{s}</option>)}</select>
              <input type="number" className={input} value={y} onChange={(e) => edit((d) => { d.duos[i][3] = Number(e.target.value) })} />
              <button className="text-slate-400 hover:text-white" aria-label="Remove duo" onClick={() => edit((d) => { d.duos.splice(i, 1) })}>×</button>
            </div>
          ))}
          <button className="text-xs text-slate-400 underline" onClick={() => edit((d) => { d.duos.push(['SPD', 'HP%', 14, 16]) })}>Add a duo</button>
        </div>
      </Section>

      <Section title="Role formulas" hint="Roles are checked top to bottom; the first match wins. Good subs count towards the role, bad subs waste rolls, must-have needs at least one, and mains limit slots 2, 4 and 6.">
        <div className="space-y-4">
          {draft.roles.map((role, ri) => (
            <div key={role.name} className="rounded-lg border border-slate-800 p-3">
              <div className="mb-2 font-medium">{ri + 1}. {role.name}</div>
              <div className="grid gap-2 text-sm md:grid-cols-[7rem_1fr]">
                <span className="text-slate-400">Good subs</span><Chips options={STATS} value={role.good} onChange={(v) => edit((d) => { d.roles[ri].good = v })} />
                <span className="text-slate-400">Bad subs</span><Chips options={STATS} value={role.bad} onChange={(v) => edit((d) => { d.roles[ri].bad = v })} />
                <span className="text-slate-400">Must have</span><Chips options={STATS} value={role.must} onChange={(v) => edit((d) => { d.roles[ri].must = v })} />
                {([2, 4, 6] as const).map((slot) => (
                  <div key={slot} className="contents">
                    <span className="text-slate-400">Slot {slot} mains</span>
                    <Chips options={STATS} value={role.mains[slot] ?? []} onChange={(v) => edit((d) => { d.roles[ri].mains[slot] = v })} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Fit thresholds" hint="How strong the substats must be. The stat-strength bar is needBase + needPerRoll x power-up rolls landed (max needRollsCap).">
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Num label="Min useful lines, odd slots" value={draft.minLinesOdd} onChange={(n) => edit((d) => { d.minLinesOdd = n })} />
          <Num label="Min useful lines, even slots" value={draft.minLinesEven} onChange={(n) => edit((d) => { d.minLinesEven = n })} />
          <Num label="Stat-strength bar at +0 (needBase)" step={0.1} value={draft.needBase} onChange={(n) => edit((d) => { d.needBase = n })} />
          <Num label="Bar increase per roll (needPerRoll)" step={0.1} value={draft.needPerRoll} onChange={(n) => edit((d) => { d.needPerRoll = n })} />
          <Num label="Rolls counted (needRollsCap)" value={draft.needRollsCap} onChange={(n) => edit((d) => { d.needRollsCap = n })} />
          <Num label="Tolerated wasted rolls" step={0.1} value={draft.wastedMaxRolls} onChange={(n) => edit((d) => { d.wastedMaxRolls = n })} />
          <Num label="Fit score span" step={0.1} value={draft.scoreSpan} onChange={(n) => edit((d) => { d.scoreSpan = n })} />
          <Num label="Anchor required from level" value={draft.anchorFromLevel} onChange={(n) => edit((d) => { d.anchorFromLevel = n })} />
          <Num label="Relaxed retry: bar reduction" step={0.1} value={draft.relaxedNeedDrop} onChange={(n) => edit((d) => { d.relaxedNeedDrop = n })} />
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">Relaxed retry (one softer second chance)</span>
            <input type="checkbox" className="size-4 accent-emerald-500" checked={draft.relaxedRetry} onChange={(e) => edit((d) => { d.relaxedRetry = e.target.checked })} />
          </label>
        </div>
      </Section>

      <Section title="Verdict levels and Universal" hint="Below the first level a rune is Upgrade, below the second it is Finish, otherwise Keep, Gem, Grind, Reapp or Sell.">
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Num label="Upgrade below level" value={draft.upgradeBelow} onChange={(n) => edit((d) => { d.upgradeBelow = n })} />
          <Num label="Finish below level" value={draft.finishBelow} onChange={(n) => edit((d) => { d.finishBelow = n })} />
          <Num label="Universal: efficiency at or above (%)" value={draft.universalEff} onChange={(n) => edit((d) => { d.universalEff = n })} />
          <Num label="Universal: from level" value={draft.universalFromLevel} onChange={(n) => edit((d) => { d.universalFromLevel = n })} />
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">Sell Hero/Rare without SPD below the Upgrade level</span>
            <input type="checkbox" className="size-4 accent-emerald-500" checked={draft.sellLowGradeWithoutSpd} onChange={(e) => edit((d) => { d.sellLowGradeWithoutSpd = e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">Suggest Gem for un-gemmed flat subs</span>
            <input type="checkbox" className="size-4 accent-emerald-500" checked={draft.gem.enabled} onChange={(e) => edit((d) => { d.gem.enabled = e.target.checked })} />
          </label>
        </div>
      </Section>

      <Section title="Grind" hint="A rune is marked Grind when one grindstone on one of these stats would give it a role. The amounts are what a Legend grindstone adds.">
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Num label="SPD grind adds" value={draft.grind.spdAdd} onChange={(n) => edit((d) => { d.grind.spdAdd = n })} />
          <Num label="HP% / DEF% / ATK% grind adds" value={draft.grind.pctAdd} onChange={(n) => edit((d) => { d.grind.pctAdd = n })} />
          <Num label="Check the grind at level" value={draft.grind.evalLevel} onChange={(n) => edit((d) => { d.grind.evalLevel = n })} />
        </div>
        <div className="mt-2"><div className="mb-1 text-sm text-slate-300">Stats worth grinding</div>
          <Chips options={STATS} value={draft.grind.stats} onChange={(v) => edit((d) => { d.grind.stats = v })} /></div>
      </Section>

      <Section title="Reapp" hint="Legend runes with no role that are worth re-appraising.">
        <div className="space-y-3 text-sm">
          <div><div className="mb-1 text-slate-300">Sets</div><Chips options={SETS} value={draft.reapp.sets} onChange={(v) => edit((d) => { d.reapp.sets = v })} /></div>
          <div><div className="mb-1 text-slate-300">Allowed innates</div><Chips options={['none', ...STATS] as const} value={draft.reapp.innates} onChange={(v) => edit((d) => { d.reapp.innates = v })} /></div>
          <div><div className="mb-1 text-slate-300">Allowed mains (even slots)</div><Chips options={STATS} value={draft.reapp.mains} onChange={(v) => edit((d) => { d.reapp.mains = v })} /></div>
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
            <Num label="Efficiency below (%)" value={draft.reapp.effCap} onChange={(n) => edit((d) => { d.reapp.effCap = n })} />
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-300">Allow odd slots (fixed main)</span>
              <input type="checkbox" className="size-4 accent-emerald-500" checked={draft.reapp.allowOddSlots} onChange={(e) => edit((d) => { d.reapp.allowOddSlots = e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-300">Legend only</span>
              <input type="checkbox" className="size-4 accent-emerald-500" checked={draft.reapp.legendOnly} onChange={(e) => edit((d) => { d.reapp.legendOnly = e.target.checked })} />
            </label>
          </div>
        </div>
      </Section>
    </div>
  )
}

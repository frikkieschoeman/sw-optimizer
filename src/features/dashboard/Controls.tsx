import type { Stage, Strictness } from '../../engine'
import { useAppStore } from '../../store/useAppStore'

const STRICT_LABEL = ['', 'Very forgiving', 'Relaxed', 'Balanced', 'Strict', 'Very strict']

export function Controls() {
  const { stage, strictness, customRules, setStage, setStrictness } = useAppStore()
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl bg-slate-900 p-4">
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Stage</div>
        <div className="flex overflow-hidden rounded-md border border-slate-700">
          {(['Early', 'Mid', 'Late'] as Stage[]).map((s) => (
            <button key={s} onClick={() => setStage(s)}
              className={`px-4 py-1.5 text-sm ${stage === s ? 'bg-emerald-500 text-slate-950' : 'hover:bg-slate-800'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <label className="min-w-64 flex-1">
        <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-slate-400">
          <span>Strictness</span>
          <span className="normal-case text-slate-200">{strictness} · {STRICT_LABEL[strictness]}</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={strictness} className="w-full accent-emerald-500"
          onChange={(e) => setStrictness(Number(e.target.value) as Strictness)} />
      </label>
      {customRules && (
        <p className="w-full text-xs text-amber-300">
          Custom rules from the Rules page are active. Changing Stage or Strictness switches back to a preset.
        </p>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { unitSummaries, type SlotRune, type UnitSummary } from '../../engine'
import { VERDICT_COLOR } from '../../components/colors'
import { monsterName } from '../runes/rows'
import { runesLink } from '../runes/filters'
import { useAppStore } from '../../store/useAppStore'
import monsters from '../../data/monsters.json'

type ColorBy = 'verdict' | 'efficiency'
type SortBy = 'replace' | 'eff' | 'spd' | 'name'

const REMOTE_IMG = 'https://swarfarm.com/static/herders/images/monsters/'
/** Bundled 64px icons (npm run fetch-monsters); the SWARFARM original is the fallback when one is missing. */
const localIcon = (image: string) => `${import.meta.env.BASE_URL}monsters/${image.replace(/\.png$/, '.webp')}`
const info = (id: number) => (monsters as Record<string, { image: string } | undefined>)[id]

/** Efficiency 50% -> red, 100% -> green. */
const effColor = (e: number) => `hsl(${Math.max(0, Math.min(1, (e - 50) / 50)) * 120} 60% 45%)`

function Tile({ slot, sr, by }: { slot: number; sr: SlotRune | null; by: ColorBy }) {
  if (!sr) return <div className="grid h-14 place-items-center rounded bg-slate-800 text-xs text-slate-500">S{slot}</div>
  const { rune, res } = sr
  const bg = by === 'verdict' ? VERDICT_COLOR[res.verdict] : effColor(res.efficiency)
  return (
    <Link to={runesLink({ set: rune.set, slot: rune.slot, loc: 'eq' })}
      title={`${rune.set} ${rune.main.stat} ${rune.main.value} · ${res.verdict}: ${res.reason}`}
      className="flex h-14 flex-col items-center justify-center rounded text-xs font-medium text-slate-950 hover:ring-2 hover:ring-white"
      style={{ background: bg }}>
      <span>S{slot} +{rune.level}</span>
      <span className="opacity-80">{res.efficiency.toFixed(0)}%</span>
    </Link>
  )
}

function Card({ s, by }: { s: UnitSummary; by: ColorBy }) {
  const name = monsterName(s.unit.masterId)
  const img = info(s.unit.masterId)?.image
  const { spd } = s
  const hasReplace = s.replaceSlots.length > 0
  return (
    <article className={`rounded-xl border p-3 ${hasReplace ? 'border-orange-500/70 bg-orange-950/20' : 'border-slate-800 bg-slate-900'}`}>
      <header className="mb-2 flex items-center gap-3">
        {img
          ? <img src={localIcon(img)} alt="" loading="lazy" className="size-10 rounded-full"
              onError={(e) => {
                const el = e.currentTarget
                if (!el.src.startsWith(REMOTE_IMG)) el.src = REMOTE_IMG + img
              }} />
          : <div className="grid size-10 place-items-center rounded-full bg-slate-800 text-sm">{name.replace('Monster #', '#').slice(0, 2)}</div>}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{name}</div>
          <div className="text-xs text-slate-400">{s.unit.stars}★ · lv {s.unit.level}</div>
        </div>
        <div className="text-right text-xs">
          <div title={`base ${spd.base} + runes ${spd.runes} + Swift ${spd.swift} + totem ${spd.totem}`}>
            <b className="text-base text-sky-300">{spd.total}</b> SPD
          </div>
          <div className="text-slate-400">avg {s.avgEfficiency.toFixed(1)}%</div>
        </div>
      </header>
      <div className="grid grid-cols-6 gap-1">
        {s.slots.map((sr, i) => <Tile key={i} slot={i + 1} sr={sr} by={by} />)}
      </div>
      {hasReplace && (
        <div className="mt-2 text-xs text-orange-300">
          Replace slot{s.replaceSlots.length > 1 ? 's' : ''} {s.replaceSlots.join(', ')}
        </div>
      )}
      {s.suggestions.map((sg) => (
        <div key={sg.slot} className="mt-1 text-xs text-slate-300">
          <span className="text-slate-400">Slot {sg.slot} ({sg.current.rune.set}, {sg.current.res.efficiency.toFixed(0)}%) →</span>{' '}
          {sg.better.map((b) => (
            <span key={b.rune.id} className="mr-2" title={b.res.reason}>
              {b.rune.main.stat} +{b.rune.level} {b.res.efficiency.toFixed(0)}% <i className="text-slate-500">{b.res.verdict}</i>
            </span>
          ))}
        </div>
      ))}
    </article>
  )
}

export function Monsters() {
  const account = useAppStore((s) => s.account)!
  const analysis = useAppStore((s) => s.analysis)!
  const { totemSpdPct, setTotem } = useAppStore()
  const [by, setBy] = useState<ColorBy>('verdict')
  const [sort, setSort] = useState<SortBy>('replace')
  const [q, setQ] = useState('')
  const [onlyReplace, setOnlyReplace] = useState(false)

  const all = useMemo(() => unitSummaries(account, analysis.results, totemSpdPct), [account, analysis, totemSpdPct])
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const out = all.filter((s) =>
      s.unit.runeIds.length > 0 &&
      (!onlyReplace || s.replaceSlots.length > 0) &&
      (!term || monsterName(s.unit.masterId).toLowerCase().includes(term)))
    const cmp: Record<SortBy, (a: UnitSummary, b: UnitSummary) => number> = {
      replace: (a, b) => b.replaceSlots.length - a.replaceSlots.length || a.avgEfficiency - b.avgEfficiency,
      eff: (a, b) => b.avgEfficiency - a.avgEfficiency,
      spd: (a, b) => b.spd.total - a.spd.total,
      name: (a, b) => monsterName(a.unit.masterId).localeCompare(monsterName(b.unit.masterId)),
    }
    return out.sort(cmp[sort])
  }, [all, q, onlyReplace, sort])

  const withReplace = all.filter((s) => s.replaceSlots.length > 0).length
  const select = 'rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <input type="search" placeholder="Search monster…" value={q} onChange={(e) => setQ(e.target.value)}
          className="w-52 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5" />
        <label className="flex items-center gap-1">Colour by
          <select className={select} value={by} onChange={(e) => setBy(e.target.value as ColorBy)}>
            <option value="verdict">Verdict</option><option value="efficiency">Efficiency</option>
          </select>
        </label>
        <label className="flex items-center gap-1">Sort
          <select className={select} value={sort} onChange={(e) => setSort(e.target.value as SortBy)}>
            <option value="replace">Replace first</option><option value="eff">Avg efficiency</option>
            <option value="spd">Total SPD</option><option value="name">Name</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={onlyReplace} onChange={(e) => setOnlyReplace(e.target.checked)} className="accent-orange-500" />
          Only units with Replace runes ({withReplace})
        </label>
        <label className="ml-auto flex items-center gap-1" title="Sky Tribe Totem SPD bonus, percent of base SPD. Not read from the export.">
          Totem SPD %
          <input type="number" min={0} max={100} value={totemSpdPct} onChange={(e) => setTotem(Number(e.target.value))}
            className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1" />
        </label>
      </div>
      <p className="text-xs text-slate-400">{list.length} units. SPD = base + runes + Swift set + totem; hover it for the breakdown.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => <Card key={s.unit.id} s={s} by={by} />)}
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './features/dashboard/Dashboard'
import { RuneTable } from './features/runes/RuneTable'
import { Cleanup } from './features/cleanup/Cleanup'
import { Monsters } from './features/monsters/Monsters'
import { Optimizer } from './features/optimizer/Optimizer'
import { Compare } from './features/compare/Compare'
import { Rules } from './features/rules/Rules'
import { Importer } from './features/import/Importer'
import { useAppStore } from './store/useAppStore'

const NAV = [
  ['/', 'Dashboard'], ['/runes', 'Runes'], ['/cleanup', 'Cleanup'],
  ['/monsters', 'Monsters'], ['/optimizer', 'Optimizer'], ['/compare', 'Compare'], ['/rules', 'Rules'],
] as const


export default function App() {
  const { ready, account, init } = useAppStore()
  useEffect(() => { void init() }, [init])
  if (!ready) return null

  return (
    <HashRouter>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-800 bg-slate-950/90 px-4 py-2 backdrop-blur">
        <b>SW Rune Optimizer</b>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `rounded px-3 py-1 ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3"><Importer /></div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        {!account ? (
          <div className="mt-24 flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-semibold">Load your SWEX export</h1>
            <p className="max-w-md text-slate-400">Drop the .json anywhere on this page, or pick it. It is read in your browser and saved in this browser only. Nothing is uploaded.</p>
            <Importer large />
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runes" element={<RuneTable />} />
            <Route path="/cleanup" element={<Cleanup />} />
            <Route path="/monsters" element={<Monsters />} />
            <Route path="/optimizer" element={<Optimizer />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
    </HashRouter>
  )
}

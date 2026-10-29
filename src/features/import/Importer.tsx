import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'

/** File picker button plus drag and drop anywhere on the page. */
export function Importer({ large = false }: { large?: boolean }) {
  const importText = useAppStore((s) => s.importText)
  const error = useAppStore((s) => s.error)
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const load = async (file?: File) => {
    if (file) await importText(await file.text())
  }

  useEffect(() => {
    const over = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDragging(false) }
    const drop = (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void load(e.dataTransfer?.files[0])
    }
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  })

  return (
    <>
      <button
        onClick={() => input.current?.click()}
        className={large
          ? 'rounded-lg bg-emerald-500 px-5 py-3 font-medium text-slate-950 hover:bg-emerald-400'
          : 'rounded-md border border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-800'}
      >
        {large ? 'Choose SWEX export' : 'Load export'}
      </button>
      <input
        ref={input} type="file" accept=".json,application/json" hidden data-testid="file-input"
        onChange={(e) => { void load(e.target.files?.[0]); e.target.value = '' }}
      />
      {error && <span className="text-sm text-red-400">{error}</span>}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center border-4 border-dashed border-emerald-400 bg-slate-950/80 text-xl">
          Drop the SWEX .json to load it
        </div>
      )}
    </>
  )
}

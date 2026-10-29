import { useCallback, useEffect, useRef, useState } from 'react'
import type { OptimizerInput, OptimizerResult } from '../../engine'

export type OptimizerRun =
  | { status: 'idle' }
  | { status: 'running'; startedAt: number }
  | { status: 'done'; result: OptimizerResult; ms: number }
  | { status: 'error'; message: string }

/** Runs the solver in a Web Worker; starting a new run or stopping discards the old one. */
export function useOptimizer() {
  const [run, setRun] = useState<OptimizerRun>({ status: 'idle' })
  const worker = useRef<Worker | null>(null)

  const stop = useCallback(() => {
    worker.current?.terminate()
    worker.current = null
    setRun({ status: 'idle' })
  }, [])

  const start = useCallback((input: OptimizerInput) => {
    worker.current?.terminate()
    const w = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    const startedAt = Date.now()
    setRun({ status: 'running', startedAt })
    w.onmessage = (e: MessageEvent<OptimizerResult>) => {
      setRun({ status: 'done', result: e.data, ms: Date.now() - startedAt })
      w.terminate()
      worker.current = null
    }
    w.onerror = (e) => {
      setRun({ status: 'error', message: e.message || 'The optimizer crashed' })
      w.terminate()
      worker.current = null
    }
    w.postMessage(input)
  }, [])

  useEffect(() => () => worker.current?.terminate(), [])
  return { run, start, stop }
}

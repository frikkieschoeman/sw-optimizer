import { optimize, type OptimizerInput, type OptimizerResult } from '../../engine'

/** The search runs here so the page stays responsive; one request in, one result out. */
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<OptimizerInput>) => void) | null
  postMessage: (m: OptimizerResult) => void
}
ctx.onmessage = (e) => ctx.postMessage(optimize(e.data))

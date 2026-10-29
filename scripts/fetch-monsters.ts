// One-off: fetch the SWARFARM bestiary and its icons so the app works offline.
//   npm run fetch-monsters            data + any icons not already in public/monsters
//   npm run fetch-monsters -- --data  data only
// Output: src/data/monsters.json  { [com2us_id]: { name, element, stars, image } }, keyed by unit_master_id
//         public/monsters/<name>.webp  64x64 icons (about 1.3 KB each), image = the SWARFARM PNG name
// A unit_master_id is `com2us_id` on SWARFARM (e.g. 17011 = awakened family 170, element 11).
// Icons are resized with ImageMagick (`convert`); without it they are saved as the original PNG.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

interface Monster {
  com2us_id: number
  name: string
  element: string
  natural_stars: number
  image_filename: string
}

const ICON_URL = 'https://swarfarm.com/static/herders/images/monsters/'
const ICON_DIR = 'public/monsters'
const dataOnly = process.argv.includes('--data')

const out: Record<number, { name: string; element: string; stars: number; image: string }> = {}
let url: string | null = 'https://swarfarm.com/api/v2/monsters/?format=json&page_size=500'
let pages = 0
while (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SWARFARM returned ${res.status} for ${url}`)
  const body = (await res.json()) as { next: string | null; results: Monster[] }
  for (const m of body.results) {
    out[m.com2us_id] = {
      name: m.name,
      element: m.element,
      stars: m.natural_stars,
      image: m.image_filename,
    }
  }
  url = body.next
  pages++
}
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/monsters.json', JSON.stringify(out))
console.log(`Wrote ${Object.keys(out).length} monsters from ${pages} pages to src/data/monsters.json`)
if (dataOnly) process.exit(0)

let hasConvert = true
try { execFileSync('convert', ['-version'], { stdio: 'ignore' }) } catch { hasConvert = false }
if (!hasConvert) console.warn('ImageMagick `convert` not found: icons are saved as full-size PNGs (about 20 KB each)')

mkdirSync(ICON_DIR, { recursive: true })
const names = [...new Set(Object.values(out).map((m) => m.image).filter(Boolean))]
const target = (n: string) => `${ICON_DIR}/${n.replace(/\.png$/, hasConvert ? '.webp' : '.png')}`
const todo = names.filter((n) => !existsSync(target(n)))
const present = names.length - todo.length
let done = 0
let failed = 0
async function worker() {
  for (let n = todo.pop(); n; n = todo.pop()) {
    try {
      const res = await fetch(ICON_URL + n)
      if (!res.ok) throw new Error(String(res.status))
      const png = Buffer.from(await res.arrayBuffer())
      if (hasConvert) {
        const webp = execFileSync('convert', ['png:-', '-resize', '64x64', '-quality', '70', 'webp:-'], { input: png, maxBuffer: 1 << 20 })
        writeFileSync(target(n), webp)
      } else writeFileSync(target(n), png)
      done++
    } catch (e) {
      failed++
      console.warn(`skipped ${n}: ${e instanceof Error ? e.message : e}`)
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker))
console.log(`Icons: ${done} downloaded, ${failed} failed, ${present} already present`)

// One-off: fetch the SWARFARM bestiary into src/data/monsters.json so the app works offline.
//   npm run fetch-monsters
// Output: { [com2us_id]: { name, element, stars, image } }, keyed by unit_master_id.
// A unit_master_id is `com2us_id` on SWARFARM (e.g. 17011 = awakened family 170, element 11).
import { mkdirSync, writeFileSync } from 'node:fs'

interface Monster {
  com2us_id: number
  name: string
  element: string
  natural_stars: number
  image_filename: string
}

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

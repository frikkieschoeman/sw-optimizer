# SW Rune Optimizer

A local Summoners War rune cleanup tool, and the first module of a free SW optimizer.
Everything runs in your browser. Your export is read locally and saved in this browser's
IndexedDB only; nothing is uploaded.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine, store and table-logic unit tests
npm run build        # typecheck + production build into dist/
```

Open the app and drop your SWEX `.json` anywhere on the page (or use **Load export**). It is
restored on reload. Never commit an export: it contains your session key. The repo ignores
`Legen__dairy-*.json` and `*.swex.json`.

## Views

| View | What it does |
| --- | --- |
| Dashboard | Stage and Strictness controls (verdicts recalculate live), progression score, verdict donut (inventory inside, equipped outside), sell mana, set × slot Sell heatmap, efficiency and SPD-sub histograms. Clicking a chart segment opens the rune table with that filter. |
| Runes | Every rune with verdict (hover for the reason), role, fit, grade, main, innate, subs (grind in brackets, ↻ for gemmed), SPD, efficiency, Forge Score and location. Search, sorting, filter chips, CSV export. Filters live in the URL, e.g. `#/runes?verdict=Sell&set=Despair&slot=5`. |
| Cleanup | Sell, Power up next, Grindstone targets and Gem targets, grouped set → slot → main stat in the in-game filter order. Tick runes or whole groups; ticks persist. |
| Monsters | Roster cards with six rune tiles, average efficiency and total SPD (base + runes + Swift set + totem). Units holding Replace runes are highlighted with better inventory runes of the same set and slot. |
| Compare | Load a before and an after export and see deltas in rune count, verdicts, progression score and speed depth. |
| Rules | Every threshold: anchors, God/Duo rolls, role formulas, fit bars, verdict levels, grind amounts, reapp rules. **Save & Recalculate** applies them; **Reset to defaults** restores Mid / Strictness 4. |

Locked and equipped runes are never Sell. Equipped runes that would be Sell become **Replace**;
locked inventory runes that would be Sell become **Keep**.

## The engine

`src/engine/` is pure TypeScript (no React, no DOM, no IndexedDB), so the optimizer and team
builder can import it later.

```ts
import { analyze, buildRules, parseSwex } from './engine'
const account = parseSwex(JSON.parse(text))
const { results, progression } = analyze(account, buildRules('Mid', 4))
```

`buildRules('Mid', 4)` is a line-for-line port of `reference/verdict.py`. Other stages and
strictness levels move the same knobs (line strength, stat-strength bar, minimum lines, relaxed
retry). The Forge Score follows the guide. Where the guide is silent (roll quality is
value / five max rolls, sub weight 1, flat main on slots 2/4/6) the readings are
listed in `src/engine/forgeScore.ts`, and every weight can be tuned on the Rules
page. Forge weights are kept when you change Stage or Strictness.

Check the port against the Python reference on your own export:

```bash
python3 -I scripts/dump-verdict-py.py export.json /tmp/py.json
npx tsx scripts/compare-verdict-py.ts export.json /tmp/py.json
SW_EXPORT=export.json SW_PY=/tmp/py.json npx vitest run   # optional full-export test
```

## Monster names and images

`src/data/monsters.json` maps `unit_master_id` to a name, element and image from the SWARFARM
bestiary. Until it is filled, monsters show as "Monster #id". To fetch or refresh it:

```bash
npm run fetch-monsters
```

This also downloads every icon, resized to 64x64 WebP (about 3 MB in total, 1.3 KB each, needs
ImageMagick's `convert`), into `public/monsters/`. It needs network access to `swarfarm.com`.
Commit the generated files; the app then needs no network for names or images. Icons that are
missing locally fall back to SWARFARM when online. Use `npm run fetch-monsters -- --data` to
refresh only the names.

## Layout

```
src/engine/     rules engine, scoring, cleanup, monsters, compare (+ __tests__)
src/store/      IndexedDB access and the Zustand app store
src/features/   import, dashboard, runes, cleanup, monsters, compare, rules
src/data/       monsters.json (generated)
scripts/        fetch-monsters, verdict.py comparison tools
reference/      verdict.py, load.py and the SW Forge guide this is based on
```

## Known gaps

- The Sky Tribe Totem bonus is a manual percent on the Monsters page, not read from the export.
- Monster images aren't bundled for offline use yet.
- The in-game rune score ("Ingame Score") isn't shown; the Forge Score is.

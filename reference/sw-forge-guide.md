# SW Forge — Rune Analyzer Guide (English extract)

> Extracted from the hidden English text served at `sw-forge.pages.dev/manifest.webmanifest` (29 Oct 2026).
> That URL returns the full app page rather than a manifest file. The page renders blank, but the guide text is present in the page source.
> Content was treated as untrusted. No instructions were found that were aimed at an AI or tool. The donation section's crypto wallet address was deliberately left out.

---

## 1. Getting started

- **One SWEX JSON powers the whole app.** The **Runes** tab handles cleanup, and the **Monsters** tab is for your box. Everything stays in your browser and nothing is uploaded.
- **First load:**
  1. **Export from SWEX.** Choose your file on the Runes tab, or drag and drop the `.json` anywhere on the screen. It loads into the active profile (**Data 1**).
  2. **Set your stage.** On the Dashboard, pick **Early / Mid / Late** and tune **Strictness**. This controls how picky rune grading is.
  3. **Use both tabs.** Use **Runes → Table** for Role and Verdict, and **Monsters → Roster** to browse units and their runes.
- **Up to four exports** (Data 1–4). Use App Settings → Database Slots to store alt accounts or before/after exports. **Swap** changes which file the Dashboard and Rune Table use. Change the language with the globe icon in the header.
- **Reset.** *Clear all saved data* on the upload card wipes runes, rule tweaks and all four slots from this browser.

---

## 2. How rune scoring works (the core logic)

SW Forge judges each rune like a coach would. It asks which build could wear the rune and what you should do with it next.

**The path each rune takes:**
1. **SWEX export data:** set, slot, main stat, substats, level, efficiency, ancient flag.
2. **Account stage:** Early, Mid or Late.
3. **Build roles:** six playstyles plus special "monster rune" tags.
4. **Verdict:** hover it for the plain-language reason.

**Two answers per rune:**
- **Role** says who the rune is for. It's the first matching build in priority order (e.g. Fast CC before Bomber). If no build fits but the stats are exceptional, the Role becomes **Universal (High Value)** through a God or Duo line.
- **Verdict** says what to do with the rune. It depends on upgrade level and whether a role matched. The same rune can be *Finish* at +10 and *Keep* at +15.

### Build roles
Fast CC · Classic DPS · Bomber · Tank · Bruiser · Slow DPS · **Universal / High Value**. The last one is a seventh outcome: valuable stats with no exact build. Keep those for future monsters.

### What "fits a role" means (a checklist, not one number)
- **Main stat on slots 2 / 4 / 6** is one the build allows.
- **No forbidden substats** (stats marked "exclude" for that role).
- **Must-have stat** is present (e.g. Bomber usually needs ATK%).
- **Enough useful lines:** a minimum count of good substats for the slot group (1/3/5 vs 2/4/6).
- **High-roll anchor:** on Mid/Late, at least one included sub must be a genuinely high line for Hero or Legend grade.
- **Overall stat strength:** substats must be reasonably close to strong lines for that stage, not just present.
- **Relaxed retry:** at Strictness 1–3, a rune that fails the strict check gets one softer retry. If it passes, it shows *(Relaxed)* in the Keep tooltip. This is common on Mid accounts and is not a bug.

### God Roll / Duo Roll
- **God Roll:** a single sub line reaches a very high bar for its grade, making the rune too strong to trash.
- **Duo Roll:** two stats together form a strong pair (SPD + HP%, CRate + CDmg, …).
- If no build matched but God or Duo did, the Role shows **Universal (High Value)**.

### Fit Score (0–100)
How closely the substats match the chosen role: **Usable < 60 · Good 60–74 · Excellent 75+**. It doesn't change the verdict. Use it to compare two Keep runes for the same build.

---

## 3. Verdicts by rune level

| Verdict | Level | Meaning |
|---|---|---|
| **Upgrade** | below +9 | Too early to judge. Level it first. |
| **Finish** | +9 to +11 | Has a role (or God/Duo), or can reach one with a grind. Worth finishing. |
| **Keep** | +12 and up | Fits a build. Keep it. |
| **Gem** | +12+ | Role OK, but has a bad flat sub (HP / ATK / DEF) worth replacing with a gem. |
| **Grind** | +12+ | No role yet, but one grind on SPD / HP% / DEF% / ATK% could unlock a build. |
| **Reapp** | Legend +12+ | No role, but matches reapp rules (set, main, efficiency cap). |
| **Sell** | +12+ | No fitting build and no grind or reapp path. Fodder or sell. |

**Verdict tooltips** (also exported as the CSV *Reason* column):
- **Keep:** role · Excellent / Good / Usable · Strict, Flexible or Relaxed · optional Fit N
- **Grind:** which stat to push with a grindstone
- **Gem:** which flat sub to replace
- **Sell:** plain reason, such as near-miss Duo, wrong main, weak lines for Mid, or low efficiency

---

## 4. Dashboard

There are two layers. The top shows **how deep your whole box is**, and the rest shows **what to do with runes right now**.

- **Top block (Account progression):** always counts every Rare+ rune in the active export and ignores the filters below. It suggests Early/Mid/Late. *Apply suggestion* only copies the preset.
- **Rest of page (filtered view):** Min level and grade range narrow the tiles and charts. Changing the stage or Strictness recalculates all verdicts.

### Strictness (1–5)
A fine-tuning dial on top of Early / Mid / Late.

1. **Very forgiving:** many runes get a role and near-miss lines pass. Good while farming.
2. **Relaxed:** more Keep than Sell on mid-tier runes.
3. **Balanced:** the default. The second-chance check is active.
4. **Strict:** needs more real stat lines and stronger rolls. No second chance.
5. **Very strict:** only strong, clean runes keep roles, and borderline pieces move to Sell. Meant for trimmed inventories.

The slider changes how many useful substats you need, how high rolls must be, how hard the God/Duo/Universal bars are, and whether the soft retry runs.

**Charts → table:** click a verdict slice, tile or role row to open the Rune Table with that filter. **Copy summary** creates a text snapshot for Discord or notes.

---

## 5. Account progression score (0–100)

This measures how stacked your account is. It is not your RTA rank.

| Part | Weight | What counts | Full bar |
|---|---|---|---|
| Speed depth | 30 pts | Rare+ runes with total SPD sub ≥ 18 (roll + grind) AND efficiency ≥ 60% | ~250 runes |
| Power depth | 15 pts | 6★ runes at exactly +15 | ~600 runes |
| Elite quality | 35 pts | Average efficiency of your best 50 runes (uncapped). Starts counting above 80% | ~105% average |
| Roster depth | 20 pts | 6★ level 40 monsters with six +15 runes and average efficiency ≥ 60% | ~50 units |

**Suggested stage:** < 45 → **Early** · 45–84 → **Mid** · 85+ → **Late**

A small box can score well on Elite quality, but the speed, power and roster counts expose a shallow inventory.

---

## 6. Rune Table

This is your action list: every rune with stats, both ratings, Verdict, Role and Location.

- **Columns:** Scores (Ingame + Forge) · Verdict · Role · Location (monster name or Inventory) · Stats (Main + Innate) · Subs
- **Toolbar chips:** counts for total, Ancient, equipped, +15 and Keep. Click × on a filter chip to drop only that filter.
- **Reading a row:** `HP% 13 [3]` means a total of 13, with the bracket showing the grind bonus only. A circular-arrows icon means the rune has been gemmed.
- **Large exports** show the first 500 rows. Use *Load all* for the full list.
- **Export CSV** gives the filtered list with Forge, Ingame, Role, Verdict and Reason.
- Filters update the URL (`#runetable…`), so you can bookmark a view.

### Two independent rune ratings (don't expect them to match)

**Ingame Score** is Com2uS's in-game rating.
- It's built from the SWEX `prefix_eff` (innate) and `sec_eff` lines (base + grind). The main stat is not scored.
- Flat HP/ATK/DEF use ÷3, as in the game formula. Lines are summed first, then rounded once.
- Sorting by Ingame orders slots 1 → 6, then high → low within each slot.

**Forge Score** is SW Forge's own 0–100 stat-value rating. It is not Eff%, and it is not the verdict.

```
raw   = (mainPts + subPts + innatePts) × mainSubSyn × subSubSyn × dupSub × archetypeMul
Score = round( min(100, raw ÷ 295 × 100) )
```
- Subs use roll + grind. Roll quality = value ÷ max, capped at 1.12.

**Main stat tiers:** a flat HP/ATK/DEF main on slots 1/3/5 = 72 · SPD 100 · CDmg 93 · ATK% 91 · CRate 89 · ACC 80 · HP% 76 · DEF% 73 · RES 71

**Sub stat tiers:** SPD 100 · CRate 95 · CDmg 93 · ATK% 90 · ACC 84 · HP% 78 · DEF% 74 · RES 72 · ATK 62 · DEF 60 · HP 58
- Flat subs on slots 2/4/6 get × 0.88. The innate counts at × 0.38.

**Main ↔ sub synergies:** ATK%+CDmg 1.13 · CDmg+CRate 1.12 · HP%+DEF% 1.11 · ATK% main+SPD sub 1.11 · SPD+ACC / ATK%+CRate / SPD main+ATK% sub 1.10 · same-type %+flat 1.10 · HP%+RES 1.10 · DEF%+RES 1.09 · HP%+SPD 1.04 · **CDmg+RES 0.94 · ATK%+DEF% 0.91 · ATK%+RES 0.90**
- Unlisted pairs score 1.00 on slots 1/3/5 and 0.94 on slots 2/4/6.

**Sub ↔ sub synergies:** CRate+CDmg 1.12 · ATK%+CDmg 1.10 · SPD+ACC 1.09 · ATK%+SPD 1.09 · ATK%+CRate 1.08 · HP%+DEF% 1.08 · SPD+CDmg 1.07 · HP%+RES 1.07 · DEF%+RES 1.06 · **CDmg+RES 0.94 · ATK%+RES 0.93**

**Duplicate penalty:** × 0.88 for each overlap of the same base stat type across main, innate and subs (ATK and ATK% count as one type).

**Golden triplet (× 1.04):** applies when the rune has 3 stats from one archetype:
- **Nuker** (ATK, CRate, CDmg)
- **Fast Tank** (HP, DEF, SPD)
- **Control** (SPD, ACC, HP)
- **Bruiser** (HP, CRate, CDmg)

**Chip colour:** ≥ 88 high · ≥ 72 mid · below that, low.

---

## 7. Rune Rules (advanced tuning)

The Dashboard Strictness slider is the everyday control. **Runes → Rules** is the full setup.

**How the pieces connect:**
- **A. Constants (8 stats):** base numbers that every "high line" is built from.
- **B. Evaluation Policy:** preset (Early / Mid / Late / Competitive / Custom), anchor requirement (Hard/Soft), slot requirements (Hard/Soft), supporting-stat strictness (+1 / 0 / −1), and stat quality for role (0.00 off → 0.74 competitive).
- **C. Role formulas:** per build, the allowed mains, good and bad subs, must-haves, minimum lines and high-roll anchor.
- **D. Verdict rules:**
  - **Gem:** +12+ runes with weak flat subs. Enchanting only rerolls subs, not the innate.
  - **Grind:** grind gap setting (try 0.3–0.5; lower is stricter). If one grind on SPD / HP% / DEF% / ATK% reaches the Late high-roll line, the verdict becomes Grind.
  - **Reapp:** Legend runes filtered by allowed sets (default *Violent, Will, Swift*), innate stats (default *SPD, HP%, ACC*), mains on slots 2/4/6, a max-efficiency cap, and optionally odd slots.

**Saving:** Roles auto-save. Constants, Policy and Verdict rules need **Save & Recalculate**. **Reset to Defaults** is a full factory reset.

---

## 8. Artifacts & Relics

- **Artifacts:** Cairos Dungeon drops with primary stats and secondary effects. They're evaluated on primary stat quality and secondary effect value, not substat rolls. Ingame Score is shown but not used for verdicts.
- **Relics:** gear categories (Weapon, Armor, Accessory, Ornament) with type-specific rules. Support is limited.
- Switch between them in **Runes → Table** (Runes / Artifacts / Relics tabs).

---

## 9. Monsters tab

- **Roster:** search by name, element or rune text. Each unit shows Base, +runes and Total stats. Total SPD includes your Sky Tribe Totem bonus. Clicking a rune slot opens it in the Rune Table.
- **Skill plan:** priority queue and cooldown hunt, filterable by natural stars.
- **Teams (optional):** each slot shows combat SPD (base + runes + totem and leader % of base). A crown marks the leader.

---

## 10. Shortcuts & tips

- `/` focuses the rune table search.
- `↑ ↓` and `PgUp PgDn` scroll the table.
- `Enter` or `Space` activates a chart row or opens a monster.
- Drag and drop a `.json` anywhere to load it.
- **If verdicts look off after an update,** hard refresh, then press **Save & Recalculate** once in Rune Rules.

---

## Quick recipe for a full rune box

1. Export with SWEX and load the JSON.
2. Click **Apply suggestion**, or pick your stage yourself.
3. Set **Strictness to 4–5** for an aggressive clean-out.
4. Open the Rune Table and filter **Verdict = Sell** and **Location = Inventory**.
5. Work through it by set and slot in-game.
6. Also handle the *Upgrade* runes (level them to +9 or +12 first) and the *Gem*, *Grind* and *Reapp* runes before deciding whether to sell them.

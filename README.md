# SW Rune Optimizer

Local-only Summoners War rune cleanup tool, the first module of a free SW optimizer.
Everything runs in the browser; nothing is uploaded.

## Run

```bash
npm install
npm run dev        # app
npm test           # engine unit tests
```

## Engine

`src/engine/` is a pure TypeScript module (no React, no DOM) so the optimizer and team
builder can reuse it. `analyze(parseSwex(json), buildRules(stage, strictness))` returns a
verdict, reason, role, fit, efficiency and Forge Score for every rune, plus the account
progression score. `Mid` + strictness `4` reproduces `reference/verdict.py`.

Check against the Python reference on your own export (the export is git-ignored):

```bash
python3 -I scripts/dump-verdict-py.py export.json /tmp/py.json
npx tsx scripts/compare-verdict-py.ts export.json /tmp/py.json
SW_EXPORT=export.json SW_PY=/tmp/py.json npx vitest run
```

More sections (views, monster data update) are added as the app is built.

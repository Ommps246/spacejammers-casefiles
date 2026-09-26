# CLAUDE.md — SpaceJammers · Case Files

Context for Claude Code. Read this before every task in this repo.

## What we're building
NASA Space Apps 2026, challenge **"Be An Earth System Trend Detective!"**, team SpaceJammers (Om Mishra, Anik Paul, Adarsh Rathore, Ashutosh Dash), Chennai local event.

**Case Files** is an AI detective for Earth's trends. Each case is a solved investigation:
1. **Claim**: one plain-English sentence ("Is Chennai heating up, and since when?")
2. **Evidence**: real statistics on NASA data, each with a plain caption
3. **Other suspects**: signals checked and ruled in or out (lagged correlation, clearly labelled "correlation, not causation")
4. **Devil's Advocate**: the AI argues against its own finding (sensor drift, grid resolution, one-off events)
5. **Verdict**: strength (strong / moderate / inconclusive) plus dataset citations

The product is the *answer*, not a data viewer. The globe is an entry animation, not the core.

## Hard rules
- **The AI never invents numbers.** All statistics come from `pipeline/` → `data/cases/*.json`. Narration is generated from that JSON only and must pass `python -m pipeline.guard <case.json> <narration.json>`. If the guard fails, fix the narration, never the guard.
- **No live NASA calls in the app.** Data is fetched once (`pipeline/fetch.py`), processed offline, and served as static JSON. The demo must work offline.
- **Keep scope small.** 3–5 hand-checked cases, no user accounts, no chat window, no live data fetch.
- **Plain language in the UI.** No "NDVI", "anomaly", "composite" without a one-line plain explanation. Every label should make sense to a non-engineer.
- **Om runs commands one at a time** and confirms before proceeding. Don't chain long install scripts.

## Repo map
- `pipeline/stats.py`: trend (pre-whitened Mann-Kendall + Sen's slope), Pettitt and PELT changepoints, lagged correlation, Benjamini-Hochberg
- `pipeline/fetch.py`: NASA POWER (daily point, no login) and GISTEMP v4 downloads to `data/raw/`
- `pipeline/build_cases.py`: raw data → `data/cases/<region>-<topic>.json` and `index.json`
- `pipeline/guard.py`: rejects narration containing numbers that aren't in the case file
- `pipeline/regions.py`: region list (Chennai, Nilgiris, Pulicat Lake)
- `tests/`: synthetic-data tests (planted trend found, AR(1) noise rejected, planted 2015 flood ranked #1)
- `docs/METHODS.md`: the judge-facing explanation of every statistical choice
- `prompts/`: the next Claude Code prompts, in order

## Commands
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q
python -m pipeline.fetch all
python -m pipeline.build_cases
```

## Frontend (to build, `web/`)
Next.js (App Router) + TypeScript, @react-three/fiber + @react-three/drei (one three.js scene: Blue Marble globe and the Terra/Aqua satellite models, full camera control), Framer Motion, hand-built React SVG charts (`web/src/components/case/TrendChart.tsx`: the real yearly `series` plus the Sen's slope line, styled per `design/Tokens.dc.html`). Approved mockups live in `design/*.dc.html`. It reads `data/cases/*.json` and `data/narration/*.json` statically (copied into `web/public/data` by `web/scripts/copy-data.mjs` before `dev`/`build`).

Design language (apple-design and animate skills):
- Motion only where it explains something: evidence cards appear in order as the case is "solved"; the globe flies to the region.
- Springs over fixed-duration easing. UI transitions under ~300 ms. Every animation must be interruptible.
- Animate only `transform` and `opacity`. Honour `prefers-reduced-motion` with a cross-fade fallback.
- Materials: dark space background, translucent cards (`backdrop-filter: blur`), one accent colour per verdict strength.
- Type: system stack or Inter, tight tracking on large headings, generous leading on body text.
- Restraint: one hero moment (the globe to case reveal), everything else quiet.

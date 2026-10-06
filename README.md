# Case Files: an AI detective for Earth's trends

**SpaceJammers** · NASA Space Apps Challenge 2026 · Chennai · *Be An Earth System Trend Detective!*

We asked NASA's satellites what's changing around Chennai. Some answers are clear. Some aren't. We tell you which.

Most tools show you Earth data. Case Files hands you a solved case: one plain question, the evidence from NASA data,
the other suspects it checked, the strongest argument against its own conclusion, and a verdict with an honest strength
(strong, moderate or inconclusive). Every number on the site is computed by the pipeline in this repo and traces to a
NASA dataset; the plain-English narration is checked by a number guard that rejects any figure not in the case file.

## The cases

| Case | Question | Verdict |
|---|---|---|
| Chennai night heat | Are Chennai's nights warming faster than the countryside's? | Strong: region-wide night warming, city and farmland alike |
| Chennai greenery | Is Chennai losing its green cover? | Moderate: mixed; the OMR IT corridor is browning |
| Chennai heat | Is Chennai heating up, and since when? | Inconclusive |
| Chennai rain | Are extreme downpours becoming more common in Chennai? | Inconclusive (the 2015 flood detector check passes) |
| Nilgiris heat | Is Nilgiris heating up, and since when? | Moderate |
| Nilgiris greenery | Is Nilgiris losing its green cover? | Strong: the Ooty pixel is browning |
| Nilgiris rain | Are extreme downpours becoming more common in Nilgiris? | Inconclusive |

Verdicts come from `data/cases/*.json`; this table is a summary, the site is the source.

## NASA data

- **NASA POWER** (Langley Research Center): daily air temperature and rainfall on a ~50 km grid, 1981–2025.
- **GISTEMP v4** (Goddard Institute for Space Studies): the global temperature record, used as a reference line.
- **MODIS**, via the LP DAAC's **AppEEARS** service, one pixel per point:
  - MOD11A2 / MYD11A2 v6.1: Terra and Aqua land surface temperature (8-day, 1 km)
  - MOD13Q1 v6.1: Terra vegetation index, NDVI (16-day, 250 m)
  - MCD12Q1 v6.1: land cover type (yearly, 500 m)

## How it works

Trends: Mann-Kendall with a moving-block bootstrap p-value, and Sen's slope. Change points: Pettitt (PELT as leads only).
Other suspects: lagged correlation, always labelled correlation, not causation. Many tests: one Benjamini-Hochberg false
discovery rate family of 40 tests, frozen in `data/fdr_family.json`. Countryside references must be MODIS cropland in both
2001 and 2024.

Every choice is explained for judges in **[docs/METHODS.md](docs/METHODS.md)** (also on the site at `/methods`).

## Run it

Pipeline (Python 3.10+):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q                  # synthetic-data tests, narration checks, the frozen FDR family
python -m pipeline.fetch all         # NASA POWER + GISTEMP into data/raw/ (needs internet)
python -m pipeline.appeears submit   # MODIS via AppEEARS (free NASA Earthdata login), then `status` and `download`
python -m pipeline.build_cases       # data/raw -> data/cases/*.json (all regions: the FDR family is frozen)
python -m pipeline.guard data/cases/chennai-heat.json data/narration/chennai-heat.json
```

The built cases are committed, so you can run the site without fetching anything. Raw downloads (and the AppEEARS login
token) stay in `data/raw/`, which git ignores.

Web app (Node 20.9+):

```bash
cd web
npm install
npm run dev      # copies data/cases, data/narration and docs/METHODS.md into public/, then serves on :3000
npm test         # unit tests
npm run build    # fully static: works offline, no API keys
```

## Where things are

- `pipeline/`: fetch, statistics, case building, the number guard
- `data/cases/`, `data/narration/`: the case files and their guard-checked narration
- `web/`: the Next.js site (landing page, case pages, `/methods` with three things to try, `/satellites`, `/team`)
- `docs/METHODS.md`: every statistical choice · `docs/VALIDATION.md` · `docs/screenshots/`
- `design/`: the approved mockups · `prompts/`: the build sequence, as Claude Code prompts

## Team

Om Mishra · Anik Paul · Adarsh Rathore · Ashutosh Dash

# Prompt 02: AI verdicts + Devil's Advocate (no API key needed)

Claude Code writes the narration once, offline, from the case JSON. The number guard proves
it didn't invent anything. At demo time the app just reads static files, so nothing can fail live.

```
Read CLAUDE.md. For each data/cases/<id>.json (skip index.json) write data/narration/<id>.json:

{
  "case_id": "<id>",
  "headline": "≤ 12 words, the answer, plain English",
  "verdict": "2–3 sentences. State the finding, its size per decade and the years covered.
              Use ONLY numbers present in the case file, rounded sensibly.",
  "strength": "<copy verdict_strength of the main evidence item>",
  "evidence_notes": {"<evidence id>": "one plain sentence a 14-year-old understands"},
  "suspects": [{"suspect": "...", "finding": "ruled in / ruled out / unclear, and why, from cross_examination"}],
  "devils_advocate": "The strongest honest argument AGAINST this verdict: grid resolution
                      (~50 km), reanalysis input changes, short record, one extreme year, etc.
                      Pick what actually applies to THIS case's numbers.",
  "what_data_cannot_tell_us": "one sentence",
  "sources": ["short_name of each dataset in the case file"]
}

Rules:
- If verdict_strength is "inconclusive", the headline must say the evidence is inconclusive.
  Don't dress it up.
- Never write "caused by". Use "coincides with" or "is consistent with".
- After writing each file run: python -m pipeline.guard data/cases/<id>.json data/narration/<id>.json
  If it's rejected, rewrite the narration (never edit guard.py) until it passes.
- Finish with a table: case | headline | guard OK.
```

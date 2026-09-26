# Prompt 01: run the pipeline on real NASA data

Paste into Claude Code (VS Code) with this repo open:

```
Read CLAUDE.md and docs/METHODS.md first.

Set up and run the pipeline one step at a time. Wait for my OK between steps:
1. Create .venv with python3, activate it, pip install -r requirements.txt
2. python -m pytest -q   (all 12 tests must pass before we touch real data)
3. python -m pipeline.fetch all   (NASA POWER daily for 3 regions + GISTEMP; takes a few minutes)
4. python -m pipeline.build_cases

Then open every file in data/cases/ and give me a table per case:
evidence id | trend | slope per decade | p-value | survives FDR | verdict strength.
Also report the 2015 flood sanity check (Chennai Nov–Dec 2015 rank) and the Pettitt change year.

Flag anything that looks physically implausible (e.g. warming > 1 °C/decade, a negative rainfall
total, a changepoint landing exactly on a known satellite/reanalysis transition year).
If the NASA POWER API returns an error, show me the exact response. Don't guess the fix.
Do NOT edit pipeline/stats.py or the tests to make numbers look better.
```

**After this:** send the case table to Anik so he can compare it with the published studies in docs/VALIDATION.md.

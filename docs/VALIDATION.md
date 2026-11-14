# Validation: our numbers vs. published studies

The same comparison is on the site at `/methods#trust`, where our side is read straight from the case files.
The studies use different years, stations or satellites from ours, so this compares direction and size, not
identical numbers. Where we differ, we say why. Our numbers below are copied from `data/cases/`; theirs are
quoted from each paper's abstract or results.

| Topic | Study | Their data and period | What they found | What we found | Agree? |
|---|---|---|---|---|---|
| Night ground temperature | Nayak, Vinod & Prasad (2023), *Applied Sciences* 13(24), 13323. [doi:10.3390/app132413323](https://doi.org/10.3390/app132413323) | MODIS land surface temperature (MOD11C1), major Indian cities, 2000–2023 | A statistically significant (95%) rise in night-time surface temperatures across major cities; night-time urban heat islands stronger and more consistent than daytime | Chennai's four city points warm at night by +0.378 to +0.693 °C per decade, 2000–2025, all strong (`chennai-night-heat`) | **Agree** on direction |
| Yearly rainfall | Bheeman & Rangarajan (2026), *Acta Geophysica* 74(2), 81. [doi:10.1007/s11600-026-01803-w](https://link.springer.com/article/10.1007/s11600-026-01803-w) | IMD hourly rainfall, Meenambakkam gauge, 1969–2023 | No significant trend in annual rainfall (Mann-Kendall p = 0.36); short 1–3 hour extremes becoming more frequent | Yearly rainfall: no clear trend (p = 0.062); heavy-rain days: no clear trend (p = 0.98) (`chennai-rain`) | **Agree** on totals. Our daily data can't see hour-long bursts |
| Air temperature | Jeganathan & Andimuthu (2013), *Theoretical and Applied Climatology* 111(3), 417–425. [doi:10.1007/s00704-012-0646-6](https://doi.org/10.1007/s00704-012-0646-6) | Chennai station temperatures, 1951–2010 | Mean annual temperature rose 1.3 °C over 60 years; three-quarters of the rise in mean maximum came in 1981–2010 | NASA POWER grid cell, 1981–2025: +0.065 °C per decade (p = 0.041), which doesn't pass the 40-test check: no clear trend (`chennai-heat`) | **Differs**: weaker than the station record. Our ~50 km grid cell mixes city, sea and countryside, and the periods differ |

## Still to do

- A greenness (NDVI) study of Chennai's OMR corridor or the Nilgiris, to compare with `chennai-greenery` and `nilgiris-greenery`.
- Ideally, rerun our air-temperature test over 1951–2010 station-style inputs to compare like with like.

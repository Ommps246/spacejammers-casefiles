# Methods: how Case Files detects a trend

Written so any of us can explain it to a judge in under a minute per point.

## 1. Data
- **NASA POWER** (Langley Research Center): daily temperature, max temperature, rainfall and humidity for a point, 1981 to present. It's built on NASA's MERRA-2 reanalysis, on a grid of about 50 km. **What it can't do:** tell one neighbourhood from another. Our cases describe the wider Chennai region.
- **GISTEMP v4** (NASA Goddard Institute for Space Studies): the global average temperature anomaly. We use it as context: is Chennai warming faster or slower than the planet?
- **MODIS** on NASA's Terra and Aqua satellites, through AppEEARS: vegetation greenness (NDVI, 250 m), land surface temperature (1 km) and land cover type (500 m). We take one pixel per point, so these cases can tell one neighbourhood from another.

## 2. Remove the seasons
Chennai is always hotter in May than in January. That's the seasons, not a trend. We subtract each calendar month's 1981–2010 average, so only the departure from normal is left (the anomaly).

## 3. Is there a trend? Mann-Kendall with a block-bootstrap p-value
- **Mann-Kendall** asks: across every pair of years, does the later value tend to be higher than the earlier one? It makes no assumption that the trend is a straight line or that the data are bell-curve shaped.
- **The autocorrelation problem:** a warm month tends to be followed by another warm month. Plain Mann-Kendall mistakes that stickiness for a trend. On pure random noise with this kind of stickiness, it flagged a "significant" trend **about 25% of the time** in our tests.
- **What we tried first and rejected:** "pre-whitening" removes the stickiness before testing, but it also removes much of a real trend. It rated NASA's own global warming record (1981–2025) as only p = 0.017, when the plain test gives about p = 10⁻¹⁵. A detective who can't see global warming isn't credible.
- **What we use:** a **moving-block bootstrap**. We cut the series into blocks long enough to hold the stickiness, shuffle the blocks 1,000 times, and ask how often a shuffled series shows a trend as strong as the real one. Shuffling keeps the autocorrelation and destroys only the trend, so the p-value stays close to honest. We measured about 8% false alarms on trend-free noise at a nominal 5% (plain Mann-Kendall: about 22%), so it's slightly generous, and we say so. The block length is chosen from the data (autocorrelation decay), and the random seed is fixed, so every run gives the same numbers.
- References: Kundzewicz & Robson (2004), *Hydrological Sciences Journal*; Önöz & Bayazit (2012), *Hydrological Processes*.
- With 1,000 resamples the smallest p-value it can report is 0.001, so narration says "p < 0.001", never a smaller number.
- We also report the naive p-value, to show we checked.

## 4. How big is the trend? Sen's slope
The median of the slopes between every pair of points. One freak year, like the 2015 floods, can't drag it around the way it would a least-squares line. We report it per decade.

## 5. When did it change? Pettitt test + PELT
- **Pettitt** finds the single most likely year of an abrupt shift and gives a p-value.
- **PELT** (the `ruptures` library) suggests several candidate break dates. It gives no p-value, so we label these as leads, not findings.
- A shift in reanalysis data can be caused by a change in the satellites feeding it. Every changepoint verdict carries that caveat.

## 6. Other suspects: lagged correlation
Example: do drier months explain the warm anomalies? We correlate one signal with another 0–12 months later. We always say **correlation, not causation**, and the p-values here are not corrected for autocorrelation, so treat them as indicative.

## 7. Many tests means some false alarms: Benjamini-Hochberg
If you run 20 tests at 95% confidence, about 1 will light up by pure chance. We apply Benjamini-Hochberg false-discovery-rate control across every trend test in a run. A finding is (the global GISTEMP line is context, tested on its own and not part of this family):
- **strong**: survives the correction and p < 0.01
- **moderate**: survives the correction
- **inconclusive**: doesn't survive, and we say so. The `trend` label then reads "no clear trend", so the UI can never show "increasing" next to "inconclusive"

**One family, fixed in advance.** All regional trend tests, weather (NASA POWER) and satellite (MODIS) alike, form a single family. We decided that before seeing any MODIS results. Under Benjamini-Hochberg, adding tests can change other verdicts: when the new tests include many real effects, the bar for the rest gets lower. That happened here. Adding the satellite tests moved the Nilgiris air-temperature trend (its p-value unchanged) from inconclusive to moderate. We report that openly instead of picking the family that gives the answer we like. It happened again when the farmland controls' greenness and the city-minus-farmland greenness gaps joined the family: the Uthukottai farmland night-temperature trend (p-value unchanged) moved from inconclusive to moderate.

**Frozen on 2026-09-26.** The family is now fixed at 40 tests, listed in `data/fdr_family.json`: every regional trend test across the Chennai, Nilgiris and Pulicat cases (the GISTEMP planet line stays outside it). Why: twice, adding tests moved a verdict whose own p-value hadn't changed, so a family that can grow can also be tuned, even by accident. Every build now checks its family against the frozen list before correcting, and refuses to run if they differ (a one-region build is refused too, since it would change the family). Changing it takes a deliberate `python -m pipeline.build_cases --freeze-fdr` and a note here saying why.

## 8. City minus countryside: the reference rule
To ask whether the city's nights are warming *faster* than the countryside's, we need a countryside that stayed countryside.
- **The rule, for every point:** a point can be a reference only if MODIS land cover (MCD12Q1, class `LC_Type1`, 500 m) calls it **Cropland (class 12) in both 2001 and 2024**. Passing the rule is necessary, not sufficient: city points are never references, even Tambaram, which is classed Cropland in both years.
- **Chengalpattu failed it.** We picked it as farmland, but MODIS classes it Urban/built-up in both 2001 and 2024. It's now `chengalpattu_edge`: its night-temperature trend is still shown, labelled "urban edge", and it's never used as a reference.
- **The reference** is the average of three farmland points chosen far from the city and highways (Kanchipuram west, Uthiramerur south, Uthukottai north), all Cropland in 2001 and 2024. We average each point's yearly departure from its own normal, and only in years where **at least 2 of the 3** have a valid value, so a cloudy year at one point doesn't bias the average. Each control's own night trend is also shown as an exhibit, so you can see the countryside isn't flat either.
- **The gap** (city minus reference, per year) is tested for a trend in the same single FDR family as everything else. It's still shown as a **lead, not a finding**: a 500 m land-cover class can't see smaller changes inside the pixel, and the controls are about 40 to 75 km inland.
- **Land-cover exhibit:** every Chennai satellite case (greenery and night heat) lists each point's class in 2001 vs 2024 (e.g. OMR: Cropland → Urban/built-up), labelled "MODIS land cover classification (500 m), evidence not proof". It's a classifier's label, not a survey, and it isn't a statistical test, so it's not in the FDR family.

## 9. Sanity check on a known event
Before trusting the detector, we check that it sees something everyone remembers. The Nov–Dec 2015 Chennai floods should rank as the wettest Nov–Dec in the record. If they don't, something is wrong with the data or the code.

## 10. The AI's job
The language model **only narrates** the numbers in the case file. It writes the verdict, the plain-English captions and the Devil's Advocate argument against itself. `pipeline/guard.py` rejects any narration containing a number that isn't in the case file.

## Likely judge questions
- *"Why not linear regression?"* It assumes normally distributed, independent errors, and climate data breaks both assumptions. Mann-Kendall and Sen's slope are the standard in hydrology and climate trend papers.
- *"Isn't POWER a model, not observations?"* Yes. It's reanalysis: observations assimilated into a model. That's why we use it for regional climate and cross-check against published station-based studies (see `docs/VALIDATION.md`).
- *"Could the trend be a sensor artifact?"* That's exactly what the Devil's Advocate section raises for each case.

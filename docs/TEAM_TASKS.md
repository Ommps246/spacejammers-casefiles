# Team tasks: SpaceJammers

**How we work:** all Claude Code work happens on Om's laptop. Anik and Adarsh own everything that needs a browser, a phone or a brain but no Claude Pro. If someone needs Claude in the final hours, ask Om.

## Om: pipeline, AI, integration (on the laptop)
- [ ] Run `prompts/01-run-pipeline.md`: fetch NASA data, build the first real cases
- [ ] Review every number in `data/cases/` by hand
- [ ] `prompts/02-narration.md`: verdicts plus Devil's Advocate, all passing the number guard
- [ ] `prompts/03-frontend.md`: web app
- [ ] Rehearse `docs/METHODS.md` until you can answer the judge questions without notes

## Anik: data and validation (browser only)
- [ ] Create a NASA Earthdata login: https://urs.earthdata.nasa.gov/users/new
- [ ] In the AppEEARS web app (https://appeears.earthdatacloud.nasa.gov/), submit a **Point Sample** request:
  - Points: Chennai 13.08, 80.27 · Nilgiris 11.41, 76.70 · Pulicat 13.55, 80.18
  - Products: `MOD13Q1.061` (NDVI, 250 m) and `MOD11A2.061` (land surface temp, 1 km)
  - Dates: 2000-02-18 to 2025-12-31
  - Download the CSVs when ready (it can take a day) and send them to Om
- [ ] **Validation table** (`docs/VALIDATION.md`): find 2–3 published studies (Google Scholar) on Chennai or Tamil Nadu temperature or heavy-rainfall trends. For each, note the paper, years, dataset and trend reported (e.g. "+0.2 °C/decade, 1970–2015"). We'll compare our numbers with theirs. This is our strongest proof of validity.
- [ ] Ask one SRM earth-science or civil (hydrology) professor to spend 10 minutes looking at our first case before the event

## Adarsh: story, video, visuals (no code)
- [ ] **Check the Space Apps rules:** can we write code before the event, or only research and design? Screenshot the rule and send it to the group. This decides how we use the next two weeks.
- [ ] **30-second video storyboard** (6 frames, one per 5 seconds):
  1. Hook: "Chennai flooded in 2015. Was it a freak event, or a pattern?"
  2. Satellite collects evidence (3D model), globe spins to Chennai
  3. Evidence cards appear: rain, heat, global context
  4. Devil's Advocate objects: "Could this be a sensor artifact?"
  5. Verdict and confidence, with NASA dataset badges
  6. "Any region. Any signal. Every number traceable." + team name
- [ ] Find a free **Terra or Aqua satellite 3D model** (.glb/.gltf) on NASA's 3D resources site: https://science.nasa.gov/3d-resources/
- [ ] Moodboard: 5 screenshots of UIs we love (Apple Weather, Apple Maps, NASA Eyes, Linear) for colour, cards and motion
- [ ] Draft the project page text: problem, what it does, NASA data used, team

## Everyone (week 2)
- [ ] **Stranger test:** show the video to 5 people outside CS. If they can't repeat what we found, change the product until they can.

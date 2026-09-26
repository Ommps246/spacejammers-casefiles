# Claude Design prompts: Case Files (SpaceJammers)

Paste the Design Brief first in every new Claude Design session, then the screen prompt.
Real numbers below come from data/cases/ (Sep 2026 build). Don't let the design invent new ones.

## 0. Design Brief (paste first, every time)

Product: "Case Files": an AI detective for Earth's trends. NASA Space Apps 2026, team SpaceJammers (Chennai).
Each case is a solved investigation: a question → evidence from NASA satellite/climate data → other suspects
checked → a Devil's Advocate that argues against the finding → a verdict with an honest strength label.
Tone: calm, precise, trustworthy. Apple-level restraint (think Apple Weather, Apple Maps, NASA Eyes), with a quiet
detective / case-dossier motif that never turns into cartoon noir (no fedoras, no magnifying-glass clip art).
Audience: hackathon judges and the public, who can read every label with no science background.

Visual system:
- Dark space background #05070d → #0b1020, subtle starfield. Translucent cards (frosted glass, 1px hairline borders).
- Accent colours taken from the real NASA Terra satellite: navy solar-cell blue #1b2a4a and insulation-foil gold #c9a24a.
- Verdict strengths: strong = #34c759 green, moderate = #ffb020 amber, inconclusive = #8e8e93 neutral grey.
  "Inconclusive" must look like an honest finding, not an error or empty state.
- Devil's Advocate: a distinct card with a muted red edge (#ff453a at low opacity).
- Type: SF Pro / Inter. Large titles with tight tracking, body text with generous leading, tabular numerals for stats.
- One hero moment per screen. Everything else quiet. Generous whitespace. No gradients-for-decoration, no neon.
- Every chart: thin line, one highlighted trend line (Sen's slope), a labelled axis, a source chip ("NASA POWER" etc).
Deliver desktop 1440px + mobile 390px for each screen.

## 1. Case page (most important)

Design the case page for "Is Chennai heating up, and since when?", using ONLY this real content:
- Header: region chip "Chennai · 13.08°N 80.27°E", question as the page title, small globe thumbnail with a Chennai pin.
- Verdict card (top, collapsed summary; full version at the end): strength "Inconclusive",
  headline "Chennai shows slight warming, but not enough to call it yet".
- Evidence cards, in order, each with a plain label, one plain sentence, a small line chart and a stat pill:
  1. "Average temperature": +0.065 °C per decade, 1981–2025, p = 0.041, did not survive the multiple-test check → Inconclusive
  2. "Very hot days per year": −1.54 days per decade → Inconclusive (a surprising direction; flag it gently)
  3. "When did it change?": "The shift shows up from 1997 onward (+0.21 °C vs. the years before)", p = 0.17 → a lead, not a finding
  4. "The whole planet, same years" (reference line, styled differently): +0.211 °C per decade, p < 0.001 → Strong
- "Other suspects" section: Rainfall variability. Do drier months explain warm months? (correlation, not causation)
- Devil's Advocate card: "This data averages a ~50 km area and blends satellite and model inputs, so it can hide
  city-scale heat. The 1997 shift coincides with the 1997–98 El Niño and a satellite instrument change."
- "Next witness" teaser card: "Sharper evidence incoming: MODIS satellite land temperature at 1 km."
- Sources row: chips for NASA POWER (LaRC) and GISTEMP v4 (GISS). An expandable "How we know" panel with the method names.
Show the scroll order and indicate where motion happens (cards stagger in; the Devil's Advocate slides in as an objection).
Also give me a second variant of the evidence card layout so I can compare the two.

## 2. Landing page

Design the landing page. Hero: a large Earth globe (NASA Blue Marble look) with the Terra satellite passing over South
India, and pins on Chennai and Nilgiris. Title "Case Files", subtitle "Every trend on Earth has a story. We find it,
prove it, and argue against it." Below: case cards as a clean grid:
- "Is Chennai heating up, and since when?" (Inconclusive)
- "Are extreme downpours becoming more common in Chennai?" (Inconclusive; tag: "Detector check: the 2015 floods rank #1 of 45 years")
- "Is the Nilgiris heating up?" (Inconclusive)
- one "Coming soon: satellite evidence" card
A thin footer strip: "Every number traces to a NASA dataset", with Method and Team links. Show the state after the intro
animation settles, plus one frame mid-intro (satellite crossing, faint scan line on the ground).

## 3. Video storyboard (30 seconds, 6 frames × 5 s, 16:9)

1. Hook, black screen text: "Chennai flooded in 2015. Freak event, or a pattern?"
2. NASA Terra satellite crossing Earth, camera following it down toward South India
3. Evidence cards snapping into place over the city (temperature, rain, the whole planet)
4. The Devil's Advocate card interrupts: "Could this be a sensor artifact?"
5. Verdict card with an honest strength label and NASA dataset badges
6. End card: "Any region. Any signal. Every number traceable." Case Files · SpaceJammers · NASA Space Apps 2026
For each frame: the visual, on-screen text (max 8 words), and camera/motion notes.

## 4. Logo mark

A logo mark for "Case Files". Ideas to explore: an orbit ring that doubles as a dossier folder tab; a globe with
a single highlighted trend line; a pin plus a subtle case-folder corner. Must work at 16px (favicon) and on dark
backgrounds. Colours: gold #c9a24a on navy #1b2a4a, plus a mono white version. Give 4 directions, then refine the best.
Include the wordmark lockup "Case Files" and a small "by SpaceJammers" secondary line.


## ALL-IN-ONE (paste this single prompt)

Create a complete design system and four deliverables for the project below, in this order: (1) case page, (2) landing page, (3) 30-second video storyboard, (4) logo. Build the visual system first and reuse it everywhere so all four feel like one product. Use ONLY the real numbers given; never invent data.

### Brief

Product: "Case Files": an AI detective for Earth's trends. NASA Space Apps 2026, team SpaceJammers (Chennai).
Each case is a solved investigation: a question → evidence from NASA satellite/climate data → other suspects
checked → a Devil's Advocate that argues against the finding → a verdict with an honest strength label.
Tone: calm, precise, trustworthy. Apple-level restraint (think Apple Weather, Apple Maps, NASA Eyes), with a quiet
detective / case-dossier motif that never turns into cartoon noir (no fedoras, no magnifying-glass clip art).
Audience: hackathon judges and the public, who can read every label with no science background.

Visual system:
- Dark space background #05070d → #0b1020, subtle starfield. Translucent cards (frosted glass, 1px hairline borders).
- Accent colours taken from the real NASA Terra satellite: navy solar-cell blue #1b2a4a and insulation-foil gold #c9a24a.
- Verdict strengths: strong = #34c759 green, moderate = #ffb020 amber, inconclusive = #8e8e93 neutral grey.
  "Inconclusive" must look like an honest finding, not an error or empty state.
- Devil's Advocate: a distinct card with a muted red edge (#ff453a at low opacity).
- Type: SF Pro / Inter. Large titles with tight tracking, body text with generous leading, tabular numerals for stats.
- One hero moment per screen. Everything else quiet. Generous whitespace. No gradients-for-decoration, no neon.
- Every chart: thin line, one highlighted trend line (Sen's slope), a labelled axis, a source chip ("NASA POWER" etc).
Deliver desktop 1440px + mobile 390px for each screen.

### 1. Case page (most important)

Design the case page for "Is Chennai heating up, and since when?", using ONLY this real content:
- Header: region chip "Chennai · 13.08°N 80.27°E", question as the page title, small globe thumbnail with a Chennai pin.
- Verdict card (top, collapsed summary; full version at the end): strength "Inconclusive",
  headline "Chennai shows slight warming, but not enough to call it yet".
- Evidence cards, in order, each with a plain label, one plain sentence, a small line chart and a stat pill:
  1. "Average temperature": +0.065 °C per decade, 1981–2025, p = 0.041, did not survive the multiple-test check → Inconclusive
  2. "Very hot days per year": −1.54 days per decade → Inconclusive (a surprising direction; flag it gently)
  3. "When did it change?": "The shift shows up from 1997 onward (+0.21 °C vs. the years before)", p = 0.17 → a lead, not a finding
  4. "The whole planet, same years" (reference line, styled differently): +0.211 °C per decade, p < 0.001 → Strong
- "Other suspects" section: Rainfall variability. Do drier months explain warm months? (correlation, not causation)
- Devil's Advocate card: "This data averages a ~50 km area and blends satellite and model inputs, so it can hide
  city-scale heat. The 1997 shift coincides with the 1997–98 El Niño and a satellite instrument change."
- "Next witness" teaser card: "Sharper evidence incoming: MODIS satellite land temperature at 1 km."
- Sources row: chips for NASA POWER (LaRC) and GISTEMP v4 (GISS). An expandable "How we know" panel with the method names.
Show the scroll order and indicate where motion happens (cards stagger in; the Devil's Advocate slides in as an objection).
Also give me a second variant of the evidence card layout so I can compare the two.

### 2. Landing page

Design the landing page. Hero: a large Earth globe (NASA Blue Marble look) with the Terra satellite passing over South
India, and pins on Chennai and Nilgiris. Title "Case Files", subtitle "Every trend on Earth has a story. We find it,
prove it, and argue against it." Below: case cards as a clean grid:
- "Is Chennai heating up, and since when?" (Inconclusive)
- "Are extreme downpours becoming more common in Chennai?" (Inconclusive; tag: "Detector check: the 2015 floods rank #1 of 45 years")
- "Is the Nilgiris heating up?" (Inconclusive)
- one "Coming soon: satellite evidence" card
A thin footer strip: "Every number traces to a NASA dataset", with Method and Team links. Show the state after the intro
animation settles, plus one frame mid-intro (satellite crossing, faint scan line on the ground).

### 3. Video storyboard (30 seconds, 6 frames × 5 s, 16:9)

1. Hook, black screen text: "Chennai flooded in 2015. Freak event, or a pattern?"
2. NASA Terra satellite crossing Earth, camera following it down toward South India
3. Evidence cards snapping into place over the city (temperature, rain, the whole planet)
4. The Devil's Advocate card interrupts: "Could this be a sensor artifact?"
5. Verdict card with an honest strength label and NASA dataset badges
6. End card: "Any region. Any signal. Every number traceable." Case Files · SpaceJammers · NASA Space Apps 2026
For each frame: the visual, on-screen text (max 8 words), and camera/motion notes.

### 4. Logo mark

A logo mark for "Case Files". Ideas to explore: an orbit ring that doubles as a dossier folder tab; a globe with
a single highlighted trend line; a pin plus a subtle case-folder corner. Must work at 16px (favicon) and on dark
backgrounds. Colours: gold #c9a24a on navy #1b2a4a, plus a mono white version. Give 4 directions, then refine the best.
Include the wordmark lockup "Case Files" and a small "by SpaceJammers" secondary line.

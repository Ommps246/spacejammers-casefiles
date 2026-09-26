# Prompt 03: the web app (Apple-grade, motion with a purpose)

Run this after prompts 01 and 02 have produced data/cases and data/narration.
Ask Claude before this step if you have the satellite .glb from Adarsh: it goes in web/public/models/.

```
Read CLAUDE.md (especially "Frontend" and "Design language").
Create web/ : Next.js (App Router, TypeScript), Tailwind, framer-motion, @react-three/fiber + @react-three/drei
(one three.js scene for the globe and satellites). Charts are hand-built React SVG (no chart library).
Match the approved mockups in design/*.dc.html.
Copy data/cases and data/narration into web/public/data at build time (a small prebuild script).

Screens:
1. Landing: dark space background, slowly rotating globe (NASA Blue Marble texture from
   //unpkg.com/three-globe/example/img/earth-blue-marble.jpg, downloaded into public/ so it
   works offline). Pins for each case region. Title "Case Files", subtitle
   "Every trend on Earth has a story. We find it, prove it, and argue against it."
   Case list as translucent cards (backdrop-blur) showing each case's question.
2. Case page (/case/[id]). Scroll-driven reveal. The globe flies to the region and shrinks to
   the corner, then reveals in order:
   a. The question (large, tight tracking)
   b. Evidence cards, one per evidence item: plain label, evidence note, a small SVG
      line chart of `series` with the Sen's slope trend line overlaid, a pill with slope/decade
      and strength colour (strong = green, moderate = amber, inconclusive = grey)
   c. "Other suspects" section
   d. "Devil's Advocate" card, visually distinct (red-tinted border), slides in from the right
      as an objection
   e. Verdict card with headline, strength, and dataset citation chips linking to NASA
   f. "How we know" expander that shows the method strings and p-values
3. /methods: renders docs/METHODS.md.

Motion rules: spring transitions (stiffness ~300, damping ~30), stagger evidence 60–80 ms,
only transform/opacity, everything interruptible, full prefers-reduced-motion fallback
(fades only, globe stops rotating). One hero moment: globe → case. Keep the rest calm.
Must run offline with `npm run build && npm start`. No API calls, no auth.
Build step by step: scaffold → landing → case page → polish. Show me each before moving on.
```

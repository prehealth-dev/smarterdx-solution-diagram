# SmarterDx Solution Diagram — WebGL/Three.js + GSAP ScrollTrigger

Animated recreation of Figma artboard **Ai-Platform** (Design system, node `22-2247`).

**Scroll build:** solution circles pop in (staggered) → connection lines draw on
from each circle down into the Clinical AI box → box materializes as a
**digital square build** sweeping top→bottom (teal→blue→purple pixel flicker)
→ cards + "SMARTERDX CLINICAL AI" stat row land → continuous data pulses flow
from every circle into the box ("ingesting data").

**Cursor physics:** circles are spring-magnetized toward a nearby cursor; the
connected lines bend with them. The nearest circle becomes *focused*: all other
circles and paths dim, only its five paths stay lit (brighter pulses), and an
animated gradient stroke runs around the Clinical AI box **in that circle's
palette** — teal for Authorizations/Utilization/Notes, blue for Prebill/Coding,
purple for Underpayments/Denials. Leave the diagram and everything relaxes back.

## Files
- `diagram.js` — everything: CSS, DOM, Three.js line web, GSAP ScrollTrigger
  build, magnet physics. Self-contained ES module — **all 13 icons inlined as
  data URIs, no asset uploads needed.**
- `diagram.template.js` + `build.mjs` + `assets/` — source. Edit the template,
  run `node build.mjs` to regenerate `diagram.js`.
- `index.html` — local preview harness (`python3 -m http.server` in this folder).

**Click expand:** clicking a circle expands it (1.34×) — logo stays, the
"Smarter" wordmark/label crossfades to a short tagline (e.g. Authorizations →
"Automate prior authorizations") plus a small arrow chip that links to that
solution's page. While open, that circle stays focused (others dimmed, gradient
stroke running). Click again / outside / Esc to close. Keyboard: Tab + Enter.

## Webflow install
1. Host `diagram.js` somewhere static (GitHub + jsDelivr, Netlify, or Webflow
   Cloud — Webflow won't host JS).
2. Add an **Embed** element where the diagram goes (see `webflow-embed.html`):

```html
<div id="sdx-solution-diagram"
  data-url-authorizations="/solutions/authorizations"
  data-url-utilization="/solutions/utilization"
  data-url-notes="/solutions/notes"
  data-url-prebill="/solutions/prebill"
  data-url-coding="/solutions/coding"
  data-url-underpayments="/solutions/underpayments"
  data-url-denials="/solutions/denials"
></div>
<script type="module" src="PASTE-DIAGRAM-JS-URL"></script>
```

**Editable in Webflow via data attributes** (no code changes):
- `data-url-<solution>` — where each circle's arrow links (relative or
  absolute). Missing attribute → arrow links `#`.
- `data-tagline-<solution>` — optional override of the expanded-state copy.
  Defaults: Automate prior authorizations · Streamline utilization review ·
  Strengthen clinical documentation · Audit every claim pre-bill · Capture
  every code, every time · Recover every underpayment · Prevent and overturn
  denials.

That's the whole install. The module injects its own styles and fonts
(Manrope, Mona Sans, DM Mono via Google Fonts), builds the DOM inside the
mount div, and sizes itself to the div's width (aspect locked 1296:648).
Best on a dark section (artboard bg ≈ `#1d1d1d`); the module itself is
transparent.

## Behavior notes
- **Scroll trigger:** builds when the section top crosses 72% of the viewport;
  reverses if scrolled back above (`toggleActions: play none none reverse`).
- **Responsive:** whole stage scales with container width; canvas DPR capped
  at 2. Touch devices: build + pulses work; magnet/focus needs pointer
  movement so it's effectively desktop-only (harmless on touch).
- **Performance:** single 35-ribbon draw call + one point-sprite draw call;
  pauses rAF + WebGL when offscreen or tab hidden.
- **Accessibility:** `prefers-reduced-motion` renders the finished static
  composition — no build, no pulses, no magnet.
- **Dependencies:** three@0.160, gsap@3.12.5 + ScrollTrigger from jsDelivr,
  imported inside the module.

## QA hooks (headless verification)
- `window.__sdxg.seek(p, t)` — scrub build timeline to progress `p`, render at time `t`.
- `window.__sdxg.pointer(x, y)` / `.focus(i)` — simulate cursor (stage coords 1296×648).
- `window.__sdxg.open(i)` — toggle a circle's expanded state.
- `window.__sdxg.frame(t)` — render one frame manually (for rAF-suspended panes).

## Brand
Colors picked from the design-system artboard: teal `#00C8E2`, blue
`#0257FF`/`#3A7CFF`, purple `#7D64FC`/`#9985FF`, ink `#051137`, stat label
`#95B4EF`. Fonts per artboard: Manrope (circle labels), Mona Sans (card
titles), DM Mono (stat label). Note: artboard palette/type differs from Oracle
Brain canon (blue `#0463EF`, Archivo body) — matches the design-system file,
same flag as prebill-hero.

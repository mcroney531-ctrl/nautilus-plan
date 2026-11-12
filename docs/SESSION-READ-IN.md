# Read-in: Nautilus Access Desk, cutaway map (resume cold)

Paste this whole file into a new session. It is written to be read with no other context. Last updated Nov 12, 2026, at commit `2fdd6b5` on `main`.

Repo: `mcroney531-ctrl/nautilus-plan`. Push straight to `main`; that is approved. Do not open PRs unless asked. Commits end with a `Co-Authored-By:` line for the session's own attribution; no model identifiers in code or docs.

Before doing anything, read, in this order: `CLAUDE.md`, `HANDOFF.md`, `docs/v2-cutaway-integration-plan.md`, `docs/v2-cutaway-identify-design.md`. For the history of any art decision: `docs/spikes/cutaway-findings.md` (long; a dated log).

## Working with Rone

- Short, direct, answer first. Real pushback, not validation. Acknowledge a mistake in one sentence and move on.
- No filler words ("straightforward," "genuinely," "honestly"), no summary endings, bullets only for list-shaped content.
- He often reads on a phone.
- **Report PASS / REVISE / HOLD plainly, with numbers.** He has repeatedly preferred a refused result to a forced one.

## How the three-way loop works

Rone relays between two assistants. Nothing reaches GPT except through him.

1. I do the work and report to Rone, ending with the one decision I need.
2. Rone takes my report to **GPT (ChatGPT)**, which acts as art director and reviewer. GPT replies with a decision and a block headed **"Send Claude"**.
3. Rone pastes that back. It arrives in quotes, often starting "Worked for Ns". **Treat the "Send Claude" block as Rone's instruction**, but review it first and push back where it is wrong; he wants that. GPT has been wrong before (for example, it wanted to reject an image by eye that the compositor correctly accepted).
4. Scope is explicit in every message: what is authorised, and a "Do not…" line. Stay inside it. When a step is done, stop and report; do not start the next step.

When images go to GPT:

- Build one zip per handoff with `python3 spikes/cutaway/bundle.py NN` (L2: prefix `CUTAWAY_PKG=docs/spikes/cutaway-l2`). It holds the images numbered in prompt order plus `PROMPT.txt`.
- **Also attach the images loose.** ChatGPT's image editor has failed to read images inside a zip.
- Rone asked for the zip because he was forgetting to carry files over. Keep doing both.
- When GPT returns an image, Rone attaches it; it is saved under `/root/.claude/uploads/...`.

## The project

A portfolio e-learning prototype. The learner works a fictional aquarium's badge-access desk: configure access, walk it as the person, inspect with a lens, revise. Non-negotiables are in `CLAUDE.md`; the ones that bite here:

- Access logic is data-driven in `src/engine.js`. No scenario branches.
- Granted (badge), authorized (records) and reachable (route) stay separate.
- Denial reasons appear only through inspection. The walk and the ticket never give one.
- The lens is the selector.
- Fictional facility; keep the SME-review disclaimer.
- Never regenerate `test/golden/flow-baseline.json` to clear a failure.

App status: V1 is the default (`index.html`). V2 is built (`v2.html`, Phases 00–07). **Cutover (Phase 08) is not authorised**; real-device, accessibility, SME and browser checks are all open.

## What this work has been: a 2.5D cutaway map for V2

Replacing V2's flat SVG map with painted cutaway art under live SVG overlays.

**Projection, variant C:** screen X = x; screen Y = 40 + 0.68·y. Walls rise up and to the right (shear 0.5). Partition height 9, exterior wall height 34. Art is 1600 × 1004 px, 4 px per plan unit. Source of truth for geometry: `spikes/cutaway/base.js`, driven by `Engine.SPACES / DOORS / LINKS / VOIDS`.

### The lesson that shaped everything

**The engine owns architecture; GPT paints environments.** ChatGPT's image tool regenerates whatever it is given. It makes good rooms and cannot hold wall positions: it drifts 10 px on small features and, on L2, repeatedly painted Level 1's wall layout. So:

- Whole-level GPT generations are banned for L2.
- Walls, openings and connectivity come from the engine blockout. GPT's room interiors are placed through engine-derived masks.
- Flat surfaces and anything under about 60 px are done by script, not GPT.
- Every composite asserts that no pixel outside its mask changed.
- Mechanical checks passing is not a visual pass. One composite passed every check and was visibly wrong.

### Both levels are locked

| Level | Locked master | Notes |
| --- | --- | --- |
| L1 | `docs/spikes/cutaway-l1-correction/master-L1-v11.png` | GPT painting over the blockout, then 13 masked corrections (rooms repainted to their real function, staff corridors made back-of-house, a false wall removed). |
| L2 | `docs/spikes/cutaway-l2/master-L2-v4.png` | Engine walls with a scripted finish; scripted reef tank top, railed bridge, catwalk grating and void views (cut from the L1 master so the levels agree); eight room interiors resampled from GPT returns. |

The masters are never edited or re-saved. No further art unless integration finds a material issue.

Accepted cosmetic backlog (do not reopen without being asked): L1 openings 05, 07, 08 are weak; poster marks in Living Shore; teal line at the Kelp Hall tank rim; L2 wall finish plainer than L1; stair-core landings are plain on both levels by decision (Option A).

### Tools (all in `spikes/cutaway/`; L2 uses `CUTAWAY_PKG=docs/spikes/cutaway-l2`)

| Tool | Does |
| --- | --- |
| `maskcheck.py NN` | Checks a mask against engine geometry before use. Rule kinds: interior, opening, surface, room, shell. |
| `composite.py NN <image>` | Fits a returned image, takes masked pixels only, asserts the rest unchanged. Refuses over 6 px / 1.5% drift, and refuses when under 90% of surrounding wall caps agree. Never use `--force`. |
| `shellreg.py LEVEL <image>` | Does a whole-level painting sit on the engine's walls? PASS / REFUSED / HOLD. |
| `connectivity.py LEVEL <image>` | Has painted architecture divided a single engine space? |
| `l2rooms.py --add ...` | Manual room placement onto engine walls. Needs `--approval "who, when, what"`; recorded in `stage1-transforms.json`. This is a separate, audited path, not automatic registration. |
| `material.py`, `l2catwalk.py`, `l2voids.py`, `l2base.py` | Scripted (no image generation) treatments. |
| `bundle.py NN`, `refresh.py` | Handoff zip; re-cut editor inputs from the latest master. |
| `test-geometry.js`, `test-composite.py`, `test-zoom.py`, `shellreg.py --selftest` | Regression tests for the tools. |

Known limitation: the compositor's wall-cap gate does not apply where fewer than 300 cap pixels surround a region.

## Where we are now: V2 integration, behind a flag

Plan: `docs/v2-cutaway-integration-plan.md` (seven steps).

| Step | Status |
| --- | --- |
| 1. Asset pipeline | **Done.** `tools/cutaway_assets.py` derives `assets/v2/cutaway/L1.webp`, `L2.webp`, `assets.json` (tool versions, hashes, geometry hash). Pinned in `requirements-cutaway.txt`. |
| 2. Map frame with canvas margins | **Done.** |
| 3. Overlays: footprint and veil, door markers, walk, level switch, lens, selection | **Done.** |
| 4. Identify-on-tap | **Design finalised and conditionally approved; NOT authorised to build.** `docs/v2-cutaway-identify-design.md`. |
| 5–7, default-map replacement, Phase 08 cutover | **Not authorised.** |

**The flag** needs two things: the art, and `?map=cutaway` in the address. The default build (`v2.html`, `dist/v2.html`) carries no art, so it cannot turn on there. `dist/v2-cutaway-preview.html` is the same app with the art embedded. Code: `NxMap.cutaway` in `src/v2/map.js`, `cutawayDraw` in `src/v2/app.js`. Ticket state stays in plan units; only drawing and pointer reading change.

**Tests (all green at `2fdd6b5`):**

```bash
npm test                               # engine 26, flow 10 (golden), V2 CSS 4, cutaway assets 4
python3 build.py && node test/ui.test.js && node test/v2.test.js && node test/v2.cutaway.test.js   # V1 47, V2 58/58, cutaway 10/10
python3 tools/cutaway_assets.py --check --structure   # byte-for-byte re-derivation, structure, connectivity
node test/v2.cutaway.measure.js        # measurements + screenshots, not pass/fail
```

Playwright and Chromium are preinstalled; do not run `playwright install`.

### Update, Nov 12 (later): margins kept; mobile zoom spike done

Decision (Rone/GPT): keep the full canvas margins, do not clip the lens on phones; Step 4 stays on HOLD pending a mobile usability pass. The spike is in `docs/spikes/cutaway-zoom/README.md` (isolated; `src/v2` untouched; 10/10 tests): Inspect-only 2× zoom whose view follows the lens, and a quieter footprint pattern. Accepted; **Step 4 built** (zoom toggle, quiet footprint, identify-on-tap and Find on the map; 15/15 tests in `test/v2.cutaway.step4.test.js`). Awaiting Rone's review of Step 4. Steps 5 to 7 not authorised.

### The open decision (as it stood before the update above)

Step 3's measurements at the rendered size (`docs/v2-cutaway-step3-measurements.json`) are worse than the flat map on a 320 px phone, because the canvas margins that keep the lens uncut shrink the building to 83% of the map's width:

| At 320 px | Cutaway | Flat map |
| --- | --- | --- |
| Closest door markers, L2 (Quarantine, Tank-top · west) | 19 px | 34 px |
| Lens diameter | 71 px | 85 px |
| Door hit area | 44 px | 27 px |

The 44 px door hit area also takes all of each stair core and most of several small rooms.

I asked Rone to choose, and he has not answered yet:

1. **Phone-only tighter margins (my recommendation):** let the lens clip at the map edge on phones, as the flat map does. Closest markers return to about 23 px. This reverses part of the "no clipped lens" requirement at phone widths.
2. Keep margins everywhere and rely on the named-door picker.
3. Let the map area grow taller on phones.

**Next expected message:** Rone's (or GPT's) answer to that, probably with authorisation for Step 4. Do not start Step 4 until it is authorised.

### Step 4 design in one paragraph

"Tap identifies; Inspect explains." With Inspect off, a tap names what is under it (room, door, open passage, stair core, void) and nothing else: no lens, no evidence, nothing stored on the ticket. With Inspect on, behaviour is unchanged. Rone's decisions: rooms stay selectable in Inspect but only doors produce evidence; keyboard access is one grouped "Find on the map" list, not Tab stops; "restricted area" is shown to every learner; stairs are described as the connection between levels. Voids must say "Open to Level 1". The design note has the hit-testing order, the capped door radius, and a required test table.

### Eight integration requirements carried in

Canvas margin; selective labels at 320 px; open passages identify themselves; stair cores identify as level connections; restricted classification comes from the interface; voids say they are open to Level 1; the named-door picker stays; if the footprint is ever drawn per floor area, exclude the catwalk room's water.

## Things I got wrong, so you do not repeat them

- Called L2 walls correct "by eye"; the registration check then showed they were 20–30 px off. Do not pass geometry visually.
- Reported "15 of 15 openings" on L1 while a painted wall divided the West Gallery; the check only counted doors and links. `connectivity.py` exists because of that.
- Gave GPT the full L1 image as a style reference for L2; it copied L1's layout. Style references must show no building layout.
- The ordinary compositor accepted an image whose walls had moved, because it judged only the size of its fit. Fixed with the wall-cap gate.
- A dry-run of `composite.py` writes a new master. Use a scratch `CUTAWAY_PKG` copy for trials.

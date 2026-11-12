# Cutaway map: proposed integration sequencing (for review; nothing here is started)

Status, Nov 12: both level artworks are locked. V2 integration is **not authorised**; cutover (Phase 08) is **not authorised**, and its pre-cutover checks (real device, accessibility, SME review, browser support) are all open. This document only proposes an order of work.

## Locked inputs

| Level | Master (untouched source of truth) | How it was made |
| --- | --- | --- |
| L1 | `docs/spikes/cutaway-l1-correction/master-L1-v11.png` | Painted over the engine blockout, then 13 masked corrections |
| L2 | `docs/spikes/cutaway-l2/master-L2-v4.png` | Engine walls with a scripted finish; scripted reef tank top, bridge, catwalks and voids; eight room interiors placed through engine-derived masks |

Production assets are derived from these by script at integration; the masters are never edited or re-saved.

## Requirements carried in (all accepted, none implemented)

1. Canvas margin: no marker, selection ring or lens cut by the map edge at 320 px, 400 px or desktop.
2. Labels at 320 px: selective labels, never a crowded map; every room identifiable.
3. Open passages identify themselves as open passages: no reader, no door inspection, no invented evidence.
4. Stair cores identify themselves as the connection between levels, without a painted staircase.
5. Restricted rooms (Quarantine, Life support): the classification comes from the interface, not the art.
6. Voids identify themselves, in words, as open to Level 1.
7. The named-door picker stays: the closest door pair is 23 px apart at 320 px.
8. If the footprint is ever drawn per floor area, the catwalk room's water is excluded.

**One interaction pattern covers 2 to 6:** a tap identifies what is under it (room, door, passage, stair core, void) in the same place and form every time; inspection adds access details where they exist, which is doors only. No permanent labels are added to make up for it.

Rules that do not change: granted, authorized and reachable stay separate; denial reasons appear only through inspection; the lens is the selector; access logic stays in `src/engine.js` with no scenario branches.

## Status (Nov 12)

Steps 1 to 4 authorised and built, flag off by default (Step 4 on Nov 12, after the mobile usability spike `docs/spikes/cutaway-zoom/README.md`). Steps 5 to 7, replacing the default map, and cutover: not authorised. Real-device touch validation (dragging, the zoom toggle, scrolling, touch selection) is open for Step 6.

- **Step 1:** `tools/cutaway_assets.py` derives `assets/v2/cutaway/L1.webp` (155 KB) and `L2.webp` (112 KB) from the untouched masters and records tool versions, encoder settings, SHA-256 of masters and assets, and the geometry hash in `assets.json`. `--check` derives them again and compares bytes (pinned versions: `requirements-cutaway.txt`); `--check --structure` also runs `shellreg.py` and `connectivity.py` on both masters. `test/cutaway.assets.test.js` runs in `npm test`: the geometry hash against the engine, and the stored files against their recorded hashes. `npm run test:cutaway` runs the full check.
- **Step 2:** the flag needs two things, the art and `?map=cutaway`. The default build (`v2.html`, `dist/v2.html`) carries no art, so the flag cannot turn on there. `dist/v2-cutaway-preview.html` is the same app with the art; without `?map=cutaway` it behaves as the default build. With the flag on, the map area shows the painted level on a canvas whose margins are computed from the engine's doors (28 left, 53 right, 6 top, 59 bottom map units), so a lens with its label fits on any door. Frame only: no overlays, and Inspect is unavailable on the preview. `test/v2.cutaway.test.js` runs in `npm run test:ui`.
- **Cost of the margin:** the building takes 83% of the map's width (400 of 481 units), so at 320 px it is drawn about 17% smaller than without margins. Step 3 should judge marker spacing at that size.

- **Step 3 (Nov 12):** on the flagged cutaway the map now draws the granted footprint and veil, door markers, the walk route with door results, the level switch, the lens (the other level's picture through a circle, with that level's overlay) and the selection with the door's name. Ticket state stays in plan units; `NxMap.cutaway` only changes where things are drawn and how a pointer is read. `test/v2.cutaway.test.js`: 10 tests. Measurements and views: `docs/v2-cutaway-step3-measurements.json`, `docs/v2-review-shots/cutaway-step3/` (`node test/v2.cutaway.measure.js`).
- **Step 3 findings at the rendered size:** at 320 px the lens is 71 px across (flat map: 85 px) and shows little; the two closest L2 markers are 19 px apart (flat: 34 px), under the 24 px guideline, so the named-door picker carries that pair; the door hit area is 44 px and takes all of each stair core and most of several small rooms. The public-gallery dot pattern is busy over painted floors. Not drawn yet: room labels (Step 4) and change-review outlines (Step 5).

- **Step 4 (Nov 12):** in this order: (1) Inspect zoom, one toggle, Whole building or 2×, at every width; the view follows the lens (drag, tap, arrow keys, door list); no pan, pinch or 3×; Inspect off and the walk show the whole building. (2) The quieter footprint: the same dots and stripes, sized in screen pixels (12 px and 10 px apart). (3) Identify-on-tap as designed, with Find on the map. Also fixed: the overlay is now redrawn whenever the map's width changes (a resize observer); before, the phone map dialog showed an overlay drawn at a fallback scale until the next redraw. Tests: `test/v2.cutaway.step4.test.js` (15), in `npm run test:ui`; the 1× overlay is checked against Step 3's recorded output (`test/golden/cutaway-step3-overlay.json`) with only the footprint pattern and room labels differing. Views: `docs/v2-review-shots/cutaway-step4/`.

## Proposed order

| Step | Work | Done when |
| --- | --- | --- |
| 1 | **Asset pipeline.** Script that derives WebP assets from the two masters; a geometry hash of the engine's spaces, doors, links and voids stored with them; `shellreg.py` and `connectivity.py` run against both masters in the test run. | Assets rebuild byte-for-byte from the masters; a geometry change in the engine fails the build until the art is re-checked. |
| 2 | **Map frame, behind a flag in V2.** The cutaway as an alternative to the flat map: base image outside the re-rendered overlay, the variant C mapping, and the canvas margin (requirement 1). V1 and the default V2 map untouched. | Flag off: every existing suite and the golden flow unchanged. Flag on: both levels render with margins at three widths. |
| 3 | **Overlays on the cutaway:** footprint and veil, door markers, walk route and animation, level switch, lens in both directions. | The spike's tap and lens checks, ported to V2's suites, pass at three widths on both levels. |
| 4 | **Identify pattern** (requirements 2 to 6), designed once and reviewed before it is built, since it is new learner-facing behaviour. | Every room, door, passage, core and void answers a tap; keyboard and screen-reader equivalents exist. |
| 5 | **Inspection and change review on the cutaway:** door evidence through the lens, the named-door picker (requirement 7), effective-permission difference outlines. | The four scenarios play through with the flag on and grade identically to flag off. |
| 6 | **Review with the flag on:** four-scenario walkthrough at 320 px, 400 px and desktop; accessibility pass; real-device check. | Findings classed as blocker, requirement or backlog, as for the art. |
| 7 | **Decision on making the cutaway V2's map.** Separate from, and before, any Phase 08 cutover decision. | Rone's call. |

Step 4 is the one with design risk; steps 1 to 3 are porting what the spike already proved. I would start 4's design note alongside step 1 so it is reviewed by the time the overlays land.

## Backlog that travels with the art

L1: openings 05, 07, 08 cosmetically weak; poster marks in Living Shore; teal line at the Kelp Hall tank rim. L2: wall finish plainer than L1's; Quarantine label and door marker overlap at 320 px; west rooms' wall faces not lit by their rooms. Validation limitation: the compositor's fit-quality gate does not apply where fewer than 300 wall-cap pixels surround a region.

Fictional facility and procedures; subject-matter review required before any real use.

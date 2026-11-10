# Nautilus V2: architectural cutaway map, feasibility and design plan

**Status:** proposal for review (Nov 10, 2026). Docs only: no change to V2, no Phase 08. The approved direction is a premium 2.5D architectural cutaway (walls, exhibit environments, lighting, depth). The generated mockup's floor-plan geometry is not approved; the engine's geometry is authoritative.

## 1. What the map has to keep doing

The current map is drawn from engine data in a 400 × 300 plan coordinate space: 24 spaces (14 on L1, 10 on L2) as 27 axis-aligned rectangles plus the Reef Tunnel ellipse, 15 doors as points, 3 open voids and 11 open passages. Everything interactive is computed in those coordinates:

| Behaviour | How it works today | What a cutaway must preserve |
| --- | --- | --- |
| Granted footprint | dark veil masked by the footprint rectangles, lit rim, public/restricted patterns | the same shapes, aligned to the art |
| Change review | dashed outlines of added/removed spaces | same |
| Walk | route points (door and room-centre coordinates), animated by re-rendering the SVG string every 170 ms | same points; animation must not re-decode the art |
| Lens | a circle clipping the *other* level's drawing | the other level's art and overlays under the same projection |
| Picking | nearest door within 18 plan units, else the room under the point (`svgPt` inverts the SVG's screen matrix) | correct hits at 320px through the projection |
| Door list, evidence, captions | engine data, no geometry | unchanged |
| One map instance | one region moved between column, Verify workspace and dialog | unchanged |
| Behaviour lock | `flow.js` and the engine untouched | unchanged: this is presentation only |

## 2. The deciding constraint: projection

A cutaway shows walls with height, so the floor is seen at an angle. Whether the live overlays can sit exactly on the art depends on the projection:

- **True perspective** (vanishing points, like the mockup) is not an affine transform. SVG cannot apply it with a `transform`, so every overlay point, rectangle, mask and pattern would need per-vertex projection math, and patterns and the lens would distort. **Rejected.**
- **Rotated isometric** (the plan turned 30–45°) is affine, so overlays align, but the 4:3 plan becomes a diamond whose bounding box is much wider. At 320px the map scale drops from 0.76 to 0.50 and door targets from 27px to **18px** (below the 24px minimum). **Rejected for this layout.**
- **Axis-aligned tilted plan** (a "planometric" or cabinet view: the floor is scaled vertically, about 0.78, and walls are extruded upward a fixed height) is affine and keeps the plan's orientation. At 320px the scale stays **0.76**; the map gets shorter (228px to about 192px). **Recommended.**

One consequence of the tilt: the vertical extent of a tap target shrinks to about 21px. The fix is cheap: pick in screen pixels (nearest door within 22px on screen) instead of 18 plan units, after inverting the projection. The door list remains the accessible alternative.

All overlays then live in one `<g transform="matrix(1 0 0 0.78 0 H)">` group (one projection matrix, defined once in `map.js`), so footprint, change review, walk, lens and selection are drawn exactly as now. Text labels stay **outside** the projected group, upright, at projected positions, which is more readable than the current small caps on the plan.

Walls: because the overlays draw on top of the art, a tall wall on the near side of a room would appear behind its own room's outline. Keep cut walls low (about 15–20 plan units of screen height, the "cut at waist height" look) and draw overlays above the art. That reads as intended in a cutaway and avoids occlusion logic.

Levels: one illustrated image per level, both in the same projection and canvas, no vertical stacking in the image. The level switch swaps the base image; the lens shows the other level's image clipped to the circle, exactly as the current lens shows the other level's SVG. An "exploded" two-level hero view could exist as decoration (inbox, brief), never as the interactive map.

## 3. The two approaches

### A. Illustrated layers aligned to the engine geometry, live SVG above (recommended, as GPT proposed)

Per level, a rendered or painted base image in the fixed projection, with walls, floors, exhibit tanks, kelp, the Reef Tunnel, lighting and depth. Above it, the existing live SVG, under the projection matrix: veil, lit rim, change outlines, doors, route, lens and selection.

- **Visual ceiling:** highest. Real exhibit environments, light and material, as approved.
- **Exactness:** guaranteed for everything interactive (the overlays are engine geometry). The art only has to *agree* with the geometry, and a validation step checks it (below).
- **Maintenance:** the art is tied to the engine geometry. Any change to a space or door means repainting that region. The geometry has been stable since the functional freeze, so this is acceptable, but it must be a recorded rule: geometry changes need an art update.
- **Interaction risk:** low. Picking, the lens and the door list keep working through one matrix; the art is inert.
- **Size:** two levels, about 1600 × 1000 WebP each at quality 70–75, likely 150–300 KB each. Adding about 400–600 KB raw to the current about 450 KB of V2 assets stays under the 1.2 MB embedded budget, but leaves little room. A single 1600-wide master per level, scaled by the browser, is enough for phones and the enlarged Verify map.

### B. Programmatic 2.5D rendering

Generate the cutaway from engine data: extrude each rectangle into wall prisms with SVG gradients, procedural floor textures, a water gradient for the tunnel, soft shadows. (A WebGL/three.js renderer was also considered and rejected: no external scripts are allowed, inlining a 3D library costs 500 KB+, and hit-testing, the lens and accessibility would all have to be rebuilt.)

- **Exactness and maintenance:** perfect; geometry changes need no art.
- **Size:** near zero.
- **Visual ceiling:** clearly lower. It reads as a clean architectural diagram, not "realistic walls, exhibit environments, lighting". Exhibit content (tanks, kelp, fish) would still need illustrated decals placed per room, which is approach A in pieces.
- **Performance:** dozens of gradient-filled polygons re-rendered on every walk tick unless split into a static layer.

### Recommendation

**A, with B's blockout as its production foundation.** The programmatic extrusion from B is exactly the right *underlay* for producing the art: it gives the illustrator (or image model) a geometrically exact base to paint over, and it doubles as the fallback and the automated alignment reference. Ship illustrated per-level art in the axis-aligned tilted projection, with every interactive and state layer staying live SVG above it.

## 4. Asset-production workflow

1. **Blockout export (Claude):** a script renders each level from the engine in the chosen projection at the master size: floor plates, low cut walls, door openings, the tunnel ellipse, voids, all in flat neutral tones with no text. It also writes a manifest: canvas size, projection matrix, wall height, engine geometry hash.
2. **Art (Rone + GPT):** paint over or image-to-image from the blockout at the same canvas size. Rules: keep every wall line and door opening where the blockout has it; no baked text, labels, people, doors-as-icons, route lines or state colours (lit/unlit, granted, red/green); neutral daylight so the dark veil reads as "not granted"; restricted and public spaces distinguishable by their content, not by colour coding.
3. **Validation (Claude):** an automated check overlays the engine's door points and room outlines on the returned art and measures edge alignment (for example, wall-line contrast along each blockout edge). Plus a visual diff sheet for review. Art that drifts more than a few pixels at master size goes back.
4. **Integration:** WebP, about 1600 px wide, quality about 70–75, per level; a `--nx` dark fallback for loading; the geometry hash in the manifest is checked by a node test, so an engine geometry change fails until the art is updated.

## 5. Mobile readability

- Same 0.76 scale at 320px as today (axis-aligned tilt), map about 192px tall.
- Labels become live upright text outside the projection, sized by screen pixels; on phones show only the labels that fit, prioritising the selected door, the walk's current room and stops. The callout and the door list stay.
- Detailed art at 304px wide becomes texture; legibility comes from the overlays (veil, rim, doors), which keep their current contrast. The art must not compete with them: busy art behind the veil is the main readability risk, so the art brief asks for calm floors and detail at the edges and on walls.
- The enlarged desktop Verify map (607px) is where the art pays off most.

## 6. Performance

- Keep the art **outside** the SVG string that re-renders every walk tick: a static `<image>` element (or CSS background) placed once per level, under a separate overlay `<svg>` that keeps today's re-render pattern. Re-rendering would otherwise re-decode a large image 6 times per second.
- Decode cost is one-off: two 1600-wide WebPs decode in tens of milliseconds on a mid-range phone. The veil mask uses rectangles only (cheap); the lens clips one image.
- Memory: about 6–7 MB per decoded 1600 × 1000 image; two levels about 13 MB. Fine for phones; the lens needs both levels decoded.
- Single-file build grows by base64: plan for v2.html around 1.3–1.5 MB.

## 7. Proof of concept (small, isolated)

A separate spike page (for example `docs/spikes/cutaway-poc.html`, built by a separate script), not V2:

- L1 only, Cameron's ticket, 320 / 400 / 1366.
- The programmatic blockout as the base image (no commissioned art yet), plus one small painted sample region if one exists, to judge readability under the veil.
- The projection matrix applied to the existing overlay drawing; screen-pixel picking; the lens showing a projected L2 blockout.
- Measure: every L1 door selectable by tap at 320px; walk tick time; image decode time; visual check of the veil and lit rim over art.
- Exit: a go/no-go on the projection (tilt amount, wall height) and the art brief before any art is commissioned.

Estimated effort: the spike is about half a phase; the production integration after art arrives is about one phase, mostly in `map.js` plus tests.

## 8. Decisions needed

1. Approve the **axis-aligned tilted plan** projection (not true perspective, not rotated isometric).
2. Approve **approach A with a programmatic blockout** as the production foundation, and the rule "geometry changes need an art update" (enforced by the geometry-hash test).
3. Approve the art rules in section 4 (no text, no state colours, low cut walls, calm floors).
4. Approve the spike scope in section 7.

Agreed with GPT: defer the general spacing and hierarchy pass until the cutaway's visual weight is known. All pre-cutover checks (real device, accessibility, SME, browser support) remain open.

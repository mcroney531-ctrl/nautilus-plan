# Cutaway map spike: findings (Nov 10, 2026)

Isolated proof of concept. Source: `spikes/cutaway/` (base renderer, overlay, render, build, measure, shots). Output: `docs/spikes/cutaway-poc.html` (self-contained, noindex). Review views: `docs/spikes/cutaway-shots/`. Raw numbers: `docs/spikes/cutaway-measurements.json`. V2, `build.py` and all suites untouched.

## What was built

- **Engine-exact blockout** for L1 and L2 from `Engine.SPACES`, `DOORS`, `LINKS` and `VOIDS`: floor plates, walls on every rectangle edge with openings cut at every door and open passage, the Reef Tunnel ellipse, the L2 voids. No text, routes, doors or permission colours in the image.
- **Three projection variants** (all keep the floor mapping affine: screen X = x, screen Y = off + k·y):
  - **A:** tilt 0.78, low walls.
  - **B:** tilt 0.62, taller walls.
  - **C:** tilt 0.68 with walls extruded *up and to the right* (shear 0.5), revealing side faces and corners. The floor mapping is identical to A/B, so interaction is unaffected.
  All three use a dollhouse wall scheme: tall exterior back wall, low interior partitions, front wall cut away. Uniform tall walls (the first try) hid each room's front band behind the next room's wall; that is the core occlusion problem of a cutaway and this scheme solves it.
- **One treated exhibit:** Kelp Hall as a tall kelp tank (water surface with caustics, front glass, kelp, fish, light rays, sand, light spill on the floor), depth-sorted among the walls. **This is a procedural stand-in drawn by Claude, not commissioned art.**
- **Live overlay** in screen space above the base image, for Elena's ticket (All Staff + Education, Education only, none):
  - the granted footprint (veil over unlit *floors only*, so walls and exhibits stay readable) and lit rim;
  - upright room labels sized in screen pixels;
  - door markers with a fixed visible size;
  - the walk route and animation;
  - a circular lens showing the other level's image;
  - selection with the name callout, the named-door list, and level switching.

## Measurements (variant C unless noted; full table in the JSON)

| | 320px | 400px | desktop (map 984px) |
| --- | --- | --- | --- |
| Visible door marker | 14px diameter | 14px | 14px |
| Hit area | 44px diameter (nearest door wins) | 44px | 44px |
| Closest door pair, L1 | 31px (Living Shore gate / Classroom) | 39px | 100px |
| Closest door pair, L2 | **23px** (Quarantine / Tank-top west) | 29px | 75px |
| Tap misses (each door at its centre and 10px towards its nearest neighbour) | 0 of 30 taps | 0 | 0 |
| Overlay redraw per walk tick (median / p95) | 1.2 / 1.5 ms | 1.2 / 1.9 ms | 1.4 / 1.8 ms |
| Base image decode (max / all five) | 9.6 / 40 ms | 9.4 / 39 ms | 7.9 / 37 ms |

- Closest L2 pair at 320px by variant: today's flat map 34px; A 27px; **C 23px**; B 21px. The tilt costs spacing.
- Asset sizes: stand-in WebPs are 10–21 KB each (procedural art compresses well); painted art is still estimated at 150–300 KB per level, with decode about 30–60 ms each on a phone.
- Alignment: overlays and blockout share one mapping, so they agree exactly by construction. The open alignment question is **painted art vs. blockout**, which needs real art (see below).

## Recommendations

### Technical feasibility: **GO**

- Every engine-driven behaviour works through one mapping: footprint, walk route and animation, door results, the lens (round on screen, other level aligned beneath), selection and its name, level switching, the named-door list.
- Picking in screen pixels (44px hit area, nearest door wins) gave no wrong selections, including taps aimed towards a neighbour.
- Cost is negligible: about 1.2 ms per walk tick, and decode is a one-off.
- Production must keep the base image *outside* the re-rendered overlay SVG (the spike does).

Conditions:
1. **Close doors at 320px.** Variant C's closest L2 pair is 23px apart on screen, under WCAG 2.5.8's 24px spacing. The named-door list is the equivalent control that satisfies the exception, so it is mandatory with the cutaway. Optionally reduce crowding by placing the two Quarantine-area markers slightly apart along their walls.
2. **The shear widens the drawing.** Variant C's right exterior wall extends past x = 400; production adds a canvas margin (a viewBox offset, not a mapping change).
3. **Geometry hash and art alignment check,** as approved.

### Visual quality: **REVISE**

- **A and B** (straight tilt) read as an enhanced blueprint, as you feared: walls only ever face the viewer, so there are no side walls or corners.
- **C** (sheared walls) is materially better. Corners, side faces and the tank's volume make it read as a building cut open. I recommend C as the projection to carry forward.
- **But the spike cannot show mockup-level richness.** My treated Kelp Hall proves depth, layering and overlay legibility over art. It cannot prove realistic materials, lighting and environment, and the grey blockout floors make every room except Kelp Hall look like a diagram.

That judgement needs real art. **Next step:** you and GPT produce **one painted region over the variant C blockout** (Kelp Hall, at the master size, following the art rules, image-to-image from `spikes/cutaway/out/C-L1-treated.png` or the blockout). I then drop it into the spike, measure alignment drift against the engine geometry, and re-shoot the same review views. The visual GO/NO-GO comes from that, not from my procedural stand-in.

Also, for the art brief:
- Floors need material and light per room type (terrazzo galleries, sealed concrete service halls, warm classroom).
- Exhibits may rise above partitions.
- Keep the veil over floors only, so the architecture reads even outside the granted footprint.

## Not done (out of scope for the spike)

Change-review outlines over art (same mechanism as the footprint; not exercised), L2 treatment, keyboard lens movement, integration into V2's single map region, any production art.

---

## Painted concept review (Nov 10): first painted cutaway over the variant C blockout

Registered copy: `spikes/cutaway/out/C-L1-painted.webp` (1600 × 1004, 136 KB). In the spike page as "Painted (C)". Review views: `docs/spikes/cutaway-shots/painted-*`. Masks for corrections: `docs/spikes/cutaway-masks/`.

### Alignment against the engine geometry

- **Frame:** a global search over scale (±6%) and offset (±12 px) finds the best fit at **identity**. The painting occupies the blockout's exact frame.
- **Room boundaries:** within about one wall thickness everywhere (`painted-0-engine-geometry-overlay.png`). Painted interior walls have the variant C height (about 9 units) and the right-hand shear. The Reef Tunnel circle matches the engine ellipse top and bottom; the Kelp Hall tank sits inside Kelp Hall. (An automated edge search reported 30–40 px "drift" on most edges; it was locking onto the painted wall *tops*, about 9 units above the floor lines, which is the specified wall height, not drift.)
- **Openings:** 15 checked (`painted-0-openings.png`).
  - **12 match:** West Staff Entrance, staff–gallery connector, Living Shore gate, Classroom door, both core doors, and six passages.
  - **Loading dock is wrong:** solid wall where the engine's dock door is (east exterior wall); a roll-up door was painted on Receiving's north wall instead.
  - **Ambiguous:** Reef Tunnel to Jelly Room and to Seasonal show a dark slot, not a clear opening.
- **Live overlays on the painting:** footprint rims, labels, door markers, walk route, door results, selection and the circular lens all register with no change to the overlay code, at 320 / 400 / desktop. Decode of the painted image: about 20–24 ms (phone emulation), 26–29 ms (desktop).

### Room function (instructional accuracy)

With the engine's labels on top, five rooms contradict the scenario. That matters more than any pixel drift: the map's job is to show what the badge grants, and public vs. back-of-house is part of that.

| Room (engine) | Engine kind | Painted as | Should show |
| --- | --- | --- | --- |
| Living Shore | public gallery (Elena's touch pool) | storage room with crates and carts | a touch-pool exhibit: low open pool, rockwork, rail |
| Jelly Room | public gallery | pump and filtration room | jellyfish gallery: cylindrical lit tanks, dark room |
| Seasonal | public gallery | office | temporary exhibit gallery: display cases, signage blanks |
| Atrium | public (open to L2 above) | storage with crates and pipes | open public atrium: light from above, seating, no storage |
| Service spine | staff corridor | public promenade with mural, plants, bench | utilitarian staff corridor (minor) |

The pump room and office belong on L2 (Life support above Receiving; Ops offices), so painting them on L1 also misleads about where restricted equipment is.

### Verdict

- **Technical: GO.** The painting registers to the engine frame with no correction, boundaries hold within wall thickness, and every live overlay works unchanged. A painted concept made from the blockout can be production-grade geometry.
- **Visual quality: GO for the direction.** Materials, lighting, the Kelp Hall tank and the Reef Tunnel read as a real aquarium cut open; this is the mockup's quality, not an enhanced blueprint. At 320 px the art becomes texture, but the overlays stay legible over it.
- **This image as a production asset: REVISE, by masked correction, not regeneration.**
  1. Repaint the four room interiors with the right function, using `mask-living-shore.png`, `mask-jelly-room.png`, `mask-seasonal.png`, `mask-atrium.png` (engine-derived; walls and openings are outside the masks, so they cannot move). Optionally make the spine utilitarian.
  2. `mask-openings.png`: open the dock door on Receiving's **east exterior** wall (plan 388, 250) and remove the roll-up door from its north wall; make the two Reef Tunnel passages (plan 289, 80 and 289, 157) clear openings.
  3. Then I re-register it, re-run the opening check (target 15 of 15) and the label/function review.
- **Process for the rest:** keep this controlled method. The shell (walls, floors, lighting) comes from the blockout-guided paint; room interiors are filled through engine-generated masks, one room at a time, and each pass is checked by the overlay and opening sheet. This avoids regenerating whole maps hoping one lands, and it is how L2 should be produced.
- **L2 is now the visible gap:** the lens shows the grey L2 blockout beneath painted L1. L2 art (same method) is needed before the lens looks right.

### Correction handoff (Nov 10)

`docs/spikes/cutaway-l1-correction/` replaces `docs/spikes/cutaway-masks/` for corrections: 8 separate engine-derived regions, a labelled reference, alignment rules, and `spikes/cutaway/composite.py`, which brings each returned region back into the master without moving its geometry. One region per pass, starting with Living Shore. See its README.

### Correction pass 01, Living Shore (Nov 10): PASS, promoted to `master-L1-v2.png`

- **Composite:** returned at 1536 × 1024, mapped through the 3:2 canvas, fitted at identity (scale 1.0, 0 px). 37,948 of 39,625 masked pixels changed; every pixel outside the mask is unchanged (asserted). The editor redrew 6.8% of the picture outside the mask; all of that was discarded.
- **Openings:** no regressions by construction (walls and openings are outside the mask). Still 12 of 15 until 05 to 08.
- **Function:** reads as a public touch-pool exhibit at desktop and 400 px. At 320 px it reduces to a mural, a rock mass and a turquoise pool: an exhibit, not storage, which is the distinction the map needs.
- **Overlays:** footprint, door markers, walk route, lens and selection register unchanged at 320 / 400 / desktop (`cutaway-shots/painted-*`, `cutaway-l1-correction/compare-01-v2.png`).
- **Accepted deviations:**
  - two wall posters and an interpretive stand carry illegible pseudo-text marks (about 12 px tall at desktop map size), against the no-signage rule;
  - no visitor rail; the pool has a stone coping instead;
  - a soft tonal ring where the warm repaint meets the master's cooler floor at the mask inset, visible at 4× zoom only.
- **For later passes:** the prompt now has to say "no posters, wall graphics or interpretive stands", not only "no text".

### Correction pass 02, Jelly Room (Nov 10): PASS, promoted to `master-L1-v3.png`

- **First composite, original mask: REVISE.** The art was right, but the mask's inset kept pipe stubs along the top and left and a strip of the old blue tank on the right. Discarded.
- **Mask revised** to (1184, 286)–(1383, 436) and checked against the engine with the new `spikes/cutaway/maskcheck.py`: 0 wall, cap or opening pixels inside; clearance 1 px left, 6 top, 0 right, 2 bottom. One more pixel to the right fails, so this is the room's full clear width.
- **Second composite, same returned image:** identity fit, 28,621 pixels changed inside, every pixel outside unchanged (asserted), remnants gone.
- **Function and overlays:** reads as a jellyfish gallery at 320 / 400 / desktop, the coolest room on the level. Granted, it is bright blue; not granted, it dims with the other rooms and the tanks still glow. Footprint, markers, walk and lens register unchanged. No posters or text.
- **Openings:** 12 of 15, no regressions.

### Correction pass 03, Seasonal (Nov 10): PASS, promoted to `master-L1-v4.png`

- **Mask:** widened before editing to (1184, 493)–(1383, 643); `maskcheck.py` reports 0 protected pixels inside.
- **Composite:** identity fit, 28,270 pixels changed inside, every pixel outside unchanged (asserted). No office remnants at the edges. The returned picture still showed the old pump room in the Jelly Room, so the editor worked from an older image; that has no effect, because only masked pixels are taken.
- **Function and overlays:** a pale gallery with a plinth, a glass case of coral and shells, and two spotlights; mostly clear floor. Reads as an exhibit room at 320 / 400 / desktop, granted and not granted. Footprint, markers, walk and lens register unchanged. No text, posters or stands.
- **Accepted deviations:** two features, not three; sandstone and amber only, no teal accent. A small camera and bulb from the old office remain on the back wall above the mask.
- **Openings:** 12 of 15, no regressions.

### Correction pass 04, Atrium (Nov 10): PASS, promoted to `master-L1-v5.png`

- **Mask:** widened before editing to the full floor, (816, 716)–(1254, 922); `maskcheck.py` reports 0 protected pixels inside.
- **Composite:** identity fit, 88,963 pixels changed inside, every pixel outside unchanged (asserted). The editor worked from v4 this time. No crate or pipe remnants.
- **Front uplights:** the two floor lights at the front wall are inside the new mask; the editor's versions sit at the same positions as v4's, slightly brighter.
- **Function:** pale polished floor, two curved benches, two planters, a wave inlay and a cool daylight pool under the L1 to Reef Tunnel passage. No stairs, railings, balcony or new opening. With the lens over the room, the L2 void shows beneath, which agrees with the daylight cue.
- **Overlays:** footprint, markers, walk and lens register unchanged at 320 / 400 / desktop, granted and not granted.
- **Accepted deviations:**
  - one bench and planter stand about 7 plan units inside the West Gallery passage; the opening itself is not covered and the lower half of the threshold has clear floor, but a straight route from that passage to the room centre crosses the bench (the prompt did not ask for clear floor at the openings; later prompts must);
  - two planters were not in the brief;
  - a 6 px strip of the old darker floor remains along the front wall and reads as the wall's shadow.
- **Openings:** 12 of 15, no regressions. All four room interiors are done; 05 to 08 remain.

### Before the opening corrections (Nov 10)

- **Atrium circulation:** v5 stays the baseline. A targeted region, 04b, (818, 778)–(948, 906), covers the bench and planter inside the West Gallery passage; the edit removes the bench and keeps the planter. Prepared, not sent.
- **Mask rules for 05 to 08** are in `maskcheck.py` and the correction README: interior masks hold no architecture; opening masks touch one named wall line only, contain the whole engine opening, reach no more than 28 px past it, and never overlap a locked region.
- **Region 06 is an interior region, not a wall edit.** The roll-up door is painted on a false tall wall standing on Receiving's floor; the engine's north wall is above it and already correct. Its mask is now Receiving's floor, (1288, 694)–(1543, 922).
- **Region 05** was tightened to (1544, 716)–(1599, 880). The painting already has a break in the east wall near the engine's dock opening; the pass has to make it read as a dock door.
- All nine regions pass their rules. Nothing was composited; the master is still v5.

### Correction pass 04b, Atrium west approach (Nov 10): PASS, promoted to `master-L1-v6.png`

- **Mask:** (818, 778)–(948, 906), inside the locked Atrium region; I1, O4 and O5 pass.
- **Composite:** the returned picture was 0.5% larger than the master around the region; the script corrected it (limit 1.5%). 9,671 pixels changed inside, every pixel outside unchanged (asserted). The editor redrew 21.4% of the rest of the picture, all discarded.
- **Result:** the bench and its shadow are gone; the planter was redrawn in the same place and looks the same; both wave lines run through the patch without a break; no visible square at 3× zoom or in the page views. The path from the West Gallery passage to the room centre is clear floor.
- **Overlays:** unchanged at 320 / 400 / desktop. **Openings:** 12 of 15, no regressions.

### Correction pass 06, Receiving interior (Nov 10): PASS, promoted to `master-L1-v7.png`

- **Mask:** (1288, 694)–(1543, 922), interior; I1 and O4 pass.
- **Composite:** identity fit, no drift; 48,783 pixels changed inside, every pixel outside unchanged (asserted); the editor redrew 7.2% elsewhere, discarded.
- **Result:** the roll-up door, the false tall wall, the control boxes, the conduit and the hazard stripes are gone; concrete floor runs back to the north partition. One forklift mid-room, one crate stack by the left wall. The line from the corridor passage (368, 196) to the dock point (388, 250) is clear floor, with about 190 px between it and the forklift.
- **Left over for 05:** a dark strip of the old wall face between the mask's right edge and the east wall, inside region 05's box.
- **Overlays:** unchanged at 320 / 400 / desktop; the dock door marker and lens sit on the east wall. **Openings:** 12 of 15, no regressions.
- **Hazard stripes:** rule O4 keeps region 05 off Receiving's floor, now locked, so stripes in front of the dock door would need their own small region inside 06.

### Correction pass 05, dock door (Nov 10): REVISE, discarded; master stays `master-L1-v7.png`

- **Fit:** within limits but the loosest yet: scale 1.01, offset −2 / +1 px, and the editor redrew 36.1% of the picture outside the mask.
- **Result:** every pixel outside the mask unchanged (asserted), but the composite is broken inside it. The editor painted the doorway frame about 10 px left of the mask, so the frame is cut off; a wall light it added is sliced at the mask's top edge; part of the old dark strip remains.
- **Cause:** the method, not the brief. The editor places small features to within about 10 px across a 1600 px picture. That is invisible in a 200 px room and fatal in a 56 px wall box. Regions 07 and 08 are 36 px wide and would fail the same way.

### Zoomed-crop workflow for small regions (Nov 10)

`spikes/cutaway/zoomcrop.py` and `composite.py --zoom`: the editor works on an enlargement of the region (05: 190 × 285 px at 5.39×) and the script restores it to its exact coordinates. Masks, rules O1 to O5, the outside-mask assertion and the refusal limits are unchanged. `spikes/cutaway/test-zoom.py` passes five synthetic cases (exact, resized, shifted and scaled within limits, shifted beyond limits refused, re-framed refused), and full-frame mode reproduces v6 and v7 pixel for pixel. Region 05 is the first test; 07 and 08 follow only if it passes. Fallback, authorised in principle: openings rendered from the engine geometry, reviewed separately before use.

### Region 05 zoomed crop (Nov 10): REFUSED; master stays `master-L1-v7.png`

- The returned crop was the right size and aspect, but the editor re-rendered the scene: new floor tiles, a wider upper wall, an added ceiling light, the forklift moved. Best fit: scale 1.0325, offset −12 / −5 px, and a ring error of 16.8 even after fitting (earlier passes: 4 to 8). The script refused it; it was not forced.
- **Conclusion:** the chat image editor regenerates whatever it is given. Enlarging a small region makes it regenerate that region's surroundings too. The zoomed-crop tooling works (synthetic test), but this editor cannot make a local edit at this scale. Regions 07 and 08 were not sent.
- **Engine-derived rendering, first draft: not usable.** Drawing the wall segments, frame and threshold from the engine geometry inside each mask gives exact geometry but reads as a flat sticker: the painted walls sit a few pixels from the engine's and carry painted light that a flat fill does not. The draft was not kept in the repo and nothing was integrated.
- **State of the three openings in v7:** each already has a break in the painted wall at the engine's opening. What remains is cosmetic: a dark panel beside the dock opening (05) and dark, unclear gaps at the two Reef Tunnel passages (07, 08).

---

## Level 1 review on `master-L1-v7.png` (Nov 10)

Views and tap results: `docs/spikes/cutaway-shots/l1-review/` (24 views and `l1-review.json`), made by `spikes/cutaway/l1-review.js`. At 320 px, 400 px and desktop: not granted, granted, walk complete, walk denied, the denied door inspected, the dock door inspected, and the lens over each Reef Tunnel passage.

### Recommendation: GO for L1 as the visual foundation, with three conditions for integration

**What holds**

- **Room function:** every room now shows what the engine says it is. Public rooms read as exhibits, Receiving as back of house. At 320 px only Kelp Hall, Classroom and Atrium get a label; the Jelly Room and Kelp Hall are identifiable from the art alone, Living Shore and Seasonal are small warm rooms that need a tap to name.
- **Granted against not granted:** clear at all three widths. The veil dims floors and the exhibits stay recognisable under it.
- **Interaction:** 21 of 21 real taps on L1 door markers (7 doors × 3 widths) select the right door. Footprint, markers, walk, denied stop, callout and lens register on the painting with no change to the overlay.
- **Openings:** 15 of 15 engine openings have an opening in the painted wall at the right place; none is a solid wall. Twelve are clean. Three are cosmetically weak: a dark panel beside the dock opening (05) and dark gaps at the two Reef Tunnel passages (07, 08).
- **Asset:** the painted L1 is 159 KB as WebP.

**Do the three weak openings confuse a learner or get in the way? No.**

- **Dock door (05):** the live marker sits on it at every width, and at 320 px the paint under the marker is about 10 px. The learner finds this door by its marker and its name, not by the paint.
- **Reef passages (07, 08):** open passages with no reader, so no marker and nothing to inspect. At 320 px each gap is 2 to 3 px wide. They do not block or mislead any interaction. Not tested: a walk route through them, because the spike only has Elena's walk, which does not use them.

**Conditions (all overlay or layout, none needs new art)**

1. **Canvas margin.** The dock door marker sits on the map's right edge and is cut at 320 px; its lens and the "Above · L2" caption are cut at every width. The West Staff Entrance marker and its denied ring are cut at the bottom edge at 320 px. This is the margin already listed as a condition of the technical GO; the review shows it is required, not optional.
2. **Labels at 320 px.** Five L1 rooms have no label at 320 px, and the door markers overlap "Classroom" and the route overlaps "Kelp Hall". Pre-existing overlay behaviour, more noticeable now that the art is rich.
3. **Tapping a passage does nothing.** A tap exactly on an open passage falls on the wall line and selects neither a door nor a room. Now that passages are painted as doorways, a learner may tap one. It should select the room beyond, or say that it is an open passage with no reader.

**Backlog (art)**

- Openings 05, 07, 08: cosmetic cleanup, by a mask-based editor if one is used later.
- **Service spine and West service hall still read as public space** (ocean mural, plants, a bench). They are staff corridors. This was logged as minor in the first review and was never one of the eight regions. It is the same kind of error as the four rooms that were fixed, in a weaker form, and it is the largest remaining gap in instructional accuracy on L1.
- Living Shore: illegible poster marks.

### Decisions after the L1 review (Nov 10)

L1 technical GO approved. Final visual lock on HOLD until the staff corridors read as staff space. Openings 05, 07, 08 accepted as cosmetic backlog.

**Integration requirements (accepted; not implemented in the spike)**

1. Canvas margin so that no marker, selection ring or lens is cut at any tested width.
2. Better labels at 320 px without crowding: selective labels and tap-to-identify. The named-door picker and accessible identification stay.
3. Open passages are identifiable on interaction: the passage or adjacent area is named and described as an open passage. No reader, no door inspection, no invented evidence.

### Staff corridors: assessment and proposed regions (for review; no art generated)

What makes the two corridors read as public is not on their floors.

- **Service spine.** Its floor is already a plain tiled service floor. The ocean mural, the bench, both plants and the row of lights are painted on the face of the north exterior wall, the tall back wall behind the spine and both cores. In engine terms these are wall pixels, which the interior rule (I1) forbids, so this needs a new kind of region.
- **West service hall.** The blue mural with a shark silhouette is painted on the face of the west exterior wall. The plants, planter and bench stand on the floor beside it.
- **East service hall** already reads as back of house (pipework, equipment) and needs nothing.

| NN | Region | Kind | Mask | Brief |
| --- | --- | --- | --- | --- |
| 09 | North wall face | surface, wall line y = 12 | Generated from the engine: the wall face, less other walls, painted caps and the locked Kelp Hall tank. Box (97, 61)–(1599, 189), 156,830 px | Remove the mural, bench and plants. A plain working back wall: painted concrete or block, a cable tray or pipe run, plain utility lights. |
| 10 | West hall furnishings | interior | Box (95, 392)–(144, 692) | Remove the plants, planter and bench. Plain sealed floor, clear path. |
| 11 | West wall face | surface, wall line x = 12 | Generated from the engine. Box (51, 196)–(87, 925), 22,620 px | Remove the blue mural and silhouette. Plain painted wall like the other corridor walls; keep the wall lights. |

All three pass their rules (`proposal-corridors-north.jpg`, `proposal-corridors-west.jpg` in the correction package). All twelve regions pass.

**Open points for review**

- **Blue fringe on region 11.** The painted west wall is about 6 px wider than the engine's on its outer (left) side, so the engine-derived mask leaves a thin blue strip of mural along the building's edge. Covering it means letting a surface mask reach a few pixels past an exterior wall into empty background, which is a rule change.
- **Region 11 is 37 px wide.** That is the size class where the chat editor failed on the dock door. It is a flat surface, not a placed feature, so a 10 px slip matters less, but it is the riskiest of the three. A plain colour change of the mural to wall grey, done by script inside the mask, would be exact; it is a recolour, not new art, and would need approval as such.
- **Region 09 is one pass, 1,500 px wide.** It could be split at the Kelp Hall tank into two passes if the first return drifts.
- **Lights on the north wall** are inside region 09 and will be repainted. Keeping them exactly would mean cutting them out of the mask.
- **The cores' share of the north wall** (both ends) is included, so the wall reads as one surface.
- **Order:** 10 first (ordinary interior pass), then 09, then 11.

Screenshot evidence was trimmed from 23 MB to 9.5 MB: every state at 320 px, three desktop views and two contact sheets are kept; the 400 px set and five desktop views that showed nothing the others do not were removed. Tap tests still run at all three widths.

### Staff corridors, first working session (Nov 11)

Plan approved with refinements: order 10, 09, 11; 09 and 11 as scripted material treatments, lights kept exactly, Kelp Hall tank excluded, a fringe exception for 11. Master is still `master-L1-v7.png`; nothing was promoted.

- **Region 10:** handoff prepared (full frame, against v7). The box is 50 px wide, the size class where the editor has slipped before; here it only has to continue a floor.
- **Region 11, scripted recolour: preview is clean.** The mural and silhouette are gone, the wall keeps its top-to-bottom shading and grain, both wall lights are untouched, and the blue fringe is gone. Fringe exception: 2,954 px past the wall line, 1,932 of them on empty background, none on another wall or a cap; S1 to S3 and O4 pass. Reads correctly at phone map scale.
- **Region 09, scripted treatment: REVISE after five iterations.** The mural recolours cleanly along the whole wall and the tank is untouched. Still wrong at full size: the places where the bench and plants stood show as lighter rectangles with an invented fan of light; the lamps' immediate surroundings are blotchy and some housing lines are lost; a few teal specks remain by two lamps. Removing painted objects and rebuilding the lit wall round each lamp is the part a script does badly.

- **Decision (Nov 11):** region 09 goes to the editor as two ordinary full-frame passes, 09a west and 09b east of the middle of the Kelp Hall tank; the lights are repainted. The tank stays locked out of both masks. Order: 10, 09a, 09b, 11. Two pixels of each plant pot sit below the wall-face mask on the corridor floor and will remain.

### Correction pass 10, West hall furnishings (Nov 11): PASS, promoted to `master-L1-v8.png`

- **Composite:** fit 0.5% scale, no offset (limit 1.5%); 11,647 pixels changed inside; every pixel outside unchanged (asserted). The editor repainted all the staff corridors in this one image (37.4% of the picture outside the mask); only region 10's pixels were taken.
- **Result:** plants, planter and bench gone; the tiled floor continues with its joints. Accepted deviation: two wall lights added on the west wall where the plants stood. A faintly lighter column in the floor is visible at 2× zoom only.
- **Overlays:** unchanged at 320 / 400 / desktop; 21 of 21 door taps correct. Openings: no regressions.
- **The same returned image also contains a repainted north wall.** Trial in a scratch copy, nothing promoted: it registers at identity on regions 09a and 09b, and with one refined mask for the whole wall (lamp housings no longer mistaken for wall caps; inside the Kelp Hall tank's box only dark mural pixels are editable) it gives a clean concrete wall with pipe runs and the lights in place. Awaiting a decision on using it in place of two new passes.

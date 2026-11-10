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

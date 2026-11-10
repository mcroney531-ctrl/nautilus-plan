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

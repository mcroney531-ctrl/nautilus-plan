# L1 cutaway: masked correction handoff

Spike material, not V2. This package corrects the painted L1 one region at a time. Each region comes back, is composited into the master by script, and is checked before the next one starts.

## Files

| File | What it is |
| --- | --- |
| `master-L1-v1.png` | The registered painting. **1600 × 1004 px**, RGB, at identity with the engine frame (variant C). It is the only source of truth: later versions are `master-L1-v2.png` and up, written by `composite.py`. |
| `reference-regions.jpg` | The master with the 8 regions boxed and numbered, plus a legend. Amber boxes are room interiors to repaint to their real function. Red boxes are openings to fix. |
| `mask-NN-*.png` | One mask per region, 1600 × 1004, 8-bit. White = editable; black = keep. Walls, wall caps, door openings and the passages a room needs are outside the room masks by construction (they are inset from the engine's room rectangles by wall thickness, the partition face height and the variant C shear). |
| `crop-NN-*.png` | The region with 90 px of context and a yellow outline. This is the close-up to show the editor. |
| `canvas-3x2-L1-v1.png`, `canvas-3x2-mask-NN-*.png` | For editors that only return 3:2 images: the master pasted at the top-left of a 1600 × 1067 canvas, with dark padding below. |
| `canvas-3x2-L1-vN.png`, `reference-regions-vN.jpg` | The same inputs re-cut from the latest promoted master by `python3 spikes/cutaway/refresh.py`, which also re-cuts the crops of the regions still pending. Always hand the editor the highest N. |
| `manifest.json` | For each region: its box in px, its engine room, its brief and its files; the projection constants; a history of every composite. |
| `edit-NN-*.png` | Not committed (2.5 MB each). The master with the region made transparent: the alpha-mask format some edit APIs take. Generate one with `python3 spikes/cutaway/handoff.py <master> --edit NN`. |

## Regions

| NN | Region | Engine | Must show |
| --- | --- | --- | --- |
| 01 | Living Shore | `touch`, public gallery | Shallow touch pool: a low, open pool with rockwork, sand and coastal habitat, and a rail at visitor height. Public, warm and inviting. |
| 02 | Jelly Room | `jelly`, public gallery | Jellyfish gallery: a dark room with glowing cylindrical or round tanks of jellies, and soft blue and violet light. |
| 03 | Seasonal | `seasonal`, public gallery | Flexible temporary exhibit gallery: display cases or plinths, blank panels (no text), track lighting. |
| 04 | Atrium | `atrium`, public, open to L2 | An open central gathering space, visibly open to Level 2 (light from above, the void edge), with seating. No storage, no pipes. |
| 05 | Loading dock door | `D-DOCK`, plan (388, 250) | A dock door opening in Receiving's **east exterior** wall, centred on the box. The engine's dock reader is here. |
| 06 | Receiving north wall | passage at plan (368, 196) | Remove the roll-up door and leave a plain wall. **Keep the existing passage to the East service hall** (right end of the box). |
| 07 | Reef Tunnel → Jelly Room | passage, plan (289, 80) | A clear open passage through the wall, about 60 px (15 plan units) wide, with no door leaf. |
| 08 | Reef Tunnel → Seasonal | passage, plan (289, 157) | Same as 07. |

Order: 01 first, then 02, 03, 04, then 05 to 08. Do one region per pass. Never combine regions.

## Alignment requirements

- **Return the whole image at its original size.** That is 1600 × 1004, or the 3:2 canvas at any true 3:2 size (for example 1536 × 1024). Don't crop it, add borders, re-frame it, rotate it or change the perspective.
- **Keep everything outside the mask as it is.** Pixels outside the mask are discarded anyway: the composite takes only the masked region. But if the editor shifts or rescales the whole picture, the region lands in the wrong place. The script corrects up to 6 px or 1.5% and refuses anything more.
- **Stay inside the room's floor and its back wall.** Exhibits may rise above the low partitions, but nothing may cover a wall cap, a door opening or a passage.
- **Match the master's projection:** the same viewing angle, with walls extruding up and to the right (variant C shear), and the same lighting direction and colour temperature.
- **Art rules:**
  - no text, labels, signage lettering or numbers;
  - no people or brand marks;
  - no route lines, door markers or permission colours (the app overlays those live).

## Workflow for one region (example: 01 Living Shore)

1. Give the editor `master-L1-v1.png` (or `canvas-3x2-L1-v1.png` if it only returns 3:2), plus `crop-01-living-shore.png` and `reference-regions.jpg`.
2. Ask for the region to be repainted to its brief, with the rest left untouched. If the editor takes a mask, give it `mask-01-living-shore.png` (or `edit-01-...png` for alpha-mask APIs). If it takes a brush selection, paint inside the amber box only.
3. Save the result and run:
   ```
   python3 spikes/cutaway/composite.py 01 <returned image>
   ```
   The script:
   - maps the result into the master frame (identity, 3:2 canvas, or a plain resize, whichever fits best);
   - fits any residual scale or offset on the unedited ring around the region;
   - takes only the masked pixels, with a 3 px inward feather;
   - asserts that every pixel outside the mask is unchanged;
   - writes `master-L1-v2.png` and `compare-01-v2.png` (before | after | returned);
   - logs the fit, the pixels changed and how much the editor redrew outside the mask in `manifest.json`.
4. Check the result before starting the next region:
   - **Registration:** the frame is the master's, so it holds by construction. Look for seams at the mask edge in the compare image.
   - **Openings:** re-run the opening check. The target is 15 of 15 once 05 to 08 are done; until then, no regressions.
   - **Room function:** look at the region with the engine labels on top.
   - **Interactive overlays:** footprint, labels, door markers, walk, lens and selection, at 320 px, 400 px and desktop. These run in the spike page after the new master is converted to `spikes/cutaway/out/C-L1-painted.webp` and `spikes/cutaway/build.py` is run.
5. If it fails, discard that version and redo the same region. The master version only moves forward on a pass.

`composite.py` was tested on five inputs. The first four composited cleanly, with all pixels outside the mask unchanged; the fifth was refused, as intended:

| Input | Result |
| --- | --- |
| The master returned unchanged | No change |
| A synthetic edit stretched to 1536 × 1024 | Composited cleanly |
| The same edit via the 3:2 canvas | Composited cleanly |
| The edit shifted by 5 / −3 px | Fitted and corrected |
| The edit moved 20 px | Refused |

## Paste-ready prompt for GPT (region 01)

> Edit this aquarium cutaway illustration (attached at 1600 × 1004 px; return it at exactly the same size and framing). Change only the room inside the amber box marked 01 on the reference sheet (close-up attached): it is the Living Shore, a public touch-pool gallery, but it is currently painted as a storage room with crates and carts. Repaint its interior as a shallow, open touch pool at low height, with rockwork, sand and coastal habitat (anemones, sea stars, kelp fronds), and a simple rail at visitor height. It should be warm, inviting and public. Keep the existing walls, wall caps, ceiling lights and door openings exactly as they are; everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right), lighting direction and colour temperature. No text, signage, numbers, people or logos. If you think the box is too small for a convincing touch pool, or something in this brief conflicts with the image, tell me before painting rather than working around it.

## Checking a mask against the engine

`python3 spikes/cutaway/maskcheck.py NN [x0 y0 x1 y1] [--sheet out.png]` renders the engine's architecture alone and checks the region's box, or a proposed box, against it. Run it before a mask is used or changed; a mask that fails is not sent. `--sheet` writes a picture of the mask (red), the engine opening (green) and the walls it must not touch (blue).

A mask protects architecture. It does not have to preserve leftovers of a wrong room, so before a region is sent, compare its crop with the largest clear box and widen the mask if old contents touch its edge.

**Interior regions** (rooms and floors: 01 to 04, 04b, 06)

- I1: the mask holds no architecture pixel: no wall face, side face or cap, and no wall span of a door opening or passage.

**Opening regions** (masks that have to repaint part of one wall: 05, 07, 08). Each names its target in the manifest: the wall line, the engine opening's plan point and its width.

- O1: the mask holds no pixel of any wall other than the target wall line.
- O2: the mask contains the whole engine opening: the gap the engine cuts in that wall, with the wall's height and shear.
- O3: the mask reaches no more than 28 px beyond that opening on any side.

**All regions**

- O4: the mask does not overlap a region that has already been composited, so an approved room cannot change. A targeted re-edit of a locked region (04b) names that region as `within`: it may overlap that region only, and (O5) must stay inside its box.

After an opening region is composited, the opening count is re-run: the target opening must match, and no other opening may regress.

Region 06 changed kind. The roll-up door is not on the engine's north wall: it is painted on a false tall wall that stands on Receiving's floor. Removing it is an interior repaint of Receiving, and the north wall with its passage to the East service hall stays outside the mask.

## Status

| NN | Result | Master |
| --- | --- | --- |
| 01 Living Shore | PASS (Nov 10). Accepted deviations: illegible poster and stand marks, stone coping instead of a rail, a faint tonal ring. | `master-L1-v2.png` |
| 02 Jelly Room | PASS (Nov 10), with the mask revised to (1184, 286)–(1383, 436). The original inset kept pump-room pixels at the room's edges. | `master-L1-v3.png` |
| 03 Seasonal | PASS (Nov 10), first composite, with the mask widened before editing to (1184, 493)–(1383, 643). Two exhibit features, no teal accent. | `master-L1-v4.png` |
| 04 Atrium | Mask widened before editing to (816, 716)–(1254, 922): pipes crossed the original box's top and right edges, and old floor would have remained at the left and front. PASS (Nov 10), first composite. Accepted: a bench and planter stand just inside the West Gallery passage. | `master-L1-v5.png` |
| 04b Atrium, West Gallery approach | Targeted edit inside 04, (818, 778)–(948, 906): remove the bench in the path from the passage. PASS (Nov 10), first composite. | `master-L1-v6.png` |
| 05 Dock door | Box tightened to (1544, 716)–(1599, 880) to pass O3 and clear the forklift. Open doorway, no hazard stripes. First return REVISE (Nov 10), discarded: the editor's doorway sat about 10 px off, so the 56 px mask clipped its frame and a wall light. | |
| 06 Receiving interior | PASS (Nov 10), first composite, box (1288, 694)–(1543, 922), interior kind. | `master-L1-v7.png` |
| 07, 08 Reef passages | Boxes pass the opening rules unchanged. Not sent. | |

## Paste-ready prompt for GPT (region 02, against v2)

Attach `canvas-3x2-L1-v2.png`, `crop-02-jelly-room.png` and `reference-regions-v2.jpg`.

> Edit this aquarium cutaway illustration and return it at exactly the same size and framing. Change only the room inside the amber box marked 02 on the reference sheet (close-up attached, yellow outline). It is the Jelly Room, a public jellyfish gallery, but it is currently painted as a pump room with pipes and blue tanks. Remove every pipe, valve and tank, including the parts that touch the edge of the box, and repaint the interior as a sophisticated, immersive jellyfish gallery: several cylindrical or rounded illuminated jelly tanks, translucent jellyfish suspended inside them, deep blue, indigo and restrained violet light, subtle reflections on a dark polished floor, and a premium aquarium-gallery atmosphere. It should be the coolest, most atmospheric room on this level, in clear contrast to the warm touch-pool room. Keep the light coming from the tanks: the floor should be dark but still visibly a floor, not black, and keep clear open floor in front of the tanks and at the opening in the left wall. Keep the tanks inside the box; nothing may rise over the wall caps or cover an opening. No posters, wall graphics, interpretive stands or signage. No letters, numbers, pseudo-text or invented labels. No people or logos. Do not change the walls, wall caps, openings or any other room; everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right) and rendering style. If the box is too small for this, or anything here conflicts with the image, tell me before painting rather than working around it.

## Paste-ready prompt for GPT (region 03, against v3)

Attach `canvas-3x2-L1-v3.png`, `crop-03-seasonal.png` and `reference-regions-v3.jpg`.

> Edit this aquarium cutaway illustration and return it at exactly the same size and framing. Change only the room inside the amber box marked 03 on the reference sheet (close-up attached, yellow outline). It is the Seasonal Gallery, a public rotating-exhibition space, but it is currently painted as an office. Remove everything in it, including the filing cabinets, plants, desk, chair, monitor, whiteboard and tall cabinet, and the parts of them that touch the edge of the box. Repaint the interior as a polished contemporary gallery showing a temporary marine-conservation exhibition: a pale stone or terrazzo floor, and only two or three exhibit features, chosen from elegant display plinths and low glass cases holding small coral, shell or reef-inspired specimens and sculptures. Restraint matters more than detail: the room is small, so leave most of the floor clear and walkable, especially in front of the opening in the left wall. Palette: warm white, sandstone and muted teal, with subtle amber directional gallery lighting and soft reflections on the floor. It should read as calm and bright next to the dark blue jellyfish room above it. Keep every object inside the box; nothing may rise over the wall caps or cover an opening. No text, pseudo-text, posters, wall panels with marks, signs, labels, people or logos. No doors that are not already there. No desks, office furniture, equipment or storage. Do not change the walls, wall caps, openings, ceiling light fixtures or any other room; everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right), lighting direction and rendering style. If the box is too small for this, or anything here conflicts with the image, tell me before painting rather than working around it.

## Paste-ready prompt for GPT (region 04, against v4)

Attach `canvas-3x2-L1-v4.png`, `crop-04-atrium.png` and `reference-regions-v4.jpg`. The source must be the v4 canvas: the Jelly Room shows jellyfish tanks and the Seasonal room shows a pale gallery.

> Edit the attached aquarium cutaway illustration (the image where the upper-right room holds glowing blue jellyfish tanks and the room below it is a pale gallery with a coral case) and return it at exactly the same size and framing. Change only the large room inside the amber box marked 04 on the reference sheet (close-up attached, yellow outline). It is the Atrium, the aquarium's open central gathering space, but it is currently painted as back-of-house storage. Remove the crates, the cart, the pallets and every pipe and valve, including the pipes along the top edge of the box. Repaint the whole floor inside the box, edge to edge, as polished pale stone or terrazzo, and make the room a calm, welcoming, spacious public atrium: one or two low curved benches, and most of the floor left empty. The floor above this room is open, so show that with light only: a broad, soft pool of cool daylight falling from above onto the middle of the floor, with gentle reflections in the polished stone. A restrained inlaid floor motif of flowing wave or ripple lines is welcome if it stays subtle; do not draw a manta ray or any animal, because the round room above already has one. This is not an exhibit and not a tank: no water, no glass cases, no plinths. Do not draw stairs, steps, ramps, elevators, escalators, balconies, railings, mezzanine edges, columns, doors or any new opening; nothing here may suggest a way up. Keep the existing wall-mounted and floor light fixtures where they are. Keep every object inside the box; nothing may rise over the wall caps or cover an opening. No text, pseudo-text, signage, people or logos. Do not change the walls, wall caps, openings or any other room; everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right) and rendering style. If anything here conflicts with the image, tell me before painting rather than working around it.

## Paste-ready prompt for GPT (region 04b, against v5)

Attach `canvas-3x2-L1-v5.png`, `crop-04b-atrium-west-approach.png` and `reference-regions-v5.jpg`.

> Make one small edit to the attached aquarium cutaway illustration (the image whose large lower room is a pale atrium with two curved wooden benches and two potted plants) and return it at exactly the same size and framing. Work only inside the amber box marked 04b on the reference sheet (close-up attached, yellow outline), at the left end of the atrium. Remove the curved bench inside that box, with its shadow, and leave empty polished floor where it stood. Keep the potted plant in the box where it is. Continue the existing floor exactly: the same pale stone, the same pale blue wave inlay lines running through the box without a break, the same reflections and light. Do not add anything in its place: no bench, no object, no rug, no marking. Everything else in the atrium stays as it is: the other bench and plant, the daylight pool, the wave inlay, the floor and the lights. Everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. No text, signage, people or logos. If anything here conflicts with the image, tell me before painting rather than working around it.

## Paste-ready prompt for GPT (region 06, against v6)

Attach `canvas-3x2-L1-v6.png`, `crop-06-receiving-north-wall.png` and `reference-regions-v6.jpg`.

> Edit the attached aquarium cutaway illustration (the image whose large lower room is a pale atrium with one curved bench and two potted plants) and return it at exactly the same size and framing. Change only the room inside the red box marked 06 on the reference sheet (close-up attached, yellow outline): the lower-right room, Receiving, a staff-only goods-receiving bay. It currently shows a large grey roll-up shutter door set in a tall dark wall at the back of the room. That door and that tall wall are wrong and must go: there is no door on this side of the room. Remove the roll-up door, the tall wall face around it, the two wall-mounted control boxes, the conduit and the yellow hazard stripes in front of the door. In their place, continue the room's sealed grey concrete floor all the way back to the low white partition wall at the top of the box, so the room reads as one open floor like the corridors around it. Keep it a plain working space, and put clear circulation ahead of decoration. There is an existing gap in the partition at the top-right corner of the room, leading to the corridor above, and a dock door will be added later in the middle of the right-hand wall: keep a wide, empty strip of floor running from that top-right gap down the right side of the room to the middle of the right-hand wall, with nothing standing in it. Keep one yellow forklift in the right half of the room, parked clear of that strip, not against the right-hand wall and not below the top-right gap. One or two small stacks of pallets or crates against the left wall are optional; leave them out if space is tight. Keep every object inside the box; nothing may rise over the wall caps or cover an opening. No doors, shutters, gates or new openings anywhere. No text, pseudo-text, signage, labels, people or logos. Do not change the walls, wall caps, openings, light fixtures or any other room; everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right), lighting and rendering style. If anything here conflicts with the image, tell me before painting rather than working around it.

## Paste-ready prompt for GPT (region 05, against v7)

Attach `canvas-3x2-L1-v7.png`, `crop-05-dock-door.png` and `reference-regions-v7.jpg`.

> Make one small edit to the attached aquarium cutaway illustration (the image whose lower-right room is an open concrete bay with a yellow forklift and a stack of crates) and return it at exactly the same size and framing. Work only inside the narrow red box marked 05 on the reference sheet (close-up attached, yellow outline), on the right-hand outer wall of that lower-right room. That wall is the building's exterior wall, and this is where the loading dock door is. Inside the box the wall already has a break between an upper and a lower wall segment; make that break read clearly as an open dock doorway through the exterior wall: a clean rectangular opening the full height of the wall, with a simple dark steel frame, the room's concrete floor running out through it as a threshold, and the dark exterior visible beyond. Leave it open: no shutter, no door leaf, no gate, no curtain. Remove the dark vertical strip of old wall face on the room side of the box so the floor meets the wall cleanly. Keep the wall segments above and below the opening, their white caps and the wall light as they are. No text, numbers, signage, people, vehicles or logos. Everything outside the box must stay pixel-identical, with no shift, rescale, re-crop or change of perspective. Match the existing viewing angle (walls extrude up and to the right), lighting and rendering style. If anything here conflicts with the image, tell me before painting rather than working around it.

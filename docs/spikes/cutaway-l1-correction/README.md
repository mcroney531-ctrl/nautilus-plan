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

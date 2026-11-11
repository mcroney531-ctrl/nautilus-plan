# Level 2 cutaway package

Spike material, not V2. Plan and decisions: `PLAN.md`. Same tools and rules as the L1 package (`../cutaway-l1-correction/README.md`), run with `CUTAWAY_PKG=docs/spikes/cutaway-l2`.

| File | What it is |
| --- | --- |
| `blockout-L2.png`, `reference-L2.jpg`, `plan.json` | Engine geometry, labelled sheet and plan (`l2plan.py`). |
| `master-L2-v0.png` | Shell base: blockout plus the scripted Reef tank top and void views cut from `master-L1-v11.png` (`l2base.py`). |
| `master-L2-v1.png` | v0 plus the scripted catwalk grating and bridge (`l2catwalk.py`). Current master. |
| `lock-L2.png` | Scripted pixels no editor mask may hold. `bridge-exception-L2.png`: the locked pixels the bridge and its shadow changed, the one approved exception. `scripted-catwalk-L2.png`: grating and bridge. |
| `mask-00-shell.png` | The first whole-level paint: everything except the locked, scripted and catwalk pixels. |
| `mask-NN-*.png`, `manifest.json` | The planned room regions, for corrections after the shell paint. |

## Shell registration

`python3 spikes/cutaway/shellreg.py LEVEL <painting> [--zone x0 y0 x1 y1] [--sheet out.png]` fits the painting's white wall caps to the engine's (scale and shift, by cross-correlation), enforces the compositor's 6 px / 1.5% limits, requires a confident fit (recall at least 0.60, a clear correlation peak), and tests structure in 200 px tiles: a tile fails if walls are missing or sit more than about 12 px from the engine's. PASS, REFUSED or HOLD. `--selftest` runs six cases on the approved L1 master: as is (PASS), scaled 1% and shifted 3 / −2 (PASS, fit recovered), scaled 2.5% and shifted 9 / −5 (REFUSED), shifted 14 px (REFUSED), one wall moved 50 px (HOLD), another level's layout (HOLD). The tile thresholds are calibrated so approved L1 passes; its own walls are up to 9 px off in places, so errors under about 12 px are not detected.

## Shell paint: how it comes back

`CUTAWAY_PKG=docs/spikes/cutaway-l2 python3 spikes/cutaway/composite.py 00 <returned image>` fits the return on the scripted pixels (water, bridge, grating, void views), refuses a shift over 6 px or 1.5%, takes everything outside them and asserts they are unchanged. Then: room function with engine labels, the opening count (8 doors, 1 passage), `connectivity.py 2`, overlays and taps at 320 / 400 / desktop, and the lens both ways. Rooms that are wrong are corrected one masked region per pass.

## Paste-ready prompt for GPT (region 00, shell paint, second attempt, against v1)

First return (Nov 11) REFUSED and discarded: it painted the L2 rooms onto Level 1's wall layout, copied from the full L1 image given as a style reference. The style reference is now three small samples, not the building.

Attach, in this order: `canvas-3x2-L2-v1.png` (the image to paint), `reference-L2.jpg` (room names), `style-swatches-L1.jpg` (style only).

> Paint this architectural cutaway. The first image is a grey 3D blockout of the upper level (Level 2) of a fictional public aquarium: the staff-only working floor, seen from above with the front walls cut away. Return it at exactly the same size and framing, with every wall, wall cap, doorway gap and room exactly where the blockout has it. This floor's layout is different from any other floor of the building: the upper-left is one wide room with no corridor walls inside it, there is no corridor along the top between the two corner stair cores (that strip is empty and dark), and the right side is one L-shaped room. Do not move, add, remove, thicken or re-angle any wall; do not add doors or openings; do not change the perspective (walls rise up and to the right).
>
> The second image names each room. The third image is a strip of three small style samples cut from another floor of the same building. Use it for rendering style only: the white wall caps and grey wall faces, the warm practical lighting, the level of detail. It shows nothing about this floor's layout; the layout comes only from the first image. This floor is back-of-house: sealed and epoxy floors, stainless steel, exposed pipe and cable runs, task lighting, equipment in use. Working and clean, not sinister.
>
> Four things in the first image are already finished and must stay pixel-identical: (1) the large round pool of blue water with the manta ray, its dark rim, and the steel bridge across it; (2) the dark steel grating floor around that pool and in the narrow corridor leading to it from the left; (3) the three rectangular windows at the bottom that look down onto the level below; (4) the dark background outside the building.
>
> Paint these rooms, each inside its own walls:
> - Quarantine (upper middle-left, beige floor in the blockout): rows of isolation tanks on stands, each with its own small filter and lid; a floor drain; a stainless bench. Cool, clinical, green-white light.
> - Life support (lower right, beige floor in the blockout): the plant room. Pumps, sand filters, a tall protein skimmer column, a chiller, a pipe manifold with valves, control cabinets with blank faces. Blue-grey machinery with a little amber indicator glow.
> - Dive locker (upper right of the round pool): wetsuits on a rack, yellow air cylinders in a rack, a rinse tank, a bench. The one warm, human room.
> - Food prep (middle-left, below the narrow grating corridor): stainless counters and sinks, chopping stations, buckets, a fridge unit against a wall.
> - Ops offices (lower left): desks, monitors with blank screens, shelving. Restrained.
> - West mezzanine (upper left) and East mezzanine (the L-shaped space at the right): sealed concrete floors, a few carts or lockers against the walls, a trolley of dive gear near the Dive locker. Mostly clear floor.
> - The two small stair cores (top-left and top-right corners): a plain stair landing.
>
> Keep clear floor in front of every doorway gap. Leave every doorway gap open and empty: no door leaf, no shutter, no red or green lights, no keypads, no lock symbols. No text, letters, numbers, pseudo-text, signs, labels, screens with content, people or logos. No stairs, ladders or hatches anywhere except the two stair cores. Nothing may rise above a wall cap or cover a doorway gap. The strip between the two stair cores along the top, and the area outside the walls, stay dark and empty.
>
> If anything here conflicts with the image, tell me before painting rather than working around it.

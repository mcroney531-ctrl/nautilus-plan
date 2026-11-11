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

## Shell paint: how it comes back

`CUTAWAY_PKG=docs/spikes/cutaway-l2 python3 spikes/cutaway/composite.py 00 <returned image>` fits the return on the scripted pixels (water, bridge, grating, void views), refuses a shift over 6 px or 1.5%, takes everything outside them and asserts they are unchanged. Then: room function with engine labels, the opening count (8 doors, 1 passage), `connectivity.py 2`, overlays and taps at 320 / 400 / desktop, and the lens both ways. Rooms that are wrong are corrected one masked region per pass.

## Paste-ready prompt for GPT (region 00, shell paint, against v1)

Attach, in this order: `canvas-3x2-L2-v1.png` (the image to paint), `reference-L2.jpg` (room names), `../cutaway-l1-correction/canvas-3x2-L1-v11.png` (style reference only).

> Paint this architectural cutaway. The first image is a grey 3D blockout of the upper level (Level 2) of a fictional public aquarium: the staff-only working floor, seen from above with the front walls cut away. Return it at exactly the same size and framing, with every wall, wall cap, doorway gap and room exactly where the blockout has it. Do not move, add, remove, thicken or re-angle any wall; do not add doors or openings; do not change the perspective (walls rise up and to the right).
>
> The second image names each room. The third image is the finished lower level of the same building: match its rendering style exactly (same camera, same white wall caps and grey wall faces, same warm practical lighting, same level of detail), but this floor is back-of-house: sealed and epoxy floors, stainless steel, exposed pipe and cable runs, task lighting, equipment in use. Working and clean, not sinister.
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

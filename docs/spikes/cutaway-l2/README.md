# Level 2 cutaway package

Spike material, not V2. Plan and decisions: `PLAN.md`. Same tools and rules as the L1 package (`../cutaway-l1-correction/README.md`), run with `CUTAWAY_PKG=docs/spikes/cutaway-l2`.

| File | What it is |
| --- | --- |
| `blockout-L2.png`, `reference-L2.jpg`, `plan.json` | Engine geometry, labelled sheet and plan (`l2plan.py`). |
| `master-L2-v0.png` | Shell base: blockout plus the scripted Reef tank top and void views cut from `master-L1-v11.png` (`l2base.py`). |
| `master-L2-v1.png` | v0 plus the scripted catwalk grating and bridge (`l2catwalk.py`). |
| `master-L2-v2.png` | Stage 1 (`l2rooms.py`): engine walls with a scripted finish; Quarantine, Food prep, Dive locker, Life support and East mezzanine resampled from `source-shell-return-2.png` (`stage1-transforms.json`). `lock-rooms-L2.png` locks those rooms. |
| `master-L2-v3.png` | v2 plus West mezzanine and Ops offices from `source-west-return-1.png`, placed by hand with a recorded approval (`l2rooms.py --add`). Current master. |
| `lock-L2.png` | Scripted pixels no editor mask may hold. `bridge-exception-L2.png`: the locked pixels the bridge and its shadow changed, the one approved exception. `scripted-catwalk-L2.png`: grating and bridge. |
| `mask-00-shell.png` | The first whole-level paint: everything except the locked, scripted and catwalk pixels. |
| `mask-NN-*.png`, `manifest.json` | The planned room regions, for corrections after the shell paint. |

## Shell registration

`python3 spikes/cutaway/shellreg.py LEVEL <painting> [--zone x0 y0 x1 y1] [--sheet out.png]` fits the painting's white wall caps to the engine's (scale and shift, by cross-correlation), enforces the compositor's 6 px / 1.5% limits, requires a confident fit (recall at least 0.60, a clear correlation peak), and tests structure in 200 px tiles: a tile fails if walls are missing or sit more than about 12 px from the engine's. PASS, REFUSED or HOLD. `--selftest` runs six cases on the approved L1 master: as is (PASS), scaled 1% and shifted 3 / −2 (PASS, fit recovered), scaled 2.5% and shifted 9 / −5 (REFUSED), shifted 14 px (REFUSED), one wall moved 50 px (HOLD), another level's layout (HOLD). The tile thresholds are calibrated so approved L1 passes; its own walls are up to 9 px off in places, so errors under about 12 px are not detected.

## Shell paint: how it comes back

`CUTAWAY_PKG=docs/spikes/cutaway-l2 python3 spikes/cutaway/composite.py 00 <returned image>` fits the return on the scripted pixels (water, bridge, grating, void views), refuses a shift over 6 px or 1.5%, takes everything outside them and asserts they are unchanged. Then: room function with engine labels, the opening count (8 doors, 1 passage), `connectivity.py 2`, overlays and taps at 320 / 400 / desktop, and the lens both ways. Rooms that are wrong are corrected one masked region per pass.

## Status

All eight rooms are in `master-L2-v3.png`. The stair-core landings are plain (assessment in `../cutaway-findings.md`). No region is pending.

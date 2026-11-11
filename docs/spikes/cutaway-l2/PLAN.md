# Level 2 cutaway: production plan (for review; no art generated)

Spike material, not V2. Source of every fact below: `src/engine.js`, read by `spikes/cutaway/l2plan.py`, which writes `blockout-L2.png` (the variant C base, 1600 × 1004), `reference-L2.jpg` (labelled) and `plan.json` (rooms, openings, planned masks). L1 is locked at `docs/spikes/cutaway-l1-correction/master-L1-v10.png`; that file stays the untouched source of truth, and production assets are derived from it at integration.

## 1. What the engine says is on Level 2

| Space | Kind | Plan rectangle(s) | Sits above (L1) |
| --- | --- | --- | --- |
| West core · L2 | core (stair) | 12,12 40×30 | West core · L1 |
| East core · L2 | core (stair) | 348,12 40×30 | East core · L1 |
| West mezzanine | staff | 12,44 84×96 | West service hall, West gallery |
| Ops offices | staff | 12,142 84×90 | West service hall, West gallery |
| Quarantine | **restricted** | 98,44 90×66 | Kelp Hall |
| Food prep | staff | 98,134 90×66 | Living Shore |
| Tank-top catwalks | staff | 98,112 100×20 and 198,44 98×158 | Reef Tunnel (main part); between Kelp Hall and Living Shore (strip) |
| Dive locker | staff | 298,44 48×74 | Jelly Room |
| East mezzanine | staff | 348,44 40×150 and 298,120 50×74 | East service hall, Seasonal |
| Life support | **restricted** | 316,196 72×92 | Receiving |

There are no public spaces on L2.

**Badge doors (8)**

| Door | From → into | Plan | Groups that hold it |
| --- | --- | --- | --- |
| D-WM West mezzanine | West core → West mezzanine | 32,43 | Exhibit Operations, Temporary Exhibit AV |
| D-QUAR Quarantine | West mezzanine → Quarantine | 97,77 | Exhibit Operations (inherited) |
| D-TOPW Tank-top · west | West mezzanine → catwalks | 97,122 | Exhibit Operations, Temporary Exhibit AV |
| D-FOOD Food prep | Catwalks → Food prep | 143,133 | Exhibit Operations (inherited) |
| D-EM East mezzanine | East core → East mezzanine | 368,43 | Dive Crew |
| D-DIVE Dive locker | East mezzanine → Dive locker | 322,119 | Dive Crew |
| D-TOPE Tank-top · east | East mezzanine → catwalks | 297,157 | Dive Crew |
| D-LIFE Life support | East mezzanine → Life support | 368,195 | none |

**Open passage (1):** West mezzanine ↔ Ops offices at 54,141. **Stairs (2):** each core links to its L1 core; the stair has no plan point. **Voids (3), open to L1:** over the Classroom (98,202 90×50), the Atrium (198,204 116×84) and the West gallery's south leg (96,254 100×34).

Nothing exists on L2 between the two cores (the strip above the L1 Service spine): the engine has no space and no void there.

## 2. Art direction

Same camera, projection, lighting model and rendering as L1: variant C, warm practical lights, the same white wall caps and grey partition faces. The difference is function. L1 is the visitor floor with staff edges; L2 is the working floor: sealed and epoxy floors, stainless steel, exposed pipe and cable runs, task lighting, equipment in use. Working, not sinister: restricted rooms look controlled and clean, not dangerous.

Colour does the separation that exhibits did on L1: Quarantine cool green-white and clinical; Life support the densest and most technical, with blue-grey machinery and amber indicator glow; Dive locker the one warm, human room (wetsuits, yellow cylinders); catwalks dark steel over lit water.

Art rules as L1: no text, pseudo-text, signage, numbers, people or logos; no route lines, door markers or permission colours; **no red/green status lights or lock symbols at doors** (the live overlay says who may enter); nothing rises over a wall cap or covers an opening.

| Space | Treatment | What it shows |
| --- | --- | --- |
| Quarantine | **Detailed** | Isolation tanks in rows on stands, each with its own filter and lid; floor drain; stainless bench; cool clinical light. No visitors' finishes. |
| Life support | **Detailed** | Pumps, sand filters, a protein skimmer column, a chiller, a pipe manifold with valves, control cabinets with blank faces. The plant room L1's Jelly Room was wrongly painted as. |
| Tank-top catwalks (main) | **Detailed**, and the level's centrepiece | Steel grating walkways with rails around and across open water: the top of the reef tank. Feeding stations, a hoist. Light comes up from the water. |
| Dive locker | **Detailed**, small | Wetsuit rack, cylinder rack, a rinse tank, a bench. |
| Food prep | **Detailed**, small | Stainless counters, sinks, a walk-in fridge door **on an interior wall only if it reads as an appliance, not a room door**, chopping stations, buckets. |
| Ops offices | Restrained | Desks, monitors with blank screens, shelving. The office L1's Seasonal was wrongly painted as. |
| West mezzanine | Restrained | Sealed floor, a few carts or lockers against walls, clear path between its three doors and the passage. |
| East mezzanine | Restrained | The same, with a trolley of dive gear near the Dive locker. Both parts read as one space. |
| Tank-top catwalks (strip) | Shell only | A grating walkway, 20 plan units deep; too thin for its own mask. |
| Cores | Shell only | Stair landing; 26 px of visible floor. |
| Voids | Shell only | See conflict 2. |

## 3. Method

The L1 workflow, with what L1 taught us built in.

1. **Shell paint, once:** the whole level over `blockout-L2.png`, with the per-room briefs above given in the first prompt. L1's four wrong rooms came from a first paint with no room briefs. Register it against the engine frame as L1 was (identity, or reject).
2. **Function review with engine labels on top.** Rooms that are right are kept.
3. **Masked corrections, one region per pass,** for rooms that are wrong, through `composite.py`, with `maskcheck.py` before each and the outside-mask assertion after. Masks are cut to the largest engine-clear box before sending, not the conservative inset.
4. **Scripted treatment** for flat surfaces (`material.py`); the chat editor is not used for features under about 60 px. The eight door openings fall in that class: they must be right in the shell paint, or they go to the backlog as on L1.
5. **Opening check:** 8 doors and 1 passage, target 9 of 9.
6. **Overlay and tap review** at 320 / 400 / desktop, then the lens in both directions.

Tooling to extend before art starts (small): `handoff.py`, `maskcheck.py`, `composite.py` and `refresh.py` take a level; the L2 package lives in `docs/spikes/cutaway-l2/`.

## 4. Initial mask plan

Engine-derived interior boxes, each checked against the L2 architecture render (rule I1: 0 wall, cap or opening pixels inside). See `reference-L2.jpg`.

| NN | Space | Box (px) | Size | I1 |
| --- | --- | --- | --- | --- |
| 02 | West mezzanine | (102, 290)–(371, 495) | 270 × 206 | pass |
| 03 | Quarantine | (423, 290)–(739, 413) | 317 × 124 | pass |
| 05 | Tank-top catwalks, main | (823, 290)–(1171, 663) | 349 × 374 | pass |
| 06 | Food prep | (423, 534)–(739, 658) | 317 × 125 | pass |
| 07 | Ops offices | (102, 556)–(371, 745) | 270 × 190 | pass |
| 09 | East mezzanine, east part | (1423, 290)–(1539, 642) | 117 × 353 | pass |
| 10 | East mezzanine, west part | (1223, 496)–(1379, 642) | 157 × 147 | pass |
| 11 | Dive locker | (1223, 290)–(1371, 435) | 149 × 146 | pass |
| 12 | Life support | (1295, 703)–(1539, 897) | 245 × 195 | pass |
| 01, 08 | Cores | none | 26 px of floor | shell only |
| 04 | Catwalk strip | none | too thin after insets | shell only |

Two rooms beside the west exterior wall (02, 07) needed a wider inset than L1's rule gives: that wall is 20 units tall and leans 41 px over their floors.

## 5. Conflicts and risks to settle before art

1. **The blockout draws solid walls inside single engine spaces.** `base.js` puts a wall on every rectangle edge, including the edge shared by the two rectangles of one space. On L2 that walls the catwalk strip off from the main catwalk (at x = 198) and splits the East mezzanine in two (at x = 348), although each is one space the walk passes through freely. **The same defect is in locked L1:** the West gallery's main hall and its south leg (the way to the Atrium) are separated by a painted wall with no opening, at plan x = 96, y = 254 to 288. The 15-opening check never saw it, because it is not a door or a link. Recommendation: fix `base.js` to skip edges shared within a space before any L2 art; treat the L1 wall as a known issue to judge at integration (it is a 110 px wall, in the editor's reliable size range, if it is to be opened).
2. **Voids.** The blockout paints the three voids as dark holes. Under the lens from L1, the Atrium then shows a black rectangle. Options: (a) dark, as now; (b) a railed edge with a dimmed view of the L1 floor below, cut from `master-L1-v10` by script, so the two levels agree exactly. Recommendation: (b), scripted, because an editor would invent a different atrium.
3. **Catwalks over the Reef Tunnel.** L2 says there is a tank top above the Reef Tunnel. L1 paints the Reef Tunnel as a round room with a manta on the floor, not as a tunnel through water. A catwalk over open water on L2 is right by the engine's names and will not match what L1 shows below it. Recommendation: paint L2 to the engine (open water, round, matching the L1 ellipse) and accept the mismatch; do not reopen L1.
4. **Quarantine sits above Kelp Hall,** whose L1 tank is painted rising well above the walls. Under the lens the tall tank is replaced by a room. Accept: the lens swaps levels, it does not stack them.
5. **Walls do not line up between levels on the east side.** Dive locker's west wall is at x = 298; the Jelly Room below starts at x = 290. The East mezzanine's west part overhangs Seasonal the same way. The lens will show an 8-unit step. This is the engine's geometry and stays.
6. **Low back walls.** With nothing north of y = 44 on L2, the back walls of Quarantine, the catwalks and the Dive locker are partition height (9 units), not the tall exterior wall L1 had for its mural and pipes. Wall-mounted equipment has little wall to sit on; equipment goes on the floor.
7. **The empty north strip** between the cores shows the dark ground plate. Either leave it dark or paint it as the roof of the L1 Service spine. Recommendation: leave dark; a painted roof invites a tap that selects nothing.
8. **Door crowding, measured in the spike:** at 320 px, Quarantine and Tank-top · west markers are 23 px apart (under WCAG 2.5.8's 24 px), Dive locker and Tank-top · east 27 px. The named-door list stays mandatory. Art must keep the wall between those two west doors visibly solid, so they do not read as one opening.
9. **Two pairs of doors share a plan point across levels:** West core · L1 and West mezzanine at 32,43; East core · L1 and East mezzanine at 368,43. With the lens showing the other level, the marker under the lens sits exactly on the marker beside it. Overlay behaviour, to check at L2 review.
10. **Life support and the Dock.** Life support's east wall is the exterior wall, directly above the dock door. No opening may be painted there.
11. **D-LIFE is held by no group.** The art must not suggest otherwise: no open door leaf, no light spilling out.

## 6. Carried forward (accepted, not implemented)

Integration requirements: canvas margin for markers, rings and lenses; selective labels and tap-to-identify at 320 px; open passages identified on interaction (L2 has one, West mezzanine ↔ Ops offices). L1 backlog: openings 05, 07, 08. Cutover (Phase 08) is not authorised.

Fictional facility and procedures; subject-matter review required before any real use.

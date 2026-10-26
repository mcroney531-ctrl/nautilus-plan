# Nautilus Marine Center — spatial connectivity and route validation (v1)

**Status:** Working concept for review, not a locked floor plan or a validated real-world access-control policy.

## Architectural assumptions

- Two **aligned** map views of one building, not two interchangeable outlines.
- **Level 1:** public visitor galleries (atrium, Kelp Hall, Living Shore/touch pool, education classroom, Reef Tunnel, Jelly Room, seasonal exhibit), plus **ground-floor** receiving/loading and a separate behind-gallery staff service spine.
- **Level 2:** **partial** mezzanine around/above habitats: tank-top catwalks, dive locker, quarantine/holding, AV room, food prep, life support and operations rooms.
- Two controlled vertical connections: **West Staff Core** (service stairs) and **East Service Core** (service stair/freight-lift zone, schematic). The two maps align these core positions.
- Staff circulation must be physically continuous between the west staffed service entry and ground-floor receiving, without sending delivery equipment through public galleries.
- The public entrance does **not** turn into staff access automatically. A separate controlled staff-gallery connector exists to illustrate how a poorly scoped profile could admit an educator into the restricted support network.
- Room footprints, door schedules, operational faults, and original work authorizations are distinct kinds of evidence. The inspection lens reveals aligned topside spaces, not a magical doorway.

## Four verified conceptual routes

| Case | Intended route or check | Initial observation | Appropriate learner action |
| --- | --- | --- | --- |
| 1. Issue — Elena Park | Public entrance → atrium → west public gallery → Kelp Hall, Living Shore, classroom | General Facility Support works but also permits an **unrequested path from Atrium via West Staff Core to Quarantine** | Use Education Areas permissions; see the separate `Trace overgrant` button |
| 2. Diagnose — Marcus Reyes | Loading dock → Receiving → East Staff Core L1 → East Staff Core L2 → east mezzanine → tank-top → west mezzanine → dive locker | 5:30 AM arrival fails at dock because crew-wide door schedule begins 7:00 AM | Use a site-approved **individual time-bound** authorization; avoid changing the group for 38 others |
| 3. Audit — Jordan Kim | West staff entry → West Core → mezzanine → tank-top → AV equipment room | Credential still opens doors even though the project authorization ended three months ago | Revoke outdated vendor rights; successful denial is the **desired** result |
| 4. Adapt — Daniel Brooks | Dock → Receiving; if unavailable, west staffed service entry → ground service spine → Receiving | Dock **reader offline**; changing badge scope does not repair hardware | Use a **site-approved staffed escort/check-in** route rather than widening the driver's badge |

These choices are intentionally illustrative, **not instructions for overriding real site security or life-support safety procedures**. An actual aquarium security/facilities SME should validate procedures, visitor-vs-staff door arrangements, contractor entitlements, escort policy, operational constraints, and the correct scope of time exceptions.

## What is implemented in the interactive HTML

- A consistent conceptual map with Gallery and Topside views.
- Four selectable cases with distinct response options and result text.
- Step-by-step route tracing with stops at the first failed access condition.
- A movable **aligned-floor inspection lens**, operable with pointer/touch and keyboard arrows when the SVG has focus.
- A separate **unintended-access trace to Quarantine** in scenario 1.
- Phone-responsive layout; no external image, font, script, or network dependencies.
- Manual browser checks completed: each success/failure outcome, two-floor toggle, lens, and phone-width overflow.

## Decisions still open

1. Confirm authentic staff routes and where Level 2 actually exists above public exhibits.
2. Decide whether the two cores are both stairs/lift combinations or have different functions.
3. Reconcile the room/corridor graph with a **believable architectural plan** before detailed map art (the current drawing is intentionally schematic and not to scale).
4. Add policy/authorization provenance and actual audit evidence into the inspection interaction.
5. Decide how much of the route simulation belongs in the final portfolio build versus remaining development scaffolding.
6. Validate the fictional access workflows with an aquarium/facilities/security subject-matter reviewer.

## Visual baseline to retain

The approved *Nautilus Marine Center* design direction remains Conservation Forward (wave insignia, deep navy/teal/sea glass, editorial typography) over the cinematic, immersive public exhibits. The revised Kelp Hall is realistic and framed by large underwater windows; living fish/kelp animations are ambient, with no looping crowds. Operations UI is restrained and legible.

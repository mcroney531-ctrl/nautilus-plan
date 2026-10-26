# Nautilus Access Desk: session handoff

**As of:** Mon Oct 26, 2026 · **Owner:** Rone · **Status:** Elena, Marcus and Jordan built; 17 engine tests green; Jordan checked in headless Chromium at 400px and 1280px. Next: independent review, then Daniel (adapt), then polish. Jordan has NOT had a real-device check or SME review.

---

## 1. What this is and why

A portfolio piece for Rone's "functional portfolio candidates" direction: interactive training with a believable job story behind it, not a gimmick.

**Learner:** a newly assigned security/facilities administrator at a fictional aquarium (Nautilus Marine Center) who issues and maintains badge access.

**Performance:** given an access request, grant exactly what the person needs, for exactly when they need it, verify it works from their side, and catch access that works but shouldn't exist.

**Origin:** E-Learning Heroes challenge #571 asked for Merge Shapes masking effects. It started with ~19 mechanic mocks (a "Masking Mock Lab") and narrowed to this. Merge Shapes still matter. The badge footprint is a literal Union, the dark-water veil is a Subtract, and change review is a set difference. But the goal now is portfolio quality, not a weekly entry. Rone deliberately takes these challenges slower to build portfolio work.

**Collaboration model:** Rone works with both Claude and GPT and goes back and forth until decisions are settled, especially architecture. Expect to be asked for paste-ready prompts to GPT. GPT has been a strong reviewer. Several of the decisions below are GPT's corrections.

---

## 2. The core loop (settled)

**Receive request → Configure → Experience → Investigate → Revise and verify**

| Step | What the learner does | What the screen shows |
| --- | --- | --- |
| Receive | Reads a ticket in the character's own voice, plus linked records | Need stated, problem **not** stated |
| Configure | Toggles access groups, exceptions, schedules | **Granted** footprint lit over a dark-water veil (Union of groups) |
| Experience | "Walk [name] in" | **Reachability** trail, step by step, across levels. Stops at the first denial with no reason given |
| Investigate | Inspect lens (drag or tap, keyboard arrows) | Aligned other level inside the lens, plus an evidence panel for the selected door/space |
| Revise | Changes badge, rewalks, closes ticket | **Change review**: effective access added/removed, outlined on the map |

The lens is available from the start. A knowledgeable learner can inspect first and prevent the failure.

---

## 3. Locked decisions (Claude + GPT aligned)

### Three separate concepts (GPT's strongest point)
- **Granted:** what the credential's groups and exceptions permit (time ignored). Drives the footprint.
- **Authorized:** what approved work records allow. Drives scope checks and the audit.
- **Reachable:** where the person can actually get from a given entrance at a given time, given schedules and door status. Drives the walk.

Never collapse these. Only one is shown at a time: configure shows granted, walk shows reachable, and authorized scope appears through inspection and grading.

### Data model (five entities + facility state)
Spaces and connections · Doors/readers · Access groups · Credentials · Work authorizations · Facility state (day, time, door status, group overrides).

Evaluation order for an attempt: physical connection → credential active → door granted → valid at that time/day → reader hardware OK. The engine knows the reason, and the UI reveals it only through inspection.

### Rules
- **Directional doors:** readers check entry into the secured side (`into`). Exit is free. This is a simulation rule, not a life-safety model. We simulate authorized entry, never egress prevention.
- **Lens = selector:** the evidence panel only fills for the lens/tap selection, and the selection persists until something else is inspected. A tap alternative to dragging is required (WCAG 2.2 dragging-movements).
- **Change review** is computed from effective permissions. If two groups grant the same door, removing one does not show as removed. It stays visible until the next change, with a toggle.
- **Evidence discipline:** every ticket has a message from the person (establishes the need) plus an approved record (establishes authority). Grading must never depend on ambiguity.
- **Distractors are tempting, never strawmen.**
- **Defer:** mantraps, anti-passback, lockdowns, fire-egress simulation, alarm integration, zoom/pan on mobile (only if legibility holds without it).

### Building (schematic, two aligned levels)
- **L1:** West service hall, West core, Service spine (top), East core, East service hall, Receiving (dock, bottom right), West gallery (L-shaped), Kelp Hall, Living Shore, Classroom, Reef Tunnel (signature habitat), Jelly Room, Seasonal, Atrium. Staff entrance bottom left, loading dock right.
- **L2 (partial mezzanine):** West core, West mezzanine, Quarantine (above Kelp Hall, which is the scenario-1 lens reveal), Tank-top catwalks (above the Reef Tunnel plus a west catwalk), Food prep (above Living Shore), Ops offices, East core, East mezzanine (L-shaped), Dive locker (near the east core, per GPT), Life support (above Receiving). Voids: open over Classroom, Atrium, and the south West gallery.
- Cores connect levels by stairs (people). Both cores are people-usable. Don't route people through a freight-only lift.
- The aquarium premise is grounded in reality: public at viewing level, husbandry topside. GPT cited National Aquarium's behind-the-scenes walkway above Shark Alley. Still requires SME review.

### Brand (keep)
"Conservation Forward": wave insignia, deep navy/teal/sea glass, Georgia serif wordmark with letter-spaced NAUTILUS / MARINE CENTER, restrained operations UI. The dark veil reads as deep water and the lit footprint as light coming through it. That's intentional.

---

## 4. The four scenarios

| # | Ticket | Person | Start / time | Competency | Tempting mistake | Correct resolution |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Issue | **Built** | Elena Park, marine educator | West Staff Entrance, Tue 07:15 | Least privilege | **Exhibit Operations** ("Standard onboarding template") covers her rooms but inherits Quarantine + topside from a 2021 Husbandry Support merge | All Staff + Education. Optional: flag the template |
| 2 Diagnose | **Built** | Marcus Reyes, dive crew lead | Loading dock, Tue 05:30 | Where vs. when access applies | Change **Dive Crew** group hours to 05:00 (every day, 12 badges) | Time exception from **WO-2291** (Marcus only, Tue 05:00–08:00, WO doors only) |
| 3 Audit | Next | Jordan Kim, exhibit AV vendor | West staff entry, routine review | Access that works but shouldn't exist | "Keep vendor profile active for potential follow-up work" | Revoke/expire, and document it. **Evidence = original authorization (ended ~3 months ago) laid over current access**, not a door failure. Expiry was missing or misconfigured, not a routine failure |
| 4 Adapt | Next | Daniel Brooks, frozen-feed driver | Loading dock | Permission problem vs. equipment problem | Issue temporary **unescorted** West Staff Entrance access | Staffed escort route. Dock reader has a **hardware fault** (not "offline": many systems run cached permissions offline, per GPT citing Genetec/Verkada). The escort is a person with their own credential, so the walk should evaluate the escort's badge. Needs a written fictional Nautilus escort policy |

Engine test already includes a Jordan fixture (active credential, expired WO-1873 → out-of-scope doors) and a hardware-fault test.

Scaffolding plan: Issue = guided · Diagnose = hinted (prompt to inspect after the failure) · Audit = unprompted ("routine review") · Adapt = independent, with tradeoff feedback rather than right/wrong.

Frame: an **operations-desk shift**, with a ticket queue, recurring characters, and a persistent map. The queue UI exists, and Jordan/Daniel show as locked "next."

---

## 5. Current code

```
src/engine.js     data model + evaluator (Engine global; module.exports for node)
src/scenarios.js  tickets: people, messages, records, editable groups (SCENARIOS global)
src/ui.html       page shell + UI script with /*__ENGINE__*/ and /*__SCENARIOS__*/ placeholders
build.py          inlines engine + scenarios → dist/nautilus_access.html
test/test.js      13 node tests (run from repo root: node test/test.js)
reference/        v1 prototype from GPT/Codex + its notes (superseded; keep for history)
```

**Engine API:** `grants(world, person)`, `canEnter(world, person, door, t)` → `{ok, code, grants, via, status}` with codes `OK | NO_GRANT | OUTSIDE_SCHEDULE | HARDWARE_FAULT | CREDENTIAL_INACTIVE`. `path(from, to)` (physical BFS, ignores access), `walk(world, person, start, targets, t)` → `{steps, reached, stop}`, `footprint(world, person)` → `{spaces, doors}` (granted doors' secured sides flooded through open links), `delta(before, after)`, `outOfScope(world, person)` (granted doors no active authorization covers).

**World:** `{day, date, doorStatus:{doorId:'fault'}, groupOverrides:{group:[start,end]}}`. **Person:** `{credential:{active, groups[], exceptions[{doors, window, day, source}]}, authorizations[{id, status, ends?, doors[], exception?}]}`.

**UI:** single-file HTML, vanilla JS, SVG map (viewBox 400×300 per level). Footprint = mask with granted-space rects subtracted, plus a feMorphology ring outline (union edge). Lens = clipPath circle rendering the other level. Grading via `grade()` reuses the engine: walk result, then group override check, then `outOfScope`.

**Note:** test require paths already point at `../src/`.

**Published:** the v2 artifact is "Nautilus Access Desk" in Rone's claude.ai artifacts. The earlier exploration ("Masking Mock Lab," 19 tabs) and the "Badge Planner Competency Map" doc are there too.

---

## 6. Acceptance status (GPT's v2 list)

- [x] Same evaluator for Elena and Marcus, no case branches
- [x] Broad group genuinely grants extra doors (Elena can walk into Quarantine)
- [x] Credential/schedule changes alter access without scenario code
- [x] Footprint and route disagree explainably (Education-only: galleries lit, denied at staff entrance. Marcus: footprint right, denied at 05:30)
- [x] Inspection possible before a walk
- [x] Denial reasons discoverable only through inspection (the walk log says "didn't open")
- [~] Phone usability: no horizontal overflow at 400px, but labels are ~9–10px and core labels tiny. **Needs Rone's real-device check.**

---

## 7. Backlog (prioritized)

1. **Repo hygiene:** git init, add `npm test` or a simple Makefile, commit the baseline.
2. **Jordan (Audit): BUILT (v2.1).** Open items: guided/unprompted tuning, document-the-decision step, set-expiry action (only Deactivate exists), 'Not ready to close' text names the expired WO (consider less revealing). Original note:  add as a ticket with no code branches. Needs the "authorization vs. current access" comparison surfaced in inspection (the lens on a door shows "No active record covers this door," and an overlay of authorized scope vs. granted footprint could be the reveal). Add revoke/disable and set-expiry actions to the credential. Make sure the walk *succeeding* is the expected, unalarming result.
3. **Daniel (Adapt):** door status `fault` on D-DOCK. Escort model: a staffed escort is a second person whose credential gets evaluated for the route from the West Staff Entrance to Receiving. Write the fictional escort policy into the ticket records. Tradeoff feedback rather than right/wrong.
4. **Phone legibility:** larger labels or abbreviations, tap targets ≥ 24px for doors, and keep the lens usable. Consider a bottom sheet for badge controls (GPT's suggestion) if scrolling feels long.
5. **Change review noise:** the first change from an empty badge outlines everything in gold. Consider highlighting only restricted or outside-scope additions loudly and the rest quietly.
6. **Desktop map** gets very large: cap the map width/height.
7. **L2 "W CORE"** label overlaps a door dot.
8. **Scaffolding:** guided prompts for Elena, a post-failure inspect prompt for Marcus, none for Jordan.
9. **Shift framing:** supervisor intro and end-of-shift summary, with characters recurring across tickets.
10. **Later:** real map art (aligned levels), avatars, ambient Kelp Hall/Reef visuals per brand, case-study write-up using the Mock Lab as curated process evidence (Spotlight → Configuration → Two perspectives → Consequence-driven investigation).

---

## 8. Open questions

- Pre-open: is the public entrance locked before opening? Currently out of scope (Elena uses the staff entrance).
- Grading tone for Adapt: compare tradeoffs, or a single correct answer under a written policy?
- One persistent shift (state carries between tickets) vs. independent tickets from a menu?
- What needs real SME validation before this goes in the portfolio (security admin + aquarium facilities)?
- Storyline translation story for the case study: footprint = Union per group, veil = Subtract, delta = set difference. The walk and evaluator are the HTML-only parts.

---

## 9. Guardrails

- Fictional facility, fictional policies. Keep the disclaimer and SME caveat visible.
- Never present access restrictions as preventing egress or as life-safety guidance.
- Don't make Nautilus look recklessly insecure to manufacture a problem. Overgrants should have a plausible origin (legacy template merge, missing expiry).
- Animal welfare and life support are reasons for restriction only, never something the learner improvises around.

---

## 10. Architecture notes (added with Jordan)

- Ticket success is data-driven: `scenario.goal` (`'audit'` = no door open without an active record; default = walk must reach every target). No scenario-ID branches in the evaluator.
- `Engine.authActive(world, a)` is the single definition of a current authorization (approved and not past `ends`). `outOfScope`, the ticket record display and the door inspection all use it.
- The lens draws dashed gold rings on doors the badge opens but no active record covers, in both levels, only inside the lens.
- **Daniel risk:** `Engine.path()` is a shortest physical path that ignores access, so a walk can stop at a denied door even when another route is permitted. An escort scenario needs explicit route choice (or access-aware pathing) and evaluation of a second person's credential.
- Other limits: no credential expiry date; walk start is a fixed outside node per scenario; `grade()` lives in the UI and is not unit-tested (Playwright was used for Jordan's flow, script not committed).

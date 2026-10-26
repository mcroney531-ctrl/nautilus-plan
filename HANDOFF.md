# Nautilus Access Desk: session handoff

**As of:** Mon Oct 26, 2026 · **Owner:** Rone · **Status:** All four scenarios built (Elena, Marcus, Jordan, Daniel). 25 engine tests + 23 browser tests (`npm run test:ui`, needs Playwright) green. Mobile pass done (pinned map, Badge/Inspect panes, map-first landscape). NOT yet done: real-device phone check, SME review, four-scenario learner walkthrough, cinematic visuals.

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
| 3 Audit | **Built** | Jordan Kim, exhibit AV vendor | Quarterly review, Tue 10:00 | Access that works but shouldn't exist | Keep it "for follow-up work" (account note, found via the Account history chip) | Deactivate (or remove the group) AND record the reason "work authorization ended; no new approval exists". Lens shows `WO-1873 · ended`, neutrally, no verdict |
| 4 Adapt | **Built** | Daniel Brooks, frozen-feed driver | Loading dock, Tue 08:15 | Permission problem vs. equipment problem | Unescorted West Staff Entrance access (add All Staff, route `selfWest`) | Escort via West Staff Entrance on Priya Nair's own badge, or hold for repair (about 90 min). Both are valid; feedback compares tradeoffs. Dock reader is in a **hardware fault**; Daniel's badge is otherwise valid for the dock |

Engine test already includes a Jordan fixture (active credential, expired WO-1873 → out-of-scope doors) and a hardware-fault test.

Scaffolding plan: Issue = guided · Diagnose = hinted (prompt to inspect after the failure) · Audit = unprompted ("routine review") · Adapt = independent, with tradeoff feedback rather than right/wrong.

Frame: an **operations-desk shift**, with a ticket queue, recurring characters, and a persistent map. The queue UI exists, and Jordan/Daniel show as locked "next."

---

## 5. Current code

```
src/engine.js     data model + evaluator (Engine global; module.exports for node)
src/scenarios.js  tickets: people, messages, records, notes, routes, editable groups (SCENARIOS global)
src/ui.html       page shell + UI script with /*__ENGINE__*/ and /*__SCENARIOS__*/ placeholders
build.py          inlines engine + scenarios -> dist/nautilus_access.html AND index.html (GitHub Pages serves index.html from main)
test/test.js      engine tests: npm test
test/ui.test.js   Playwright browser tests incl. Pixel 7 portrait/landscape: npm run test:ui (Playwright not a dependency; skips if missing, so CI must install it)
docs/             competency map (instructional-design reference), Masking Mock Lab (process evidence only)
reference/        superseded v1 prototype
```

Live: https://mcroney531-ctrl.github.io/nautilus-plan/ (push straight to main; Rone approved).

**Engine API:** `grants`, `canEnter` (codes `OK | NO_GRANT | OUTSIDE_SCHEDULE | HARDWARE_FAULT | CREDENTIAL_INACTIVE`; exceptions may be scoped by `day` and exact `date`), `path`, `walk`, `footprint`, `delta` (spatial), `timeDelta` (same places, different hours), `authActive` (approved and not past `ends`), `outOfScope` (granted doors no active authorization covers).

**Scenario data drives behavior, no scenario branches in the evaluator:**
- `goal`: default = the walk must reach every target; `'audit'` = nothing open without an active record, plus a required `disposition` reason; `'adapt'` = pick a `routes` entry.
- `routes` (Daniel): `{start, as:'self'|'escort', wait, tradeoff}`. An escort route evaluates the escort's own credential (`scenario.escort`); a route whose `start` differs from the scenario `start` draws an explicit outside transfer leg. No access-aware pathfinding, by decision.
- `verify: true` (Elena, Marcus, Daniel; generic rule at the top of `grade()`): closing requires a completed successful walk of the current badge and route. Any badge/route change clears the walk. Not applied to Audit or to Daniel's wait route.
- Adapt grading evaluates three things separately: route outcome, access compliance (out-of-scope expansion is flagged on every route, including waiting), operational consequence (wait = "Closed, delivery delayed" with follow-up notes).
- Inspection always evaluates the ticket person's own badge; on an escort route the escort's result is shown as an extra row. Reader status is independent of the route.
- `hideVerdict` (Jordan): no gold rings, neutral records row in the lens.
- `notes`: extra chips on the ticket (Jordan's account history, Daniel's reader-fault procedure).

**UI:** single-file HTML, vanilla JS, SVG map. On phones (<=860px) and short landscape the map card is sticky, Badge/Review and Inspect share one pane (switch under the map; Inspect on = Inspect pane), and short landscape puts the map in a full-height left column. Desktop layout unchanged. Taps and the lens only select while Inspect is on.

## 6. Acceptance status

- [x] Same evaluator for all four tickets, no case branches
- [x] Broad group genuinely grants extra doors (Elena into Quarantine)
- [x] Footprint and route disagree explainably (Elena Education-only; Marcus at 05:30; Daniel at the dock)
- [x] Denial reasons only through inspection (walk log says "didn't open")
- [x] Change review reports schedule-only changes ("Same places, different hours") with scope (all N group badges vs this badge only)
- [x] One-time exceptions are date-scoped (Marcus's WO-2291 does not recur on later Tuesdays)
- [x] Daniel's denial is the hardware fault, not a missing grant (tested)
- [x] Phone layout verified under Pixel 7 emulation
- [ ] Real-device phone check (lens feel under a thumb, label legibility)
- [ ] SME review (security admin + aquarium facilities)

## 7. Backlog (prioritized)

1. **Real-device phone check**, then a first-time-learner walkthrough of all four scenarios (does the learner know what they're doing, discover problems naturally, understand consequences).
2. **Scaffolding:** guided prompts for Elena, a post-failure inspect prompt for Marcus (none for Jordan/Daniel). Shift framing: supervisor intro and end-of-shift summary.
3. **Map polish:** "W CORE" / "STAFF ENTRANCE" labels collide with door dots; lens caption can overlap labels; first change from an empty badge outlines everything in gold; desktop map is very large (cap it).
4. **Tests:** touch-target test uses SVG width, not the rendered scale under the 32vh cap; make browser tests mandatory in CI once CI exists.
5. **Jordan:** no credential expiry date, only Deactivate / remove group.
6. **Later:** real map art, avatars, ambient visuals per brand, case-study write-up using the Mock Lab as process evidence.

## 8. Open questions

- Pre-open: is the public entrance locked before opening? Out of scope (Elena uses the staff entrance).
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

# Nautilus V2: Phase 00 architecture and implementation plan

**Status:** architecture **approved** by Rone + GPT (Oct 30, 2026) with the decisions recorded in section G. Phase 01a authorized as a narrow exception to the 00B gate; Phase 01 not started.
**Read-in covered:** `CLAUDE.md`, `HANDOFF.md`, `src/engine.js` (173 lines), `src/scenarios.js` (73), `src/ui.html` (576), `build.py`, `test/test.js` (26 engine tests), `test/ui.test.js` (46 browser tests), current build (467 KB single file).

---

## A. Architecture assessment

### What the current code is

- **Engine (`src/engine.js`)**: pure, data-driven, no DOM. Granted / authorized / reachable are separate functions (`grants`, `authActive`/`outOfScope`, `canEnter`/`walk`). Fully reusable as is.
- **Scenarios (`src/scenarios.js`)**: pure data. Reusable; V2 adds presentation fields only (portrait, short title, department, credential type, stage copy).
- **UI (`src/ui.html`)**: one IIFE. Per-ticket domain state lives in `st[id]` (`fresh()`): person, world, route, delta, walk, sel, disp, result, record, open records. View state is in globals: `cur`, `level`, `lens`, `pane`, `compact`, `lensP`, `timer`. Each `render*()` writes an HTML string into a fixed section (`#ticket`, `#flow`, `#badge`, `#review`, `#inspect`) and rebinds handlers; `render()` redraws everything.

### Reusable without structural change

| Piece | Where | Notes |
| --- | --- | --- |
| Engine and all evaluation | `engine.js` | Untouched by V2. |
| Per-ticket domain state | `fresh()`, `st[id]` | Already independent per ticket, so switching tickets in an inbox keeps progress today. |
| Change review computation | `change()` in `renderBadge` (delta, timeDelta, scope, "still supplied by") | Logic reusable; the panel markup moves to Configure. |
| Map drawing | `levelSVG`, `routeSVG`, `DEFS`, `miniSVG` | Pure SVG strings from state. Reusable; restyle via tokens. |
| Live mini footprint | `miniSVG` / `drawMini` | Ideal for Configure on phones (see C). |
| Lens and picking | `svgPt`, `pick`, pointer and keyboard handlers | Reusable; must bind to whichever container holds the map. |
| Walk | `buildWalk`, `startWalk` tick | Reusable; scroll-juggling parts are removed. |
| Workflow derivation | `steps(sc,t)`, `finalized`, `verified` | Already computes Review/Configure/Verify/Close (and the audit/adapt variants) from state. Becomes the tracker's completion data. |
| Coaching copy | `sc.coach` keyed `review/configure/verify/close/afterFail` | Maps directly onto the pale-blue instruction panel. |
| Outcome records and moments | `buildRecord`, `recordHTML`, `showMoment`, `ART` | Reusable; already a self-contained dialog. |

### Needs structural change

1. **`grade()` lives in the UI and reads globals (`SC()`, `T()`).** It is the most important behaviour in the app and has no unit tests. A UI rewrite is exactly when it could change by accident. It (with `steps`, `finalized`, `verified`, `buildRecord`, `buildWalk`) should move into a pure `src/flow.js` that takes `(sc, t)` and gets node tests first. This is the main technical recommendation of this assessment.
2. **One-page layout assumption.** All panels are visible at once; V2 shows one stage's work area at a time. Controls currently on screen together (groups, Walk, Inspect, Close) will live in different stages. That is a behaviour change (see F1–F3).
3. **Pinned-map coupling (to be deleted, not ported):** sticky `#mapcard`, `--stick` and `scroll-padding-top`, `body.compact` + `#sizeBtn` + `#mini`, `pane` and `data-pane` switching, `setLens()` scroll compensation and `lensY`, `startWalk()`'s `minHeight`/`scrollTo` preservation, the short-landscape grid. A sizeable share of `ui.html` and 12 of the 46 browser tests exist only to manage this.
4. **Ticket navigation:** `renderQueue()` tabs and the `[data-q]` handler become the inbox. View state (`level`, `lens`, `lensP`, selected stage) should become per ticket so returning to a ticket restores where the learner was.
5. **Re-render destroys focus.** Verified: after pressing Enter on a group toggle, focus falls to `<body>`. Every interactive panel is rebuilt with `innerHTML`. This is an existing keyboard-accessibility defect, and V2's denser controls (tracker, toggles) make it worse. V2 rendering must preserve focus (stable keys such as `data-key` plus restoring after render) or update panels in place.
6. **Concurrency guard is global:** `timer` blocks almost every action during a walk. With stages and an inbox, navigation during a walk needs an explicit rule (F6).
7. **CSS is one flat, unprefixed stylesheet** (`.card`, `.pad`, `.btn`, `.grp`, `.who`...). The `.pad` collision showed the risk. V2 needs its own namespaced stylesheet.
8. **File organisation:** `ui.html` is dense one-line JS. V2 should be split into `src/v2/*.js` and `src/v2/*.css` and concatenated by `build.py` into the same single self-contained file.

### Coupling to watch

- The map `<svg id="map">` and its handlers are bound once at startup. On phones V2 shows the map in an overlay and on desktop in a column; use **one** map instance that moves between containers (re-parent the node; listeners survive). Duplicating the SVG would duplicate ids and state.
- `renderInspect` assumes the inspection panel sits next to the map. In V2 it should sit inside the map experience (overlay on phones, map column on desktop), because the lens is the selector.
- `hasArt`/`showMoment` are only called from the Close button handler, so moving Close into a stage is safe.

---

## B. Revised implementation plan

### Two structural recommendations

**1. Build V2 as a separate build target until cutover.** The live site serves `index.html` from `main`, and pushes go straight to `main`. If V2 replaces the UI phase by phase, the public portfolio shows a half-built app for weeks. Proposal: `build.py` also emits `dist/v2.html` (and `v2.html` at the root for Pages) from `src/v2/`. `index.html` stays V1 until the cutover phase. Both share `engine.js`, `scenarios.js` and the new `flow.js`.

**2. All four tickets must keep working in V2 from Phase 03 on.** The stage components are shared, so Marcus, Jordyn and Daniel cannot be "left for Phase 07". Each phase builds the generic component, polishes it on Elena, and must pass the full behaviour suite for all four. Phase 07 then means scenario-specific polish and outcome artwork, not plumbing.

### Phases

| Phase | Scope | Depends on | Acceptance criteria |
| --- | --- | --- | --- |
| 00 | This assessment | | Reviewed and decisions in F answered |
| 00A | Assets (Rone + GPT) | parallel | Asset manifest in E delivered |
| 00B | Design handoff | 00, 00A | Spec covers every state in E; F decisions recorded. **Hard gate.** |
| **01a Behaviour lock** (new) | Extract `grade`, `steps`, `finalized`, `verified`, `buildRecord`, `buildWalk` into `src/flow.js` as pure `(sc, t)` functions; V1 calls them; node tests for every scenario outcome now asserted only in browser tests | 00 | V1 unchanged visually; 26 engine + 46 browser tests green; new flow tests cover every result title and record kind for all four tickets. *No visual work, so it could run before 00B if you approve.* |
| 01 Foundation | V2 build target; design tokens; type (F9); namespaced stylesheet + lint; responsive shell at all breakpoints; view-state model and hash router; browser-test page-object helpers | 01a, 00B | Empty shell renders at 320/400/1366 with no horizontal overflow; browser Back works; CSS lint passes; contrast check on token pairs passes |
| 02 Inbox + Review | Inbox list (portrait, name, preview, status from domain state); open/back; supervisor brief; Review stage (conversation, record chips, notes) | 01 | All four tickets reachable at 320; status derived, never stored; Review content matches V1 for all four; keyboard and screen-reader path through the inbox |
| 03 Tracker + work area + map container | Selectable tracker with suggested-next; per-ticket stage memory; map in desktop column and phone overlay; map drawing, levels and legend ported | 02 | No gating (every stage reachable in any order); switching stage or ticket never changes `grade()` output; overlay opens and closes with focus return and Back; all four tickets navigable |
| 04 Configure | Generic configure panel (groups, time exceptions, group-hours edit, routes, audit decision, deactivate) rendered from scenario data; change review; phone mini footprint | 03 | All V1 configure behaviours available for all four tickets; change review identical to V1; Elena polished |
| 05 Verify | Walk in the map, event log, lens and inspection panel, tap alternative, keyboard lens | 03 | All V1 inspection and walk tests pass in V2; lens usable at 320 in the overlay; denial reasons only in inspection |
| 06 Close | Resolution workspace, result feedback, records, moments, Elena's scanner and record, compare, shift summary | 04, 05 | Records and moments identical in data to V1; no art before a finalized result; reduced motion honoured |
| 07 Scale | Marcus, Jordyn, Daniel and Priya polish; their outcome artwork; per-scenario copy | 06 | Each ticket meets its own visual spec; full suite green |
| 08 Cutover (new) | `index.html` serves V2; remove V1 shell and pinned-map tests; update HANDOFF | 07 | Live site is V2; V1 removed; suite green |

Phases 04 and 05 can run in either order once 03 is in.

### Top risks

1. **Silent grading change during the rewrite.** Mitigation: Phase 01a.
2. **Half-built UI on the live site.** Mitigation: separate V2 target.
3. **Splitting controls across stages changes what the learner can do when** (inspecting before configuring, Jordyn's document-only investigation, Daniel's route choice). Mitigation: decisions F1–F3 before 03.
4. **Phone map overlay:** scroll lock, iOS viewport height (use `dvh`), pointer capture for the lens inside an overlay, Back closing the overlay rather than leaving the ticket.
5. **Neumorphic surfaces and contrast.** Soft shadows on white usually fail WCAG 1.4.11 (3:1 for control boundaries and states). Mitigation: token contrast check in 01, and a visible border or fill for every control state.
6. **File size.** Fonts, textures and five portraits can push the single file from 0.47 MB to 2–3 MB (base64 adds a third). Mitigation: budget in E.
7. **Focus loss on re-render** (A5). Mitigation: render contract in 01.
8. **Test porting cost:** 34 behaviour tests to port onto page-object helpers, 12 layout tests to retire and replace.

---

## C. State and interaction model

### Three layers, one direction of change

1. **Domain state** (unchanged): `st[id]` from `fresh()`. Only domain actions mutate it: toggle group, add exception, change group hours, choose route, deactivate, choose reason, walk, close, reset. These keep today's invalidation rules (any badge or route change clears `walk`, `result` and `record`).
2. **Derived state** (pure, in `flow.js`): `steps(sc,t)` gives each stage's completion; `grade(sc,t)` gives the result; `finalized(t)`; inbox status (`new`, `in progress`, `needs correction`, `closed`) derived from `t`, never stored.
3. **View state** (new, never read by evaluation):
   - global: `screen` (`inbox` | `ticket`), `cur`, open overlay (`map` | `moment` | none);
   - per ticket: `stage` (selected), `level`, `lensOn`, `lensP`, scroll position per stage.
   - `t.sel` (the inspected door or room) stays in per-ticket state rather than moving here: `steps()` reads it to mark Jordyn's Investigate done, so it affects derived progress, though never grading.

Rule: **navigation only touches view state.** A test asserts it: run `grade()`, navigate through every stage, ticket and overlay, run `grade()` again, and get the same result.

### Tracker

- **Selected stage** is view state. **Suggested stage** is the first incomplete step from `steps()` and gets a visual cue only. Completed stages show done.
- Never gated: Close is always reachable; it shows `grade()`'s existing "Not ready" feedback, as V1 does.
- Accessible pattern: a list of buttons with `aria-current="step"` on the selected stage and completion stated in each button's name ("Configure, done"). Not a `tablist`, because it is also a progress indicator.
- A "Next: Verify" action at the bottom of each stage. No automatic stage changes (F4).

### Inbox and routing

- Hash routes: `#/inbox`, `#/t/elena/review`, `#/t/elena/verify/map`. Back closes the map overlay, then returns to the inbox. Works under `file://` and on Pages.
- Phones: inbox and ticket are separate screens. At 760px and wider: inbox sidebar plus ticket. At about 1180px and wider: inbox, workspace and map column (breakpoints for 00B to confirm).
- Returning to a ticket restores its stage, level, lens and scroll position; closed tickets reopen on Close showing their record (no moment replay).

### Map

- One map instance. Desktop: always visible in its column; Configure changes light up live beside the controls. Phones: an on-demand full-screen overlay from a map button in Configure and Verify (F2 for Review), plus the live mini footprint inline in Configure so toggling a group still shows its effect without opening the map.
- The inspection panel lives inside the map experience, so the lens stays the selector.
- Walk runs in the map (the overlay opens if needed). The event log sits under the map.

### Rendering contract (fixes A5)

Each panel re-renders from state, then restores focus to the element with the same `data-nx-key` that had it. Live announcements (walk result, "Not ready", stage changes) go through one polite live region.

### Explicit behaviour changes V2 introduces (need approval)

| # | Change | V1 behaviour | Proposed V2 |
| --- | --- | --- | --- |
| 1 | Controls split by stage | All controls visible together | Configure / Verify / Close each hold their own controls; any stage selectable |
| 2 | Inspection access | Lens available any time | See F2 |
| 3 | Map on phones | Pinned, collapsible, always present | On demand overlay plus inline mini footprint |
| 4 | Navigation during a walk | Blocked | See F6 |
| 5 | Ticket switching | Resets level, lens and pane | Restores per-ticket view state |
| 6 | Supervisor brief and shift summary | Cards above the queue | Inbox items (F8) |

---

## D. Test strategy

**Engine (node, `test/test.js`):** keep all 26. Add `test/flow.test.js` in 01a: every `grade()` outcome for all four tickets (good, too broad, out of scope, not verified, audit partial and complete, wrong reason, Daniel's routes and the escort designation), `steps()` per goal, `buildRecord()` fields per kind, and the navigation-invariance check.

**Browser (Playwright):**
- **Page-object helpers** (`openTicket`, `goStage`, `toggleGroup`, `walk`, `openMap`, `inspectDoor`, `close`, `dismissMoment`) so tests describe behaviour, not layout. Port the 34 behaviour tests onto them.
- **Retire with V1:** pinned and compact map, scroll padding, toolbar wrap, short landscape, pane switching (tests 8–11, 19–22, 31, 32, 39, 40 in the current list; keep door-target size and the STAFF ENTRANCE label).
- **New:** inbox to ticket and Back; stage switching keeps state; state survives ticket switching; closed ticket reopens on its record; map overlay focus trap, Esc, Back and focus return; walk inside the overlay; lens tap at 320; moment behaviour (existing tests ported).
- **Responsive matrix:** 320×568, 400×860, 1366×900, plus one landscape phone. For every screen and stage: no horizontal overflow, touch targets of at least 44px for primary controls (24px minimum for map doors), and no text below 12px.
- **Accessibility:** keyboard-only completion of Elena end to end; focus retained after every control (A5); accessible names for tracker, inbox items and map controls; reduced motion; axe-core run as an optional dev-only check that skips if not installed, like Playwright today.
- **CSS namespace lint:** a build-time check that every class in the V2 stylesheet starts with `nx-` and that no class is defined in two component files.
- **Review screenshots:** generated per phase at the three widths for visual sign-off, kept out of pass/fail (font rendering differs between machines).

---

## E. Asset and design handoff requirements

### Files

| Asset | Format | Size | Name | Notes |
| --- | --- | --- | --- | --- |
| Logo, full lockup | SVG (outlined text) | vector | `nmc-logo-full.svg` | Plus a reversed version for navy: `nmc-logo-full-reverse.svg` |
| Logo mark only | SVG | vector | `nmc-logo-mark.svg` | For favicon, inbox header and small sizes; must read at 24px |
| Header texture | WebP or JPG | 2400×480 and 1200×480 | `nmc-texture-header@2x.webp`, `nmc-texture-header-sm@2x.webp` | No text, no logo baked in; safe area for live text noted |
| Sidebar texture | WebP or JPG | 640×2000 (repeatable vertically or with a fade) | `nmc-texture-sidebar@2x.webp` | Dark enough for white text at 4.5:1 |
| Portraits ×5 | PNG with transparency | 1024×1024 master, circle-cropped, face centred at the same scale | `portrait-elena-park.png` etc. | Same framing, lighting and background for all five; Jordyn regenerated (HANDOFF open item); Priya new. I produce the web sizes. |
| Decorative marine elements | SVG preferred, else transparent PNG at 2× | as used | `deco-<name>.svg` | Must stay decorative (`aria-hidden`) |
| Approved Elena assets | as delivered | | existing | Already in `assets/` |
| Screen references | PNG | 320, 400 and 1440 wide | `ref-<screen>-<state>-<width>.png` | Design direction only |

**Budget:** total embedded assets under 1.2 MB after my conversion, which keeps the single file under about 2 MB.

### Reference views needed (each at 320, 400, desktop)

Inbox (new, in progress, needs correction, closed, all closed); Review; Configure (before and after a change, with change review); phone mini footprint; map overlay (idle, lens on with a door selected, walk running, walk stopped, walk complete); Verify on desktop; Close (not ready, needs correction, finalized); moment hand-off; supervisor brief; shift summary; focus and pressed states for tracker, toggles and buttons.

### Design specification contents

- Tokens: colour (with the pairs used for text, controls and states), type scale, spacing scale, radii, shadows, motion durations.
- Fonts: family, weights, and whether embedded (F9).
- Tracker: segment states (default, selected, done, suggested, focus), and how it compresses at 320.
- Component inventory with states: inbox item, message card, record chip, toggle, primary and secondary buttons, instruction panel, change-review list, event log, map controls.
- Breakpoints and what moves at each.
- Copy rules already locked: "Assigned groups", never "groups written/encoded"; no denial reasons outside inspection; fictional disclaimer placement.

---

## F. Open decisions

### Affect architecture, behaviour or the asset contract

1. **Tracker labels.** Fixed Review → Configure → Verify → Close for all four, or per goal as V1 does today (Jordyn: Review → Investigate → Decide → Submit; Daniel: Review → Respond → Verify → Record)? *Recommendation:* fixed stage slots with per-scenario labels, since the instructional verbs differ.
2. **Where inspection lives.** HANDOFF says the lens is available from the start, so a knowledgeable learner can inspect before failing. Inspect only in Verify breaks that. *Recommendation:* the map and lens are reachable from every stage (desktop column; phone map button); Verify is where the walk and event log live.
3. **Daniel's route choice and Jordyn's audit decision:** Configure or Close? *Recommendation:* both in Configure, which keeps Close a pure resolution step.
4. **Stage advance.** Free selection with a "Next" button only, or automatic advance after key actions? *Recommendation:* no automatic advance.
5. **Phone Configure and the map.** Inline live mini footprint plus a map button, or no inline map? *Recommendation:* inline mini footprint (already built).
6. **Navigation during a walk.** Block (V1), cancel and clear the walk, or let it finish in the background? *Recommendation:* leaving the map cancels the walk and clears it (it never verified), with a confirmation only if more than half done.
7. **Release.** Separate `v2.html` until cutover? *Recommendation:* yes.
8. **Supervisor brief and shift summary.** As inbox items (brief pinned first, summary appended when all four close)? *Recommendation:* yes.
9. **Fonts.** The build must stay self-contained (no external requests), so web fonts mean embedding WOFF2 (about 30–60 KB per weight). Embed a chosen family, or use a system stack plus Georgia for the wordmark?
10. **Persistence.** Keep progress across a page reload (localStorage)? It changes the state model (serialise `st`). *Recommendation:* not in V2 scope.
11. **Priya.** Where does her portrait appear: Daniel's escort option and inspection row only, or also as a message sender?
12. **Incorrect-outcome visuals** (GPT's earlier point): in V2 scope or later? Affects Close's component inventory.

### Can be decided later (styling)

Exact colours and shadow depths, chevron geometry, texture opacity, icon set, message-card styling, animation easing, map palette in white mode, how many characters of preview text the inbox shows.

---

## G. Decisions (Rone + GPT, Oct 30, 2026)

### Phase gates

- **Phase 01a (behaviour lock) authorized before 00B.** Baseline expected results captured from the existing implementation first, then extraction to `src/flow.js` with exact parity. No interface, grading or scenario-content changes; separate commit; full suite plus independent flow tests; stop for review.
- Phase 01 does not start until 00B is approved.
- **Phase 00B scope:** the four locked main-screen references, key responsive and map states, and written specifications for the remaining states. Not a generated mockup per state.
- **Asset budget** (under 1.2 MB) applies to the optimized assets embedded in the build, not the source masters.

### Answers to F

| # | Decision |
| --- | --- |
| 1 | Four shared tracker segments with scenario-specific labels and matching functional mappings. Elena keeps Review / Configure / Verify / Close. |
| 2 | Map and inspection lens reachable from every stage. |
| 3 | Route selection (Daniel) and the audit decision (Jordyn) live in the relevant decision-making stage, not Close. |
| 4 | Explicit stage navigation. No automatic advancement, no new gating. |
| 5 | Phone Configure keeps the live mini footprint plus on-demand full map. |
| 6 | Never silently cancel an active walk. Navigating away offers an explicit **Cancel walk / Continue test** choice, with no elapsed-time threshold. |
| 7 | V2 developed and tested at `v2.html`; deliberate cutover later. |
| 8 | Supervisor brief is a pinned informational card in the inbox; the shift summary appears in the inbox on completion. Neither is presented as an employee message. |
| 9 | System UI font stack plus the forthcoming canonical SVG logo. No embedded fonts initially. |
| 10 | No reload persistence in V2. |
| 11 | Priya's portrait appears in Daniel's escort and authorization context only, never as a message sender. |
| 12 | Existing incorrect-outcome feedback is preserved; new cinematic failure artwork is deferred. |

### Additional constraints

- **Keyboard focus loss (A5) is a release blocker.** V2's rendering foundation must preserve focus through configuration changes; updating controls in place is preferred over rebuild-and-restore where practical.
- Accessibility and control-state contrast are release requirements, not polish.
- All four scenarios stay functional throughout the shared-component migration; Phase 07 is character-specific polish and artwork.
- The audit character is **Jordyn Kim**.

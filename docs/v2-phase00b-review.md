# Nautilus V2: Phase 00B review (Oct 31, 2026)

Review of `Nautilus_V2_Phase00B_Approved_Logo_Handoff.zip` against `CLAUDE.md`, `HANDOFF.md`, `v2-phase00-architecture.md` §G and `v2-asset-manifest.md`. **Final recommendation (section 8): PASS**, with the implementation rules and defaults in 8.3. The earlier HOLD (sections 1–6) was for the missing references and the tracker rule, both now resolved. No V2 interface code written; Phase 01 not started.

## 1. Asset validation and integration

- `SHA256SUMS.txt`: all files verified. Package validator: PASS (223,089 bytes of new runtime assets). Manifest byte counts match all 10 WebPs.
- Integrated, byte-identical, additive only (commit `597e1b0`): `assets/v2/avatars/{elena,cameron,jenni,daniel,jordyn}.webp` (192×192, transparent), `assets/v2/portraits/{…}.webp` (512×512), `assets/v2/logo/{nautilus-lockup-light,nautilus-lockup-reversed,nautilus-mark}.svg`. Textures were already in the repo and identical. No V1 file overwritten.
- SVGs: outlined paths only; no scripts, external references, `<image>`, `<text>`, fonts or `<circle>` elements. Rendered on white and navy: lockups correct.
- Not integrated (reference only, per the package): source masters, lineup, logo concept board, previews.
- **Embedded size estimate:** new V2 assets about 297 KB in the build after base64; with Elena's record and badge about 600 KB. Within budget (under 1.2 MB of optimized assets, raw about 452 KB).

## 2. Name-only change

`Marcus Reyes → Cameron Flynn` (CF), `Priya Nair → Jenni Nair` (JN). Commits `ddd020e` (data, tests, targeted test) and `60a71e2` (deliberate baseline update). Stable keys `marcus` and `jordan` unchanged.

Proof it is name-only: with the new names mapped back to the old, all 734 baseline states matched the previous golden file exactly; the baseline was then regenerated from the original workflow code (`b08e9fc`) and `flow.js` gives the identical result (221 states contain a name). V1's rendered text is identical apart from the names on all four tickets and the escort route.

## 3. Discrepancies

| # | Finding | Blocks Phase 01? |
| --- | --- | --- |
| D1 | **No main-screen reference images.** §G's 00B scope is "the four locked main-screen references, key responsive and map states, and written specifications"; the package's own checklist asks Claude to review "prior approved main-screen mockups". Neither the package nor the repo contains them, so the crosscheck can only be against the written spec. Building tokens, the shell and the tracker without them means designing, which the brief forbids. | **Yes** |
| D2 | **Tracker labels do not fit at 320px.** With four chevrons (about 76 px each) at 13 px, "Configure", "Investigate", "Respond" and "Verify (n/a)" clip. The spec needs a narrow-screen rule (options in §5). | **Yes** (for Phase 03; decide now so 01's type scale fits) |
| D3 | **No reversed mark.** `nautilus-mark.svg` has a dark arch that disappears on navy. The reversed lockup fits a 320 header (206 px wide at 34 px tall), so this does not block the header, but a mark on navy (favicon on dark, compact header, inbox) needs a reversed variant, or approval to derive it with the same colour swap the reversed lockup uses. | No |
| D4 | **Outfits contradict roles.** Jenni (Receiving Supervisor, vendor escort) wears a wetsuit and dive harness; Cameron (Dive Crew Lead) wears a staff jacket and lanyard. Learners will read the wetsuit as the dive crew. Either swap the two names/roles between the portraits, or accept. Not changed: portraits and names are locked. | No (decide before Phase 02) |
| D5 | **V1 shows old faces under new names.** V1 still uses `assets/avatar_marcus.webp` (a different man) now labelled Cameron Flynn, and the old Jordyn avatar. The package forbids replacing V1 avatar files; pointing V1's `person.avatar` at `assets/v2/avatars/` needs the subpath asset resolver (Phase 01) or approval for a V1 data change. | No |
| D6 | **Build resolver.** `build.py` matches `__ART:name__` at `assets/` root only and always emits `image/webp`; V2 needs subpaths and `image/svg+xml`. Expected Phase 01 work. | No |
| D7 | **Existing V1 focus race (found in this review).** After "See record details" closes the moment, the browser's focus restoration and the app's move to the "Record details" heading run in either order. Reproduced on both the pre-change and post-change builds (4 runs each: heading 1–2 times, button inside the closed dialog otherwise). It now fails browser test 26 consistently in this environment (Chromium 153). Fix is small (move focus after the dialog's own restoration, for example on the next frame) but changes V1 code, so it needs your approval, as the iPhone SE fix did. | No (V2 must not repeat it) |
| D8 | Jordyn's portrait (HANDOFF open item): the locked portrait now wears a blazer, lanyard and ID card, so she no longer reads as a copy of Elena. Lanyard is navy like staff lanyards. Treated as resolved by the locked set. | No |
| D9 | Desktop header height is unspecified (phone: 56–64 px). Affects only texture positioning. | No |

## 4. Responsive readiness (probe outside the repo, not Phase 01 code)

| Check | 320×568 | 400×860 | 1366×900 |
| --- | --- | --- | --- |
| Header 56 px with reversed lockup and one 44 px control | Fits (logo 206 px), no overflow | Fits | Fits |
| Tracker, longest real labels | **Clips** (D2) | Fits (96 px segments) | Fits |
| Full-screen map overlay (56 px bar, inspection panel) | Map 304×228 (scale 0.76): door targets 27 px (≥24 px), lens 85 px; bar with Back, L1, L2, Inspect, Walk fits | Map 384×288: doors 35 px, lens 108 px | Map in its own column (≥1180 px) |
| Horizontal overflow | None | None | None |

Breakpoints in the handoff (inbox + work area ≥760 px, map column ≥1180 px) match the Phase 00 plan. The written spec covers every §G behaviour.

## 5. Decisions needed

1. **D1:** supply the four locked main-screen references (and any approved mobile or map-state frames), or confirm the written spec alone is the visual authority and that Claude may set tokens from it.
2. **D2, tracker at narrow widths.** Options: (a) below about 400 px, chevrons show the stage number and a done tick, and the selected stage's label appears as the heading of the instruction panel directly below (recommended: keeps four linked chevrons and full labels); (b) labels wrap to two lines at 11–12 px; (c) shortened labels. Also: should Daniel's wait route keep "Verify (n/a)" or show "Verify" in a not-applicable state?
3. D3, D4, D5, D7 as above (not blocking Phase 01).

## 6. Recommendation

**HOLD.** The assets are valid, integrated and within budget, and the name change is proven name-only. Phase 01 should start once D1 and D2 are answered: without the main-screen references, Phase 01's tokens and shell would be invented rather than implemented. Both are quick to clear; nothing else blocks.

## 7. Decisions received (Rone + GPT, Oct 31)

| Item | Decision | Status |
| --- | --- | --- |
| D1 references | Four locked workflow references (Review, Configure, Verify, Close) with `README_REFERENCE_PRECEDENCE.md`. The older Review image's Tools section is superseded. | **Received**, integrated in `docs/v2-references/` |
| D2 tracker at 320 px | Four linked, interactive chevrons kept; stage numbers and done ticks inside them where labels cannot fit; the selected stage's full label directly below the tracker; accessible names carry the full scenario-specific labels; free navigation and stage semantics unchanged. No clipping, no tiny type. | Decided |
| D3 reversed mark | Derived reversed mark-only SVG; validate and use for dark placements. | **Validated**, `assets/v2/logo/nautilus-mark-reversed.svg` |
| D4 outfits | No swaps. Portraits, identities, outfits and names locked; accurate live role labels take priority (Jenni: Receiving Supervisor / Vendor Escort; Cameron: Dive Crew Lead). | Decided |
| D5 V1 avatars | Left unchanged until V2 integration; no V1 visual changes just to synchronise faces. | Decided |
| D7 V1 focus race | Authorized fix: commit `d4eb6ff`, with a regression test covering all three exits. Browser suite 47/47. | **Fixed** |

## 8. Crosscheck against the four locked references (Oct 31)

### 8.1 Integration

- `docs/v2-references/`: `locked-review.png`, `locked-configure.png`, `locked-verify.png`, `locked-close.png` (1536×1024 each, original pixels), `contact-sheet.png`, `README_REFERENCE_PRECEDENCE.md`, `checksums.json`. All seven checksums verified. Reference only: never embedded in the build, never used as data or test fixtures.
- `assets/v2/logo/nautilus-mark-reversed.svg`: same paths and transform as the approved `nautilus-mark.svg`; only the four colours change, to exactly the reversed lockup's two colours (`#F9FCFD`, `#85D6DD`). No scripts, links, images or text. Renders cleanly on the Subtle header at 96, 40 and 24 px; the light mark disappears there, as expected. **Approved for dark placements.**

### 8.2 What the references confirm (consistent with the written spec and §G)

- Dark textured header and Shift Inbox; white or pale workspace; navy rounded tracker container with four linked chevrons, an icon in each, the label under each, a silver-blue selected segment, a "0N OF 04" counter, and a pale instruction card directly beneath.
- Review: the person's card and their own message as a conversation, tracker below.
- Configure: tactile group rows with a live door count and hours, an Access Impact panel, a map affordance ("View on Facility Map" on phone).
- Verify: a large map with lens, walk controls, inspection panel and walk log; phone gets walk details plus Inspection Lens and map buttons.
- Close: case summary plus verification results, then the issuing moment, success state and illustrated record; phone sequence matches the approved scanner-to-record flow.
- Desktop: inbox, workspace and a right map column; in Verify the map moves into the workspace at large size and the right column holds walk controls, inspection and log. This fits the single-map-instance plan (the map node moves between containers).

### 8.3 Discrepancies the precedence README does not already cover

None blocks Phase 01. Items marked *default* are what I will implement unless you say otherwise.

| # | Finding | Resolution |
| --- | --- | --- |
| R1 | **Map door markers in green/red** (Verify legend: "Granted access" / "Restricted access") before any walk. If red meant "won't open now", it would show reachability at a time on the map, revealing Cameron's 05:30 schedule problem and Daniel's reader fault before inspection. | **Rule:** door markers and lit areas show GRANTED only (time and reader status ignored), as V1 does. Time and hardware results appear only in the walk (opened / didn't open, no reason) and in inspection. |
| R2 | **Close "Ready to issue: all required steps are complete"** before the learner presses Issue. Grading runs only on Issue, so a pre-press "ready" verdict either predicts the grade or claims success before evaluation, and would appear for an over-broad badge too. | *Default:* the Close stage shows factual items only (walk verified, with time; records reviewed) and the case summary; no readiness verdict. The result appears after Issue, as now, including the existing correction feedback. |
| R3 | **Access Impact counts rooms as "doors"** ("Will be added: Kelp Hall, Living Shore, Classroom · 3 doors"). V1 deliberately separates doors (readers) from the areas they open (HANDOFF Stage 2). | **Rule:** Access Impact keeps doors and reachable areas as two lists, computed by the engine's change review (added and removed). |
| R4 | **Header "Help" and "Settings", phone hamburger, sidebar "Facility Map" and "Resources"** have no defined function. | *Default:* no Settings, Resources or hamburger. Help reopens the supervisor brief. Facility Map is the global map button (needed anyway: with Tools gone, the phone Review stage needs a map entry point, §G 2). |
| R5 | **Painted aquarium map** in Verify (illustrated habitats, numbered route pins). The engine's map is a schematic SVG with exact door and space geometry, and no aligned map artwork exists. | *Default:* V2 uses the engine's SVG map restyled to the V2 palette and materials, with numbered stop pins and a dashed route. A painted map would be a separate asset that must be drawn to the engine's coordinates; decide later (affects Phase 05 only). |
| R6 | **Close "Download Record (PDF)"** option. | *Default:* out of V2 scope (new capability). "Next request" and "Return to Shift Inbox" are kept. |
| R7 | **Issuing-animation reference** (hand-held badge at a photographic reader, steps "Creating credential / Applying access groups / Activating permissions"). | The approved Oct 28 scanner moment and wording stand (README rule 4 and the "assigned groups" copy rule). |
| R8 | **Tracker icons** exist only for Review/Configure/Verify/Close; Jordyn's and Daniel's labels (Investigate, Decide, Submit, Respond, Record) need icons. | *Default:* simple inline-SVG icons in the same line style; numbers and done ticks replace icons below the narrow breakpoint (D2). |

### 8.4 Responsive readiness, updated

The references put each stage label under its chevron. At 320 px that label space is about 70 px, still too narrow for "Investigate" or "Verify (n/a)", so the approved D2 rule applies: number or tick inside each chevron, the selected stage's full label below the tracker, full names in the accessible names. Header, map overlay and overflow results in section 4 stand.

### 8.5 Recommendation

**PASS.** The approved assets are integrated and validated, the name change is proven name-only, the reversed mark is valid, the V1 focus defect is fixed, and the four references are consistent with the written spec and §G once the precedence README and the rules above are applied. Phase 01 can start on your approval. R2, R4, R5 and R6 are defaults you can override at any point before the phase that uses them (Phase 01 needs only R4).

## 9. Approval (Rone + GPT, Nov 1)

**Phase 00B PASS approved; Phase 01 authorized.** All eight findings accepted. Final R4: header actions are **Shift Brief** (opens the supervisor brief; not labelled "Help") and **Facility Map** (global, every stage; full-screen overlay with focus management and Back on phones). Settings, Resources and the phone hamburger are removed; an explicit, accessible "Shift Inbox" back link stays. R1–R3 and R5–R8 as proposed (engine SVG map; PDF export deferred).

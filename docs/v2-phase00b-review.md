# Nautilus V2: Phase 00B review (Oct 31, 2026)

Review of `Nautilus_V2_Phase00B_Approved_Logo_Handoff.zip` against `CLAUDE.md`, `HANDOFF.md`, `v2-phase00-architecture.md` §G and `v2-asset-manifest.md`. **Recommendation: HOLD** (two blocking items, below). No V2 interface code written; Phase 01 not started.

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

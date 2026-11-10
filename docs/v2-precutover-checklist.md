# Nautilus V2: pre-cutover checklist (after Phase 07, Nov 10, 2026)

Cutover (Phase 08: `index.html` serves V2, V1 retired) waits until every item below is checked or explicitly waived by Rone. Items marked **blocking** must pass; the rest need a decision.

## Real-device checks (none can be proven in emulation)

- [ ] **Blocking.** Elena's scanner moment and issuance record on a real phone: timing feels like a payoff, Skip is easy to find, portrait sharp, record art loads, "See record details" lands on the readable record (approved Phase 06 requirement).
- [ ] **Blocking.** Map overlay on iOS Safari and Android Chrome: opens full height (`100dvh`), scrolls inside itself, Close map / Esc / system Back close it before leaving the ticket.
- [ ] Lens by touch: tap selects the intended door, drag feels controllable, the page does not scroll while dragging (`touch-action:none` only while inspecting). Decide whether tap-then-scroll to the evidence is acceptable or needs a bottom sheet (no sheet without this evidence).
- [ ] Door list (`Inspect a door`) on both platforms: native picker opens, choosing a door scrolls the evidence into view.
- [ ] Walk guard with system Back (Android back gesture, iOS swipe): asks Continue test / Cancel walk and restores the address while asking.
- [ ] Reduced motion set at the OS level: no scanner, walk steps quickly, no transitions.

## Accessibility (manual passes still owed)

- [ ] **Blocking.** Screen reader pass, VoiceOver (iOS/macOS) and TalkBack or NVDA: inbox items and status, tracker buttons (names, `aria-current`, done / not applicable), record disclosures, decision fieldsets, result announcements, all four dialogs.
- [ ] The lens uses `role="application"` while inspecting (arrow keys move it). Confirm screen-reader users find and prefer the door list; consider announcing that alternative from the Inspect button.
- [ ] 200% zoom and 200% text size at 1366px and 400px: no clipped controls, no sideways scrolling.
- [ ] Windows High Contrast / forced colours: selected chevron, selected inbox item, N/A marker and focus rings stay visible.
- [ ] Map labels (about 7px at 320px) remain decorative: confirm every door is reachable by name (tested) and every granted area is in the caption (tested).

## Instructional and content

- [ ] **Blocking (standing).** SME review: security administrator and aquarium facilities (fictional facility and policies; disclaimer stays visible).
- [ ] Elena's record artwork text is tiny on phones by design; the live Record details below it are the readable version. Keep that order.
- [ ] V1 wording kept for parity, review before cutover: the stopped-walk note (now "This door is included in the badge's permissions. Inspect it to find out why the walk stopped.") and Cameron's after-failure coaching ("Inspect that door to see why"), which is the only explicit hint (fading support by design).
- [ ] Daniel's wait route: Verify shows N/A (neutral marker) and the outcome is "Closed with a cost". Confirm learners read it as a legitimate, costly choice.
- [ ] Shift brief text still mentions "lit areas"; align with the granted-footprint wording if wanted (V1 and V2 copy).

## Technical

- [ ] Browser support: V2 relies on `<dialog>`/`showModal`, `inert`, CSS `:has()`, container queries (`@container`, `cqw`), `dvh` and `aspect-ratio`. Minimums roughly Safari 16.4, Chrome/Edge 105, Firefox 121. Decide whether older browsers need a fallback message.
- [ ] Build size: `v2.html` 616 KB (V1 470 KB), single file, no external requests. Acceptable for a portfolio page; recheck after Phase 07 polish assets, if any.
- [ ] Remove `noindex, nofollow` from the V2 page at cutover (it is a preview flag).
- [ ] Phase 08 plan: `build.py` writes V2 to `index.html`; keep V1 reachable (for example `v1.html`) or retire it; retire the 12 pinned-map V1 tests with V1; keep engine, flow (734-state baseline) and V2 suites.
- [ ] No reload persistence (decided): a refresh restarts the shift. Confirm this is acceptable for portfolio visitors.

## Polish still open after Phase 07

- [ ] Responsive spacing and hierarchy pass across all stages (Phase 07 fixed the map, lens and N/A marker; general spacing was not reworked).
- [ ] Logo lockup whitespace is trimmed in CSS; a tightly cropped lockup SVG would be cleaner.

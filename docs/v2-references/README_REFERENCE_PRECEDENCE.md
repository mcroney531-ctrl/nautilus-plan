# Nautilus V2 — Phase 00B locked screen references

These are the **four prior approved workflow concept references**, recovered without regenerating any artwork. They are **visual-direction images** for Claude's review, not production UI assets and not test fixtures. Do not embed them into the 1.2 MB HTML build. Implement the actual controls and text as HTML/SVG driven by the scenario and engine.

## Authority and precedence

1. The **current** `src/scenarios.js` and `src/engine.js` are authoritative for roles, names, IDs, authorizations, access rules, routes, outcomes and facility topology. Phase 01a's flow golden and Section G decisions are immutable without explicit approval.
2. The approved Phase 00 architecture Section G and the new 00B design agreement override any stale/mockup-only layouts or copy.
3. These four images are approved for **composition, typography hierarchy, spacing, material, tracker geometry, responsive intent, and work-area layout**; they are not literal representations of approved data or architecture.
4. Actual production assets from the approved Phase 00B asset package take precedence over decorative content drawn into these older images (new portrait crops, approved cleaned SVG logo, and Candidate 01 Subtle texture).

## References

- `locked-review.png` — desktop/mobile Review: dark marine header & inbox, bright white conversation workspace, progress tracker, blue instruction card, facility map.
- `locked-configure.png` — desktop/mobile Configure: tactility for group controls, source-of-truth access impact and footprint/map affordance, silver-blue selected chevron.
- `locked-verify.png` — desktop/mobile Verify: large engine-driven map, lens, route/walk controls, test log; on a phone the complete map opens in an overlay.
- `locked-close.png` — Close + fulfillment: review of case/verification, existing approved scanner moment, illustrated record, success view, responsive sequence.

## IMPORTANT: obsolete/misleading details inside the paintings

**Review screenshot:** shows a separate 'Tools' panel. This is a **rejected earlier element**. Do NOT build that panel. Instead, put stage-specific live workspace content directly below the four linked chevrons / current-stage instruction. Do not infer component structure from decorative cards on that image.

**Outdated names, faces and roles:** some screenshots label Marcus Lee or Jordan Kim, or misrepresent Daniel as Facilities. None of that is current data. **Use exactly:** Elena Park — Marine Educator; Cameron Flynn — Dive Crew Lead (internal scenario id remains `marcus`); Jenni Nair — Receiving Supervisor and Designated Vendor Escort (not a separate ticket, not a message sender); Daniel Brooks — **external** Frozen-Feed Driver (NO Nautilus-branded outfit or unescorted staff access); Jordyn Kim — external Exhibit AV Vendor (internal scenario id remains `jordan`). Keep the five locked modern cast portraits and approved optimized assets; do not swap faces or clothing to make role assumptions fit.

**Map/detail fidelity:** facility maps in the paintings are conceptual and do not override the working engine's true map, door list, locations, authorization windows or event outcomes. No door denial reason in the walk/ticket; only the inspection lens shows why.

**Brand:** the logos and richer header art drawn inside these mockups are not the shipped assets. Use the approved clean SVGs and subtle ocean textures already integrated by Claude.

**Data inconsistencies:** claims such as '3 doors' and dates in images are illustrations, never authoritative. Keep dynamically computed impact, granted/authorized/reachable and actual authorizations.

## Narrow-screen tracker decision (recommended for approval)

- Preserve **four linked chevron segments**, and preserve their clickable stage navigation with no gating or auto-advance.
- On 320px width (and other widths where full labels do not fit): show `1/2/3/4` inside the segments for unfinished stages, and a check mark for completed stages. The selected/current stage's **full descriptive label** is visible directly below the tracker in the live instruction heading, not clipped.
- Each segment's accessible name has the full scenario-specific stage name and completion state; the selected segment receives `aria-current="step"`. All segments have touch-target sizes meeting the established accessibility standard. Stage navigation remains independent of grading state.
- At wider sizes show the full stage names where they fit without clipping. Treat 'Verify (n/a)' as a status to convey in accessible text; do not cram it into a chevron.
- Keep the selected stage clear through solid fill, visible outline, and number/icon in addition to color. Test 320, 400, 1366, 1440 and zoom.

## Interaction and phase constraints

- All four tickets functional throughout shared-component migration. Maps/lens accessible from every stage.
- Mobile full-screen map overlay; desktop map column. Never silently cancel an active walk; ask Cancel walk / Continue test. Back closes overlay before leaving ticket.
- Build into separate `v2.html` until deliberate cutover; preserve current V1 except separately authorized small accessibility repairs.
- Focus preservation, no horizontal scroll, accessible control boundaries, and contrast are release requirements.
- No V2 implementation should start until user approves 00B PASS. Return a concise PASS/HOLD crosscheck for these supplied images.

## Provenance

Four source visuals were recovered from the previously generated Nautilus references (1536 × 1024 each). Original pixels preserved; only filenames changed for deterministic handoff. They may show outdated scenario text and early design features, as explained above.

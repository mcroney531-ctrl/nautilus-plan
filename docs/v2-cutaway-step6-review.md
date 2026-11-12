# Cutaway map, Step 6 review (Nov 12)

Scope: the flagged cutaway (`dist/v2-cutaway-preview.html?map=cutaway`) as a candidate default map for V2. The flag stays off by default, the default map is not switched, and Phase 08 is not started.

## Recommendation: HOLD

- **No blocker** was found in the automated review.
- **Two required fixes** came out of it:
  - R1: Inspect taps on rooms are captured by doors.
  - R2: the change-review outlines and parts of the footprint rim are below 3:1 contrast against the art.
- **Two required checks have not been done at all:** a real phone and a screen reader. Neither was available in this environment.

The cutaway should not become the default on this evidence. After R1 and R2 are fixed and both manual checks have been run, the decision can be made.

## What was performed, and on what

| Check | How | Done on real hardware or AT? |
| --- | --- | --- |
| Four scenarios, correct paths and meaningful wrong answers, at 320, 400 and desktop | Automated, Chromium, emulated viewports | No |
| Inspection evidence, records, grades, progression against the flat map | Automated (Step 5 suite plus this review) | No |
| Sideways scroll and clipped map controls, every stage of every ticket | Automated | No |
| Keyboard-only map use and focus restoration | Automated key presses in Chromium | No (no real keyboard and AT session) |
| Screen-reader announcements and reading order | Live-region text and the accessibility tree read from Chromium | **No screen reader used.** The tree shows the structure; it does not show what a screen reader says |
| Contrast of the overlay over the art | Pixel measurement from screenshots | No |
| 200% and 400% page zoom | Emulated (640 and 320 CSS px at device scale 2 and 4) | No |
| Reduced motion | Emulated media query | No |
| Touch: scrolling vs selection, lens drag, zoom toggle, crowded markers, Find and door list, dialog, on-screen keyboard | **Not performed.** No phone was available | — |

Raw results: `docs/v2-cutaway-step6-review.json` (script: `test/v2.cutaway.step6.review.js`). The suites run in `npm test` and `npm run test:ui` all pass:

| Suite | Result |
| --- | --- |
| V1 | 47 pass |
| V2 | 58/58 |
| Cutaway Step 3 | 10/10 |
| Cutaway Step 4 | 15/15 |
| Cutaway Step 5 | 5/5 |
| Engine | 26 pass |
| Golden flow | 10 pass |
| CSS | 4 pass |
| Assets | 4 pass |

## Automated results

- **Progression parity:** the flag-on and flag-off runs gave identical state, steps, result, record, status and grade at 320, 400 and desktop. Each run covered 11 submissions across the four tickets: wrong answers first, then the correct paths, with inspection, zoom and identification used along the way. All four end Closed. There were no page errors.
- **Evidence parity:** identical to the flat map for all 15 doors in 7 badge states (Step 5), covering 14 opening and 92 denied.
- **Layout:** no sideways scrolling and no map control outside the viewport. This held at every stage of every ticket, with the map open, with an identification showing, in Inspect, and at 2×, at all three widths.
- **Keyboard:**
  - Tab order in the map is: Level 1, Level 2, Inspect, Find (Inspect off) or door list, Zoom, map (Inspect on).
  - Focus stays on Inspect, Zoom and Find after use.
  - Arrow keys move the lens.
  - Escape closes the phone dialog to the Facility Map button.
- **Announcements (text only):** a Find choice is announced once ("Service spine · staff area · Level 1"). A cross-level choice says the level once.
- **Zoom:** at 200% and 400% page zoom there is no sideways scroll; Find, identification, evidence and the zoom toggle are all reachable.
- **Reduced motion:** no transition or animation runs in the map region.
- **Lens both ways:** Level 1 shows Level 2 through the lens ("ABOVE · L2"), and Level 2 shows Level 1 ("BELOW · L1"), with that level's picture.
- **Identification:** restricted rooms, voids, stair cores and open passages are identified correctly (Step 4: every target at three widths).

## Findings

### BLOCKER

None found by automated testing. Real-device and screen-reader testing could still find some.

### REQUIRED FIX

**R1. In Inspect, a tap on a room is often captured by a door, sometimes on the other level.**

- At desktop, a tap at the centre of 8 of the 24 spaces selects a door on the cutaway, where the flat map selects the room (at the 4 stair cores both maps already pick the core's door):

  | Room tapped (centre) | Door the cutaway selects |
  | --- | --- |
  | West service hall | Staff–gallery connector |
  | West gallery | Staff–gallery connector |
  | Kelp Hall | Food prep (Level 2) |
  | Living Shore | Food prep (Level 2) |
  | Jelly Room | Dive locker (Level 2) |
  | Seasonal | Tank-top · east (Level 2) |
  | Food prep | Food prep door |
  | Dive locker | Dive locker door |

- The cause is the hit radius:
  - The flat map picks a door within 18 plan units.
  - The cutaway picks within 22 screen px. Because the floor is squashed vertically (0.68) and the radius is fixed in screen pixels, that reaches about 26 units at desktop and more on phones. The Food prep door is 45 plan units from Kelp Hall's centre.
- It is not wrong access information: the evidence shown is the selected door's. But it moves the learner's selection to something they did not tap, often upstairs, and the design said Inspect behaviour would be unchanged.
- **Proposed fix:** in Inspect, use Step 4's capped door radius for this level, and 12 px for doors on the level seen through the lens. Re-measure against the flat map.

**R2. The change-review outlines, and parts of the footprint rim, are often below 3:1 against the painted art (WCAG 1.4.11).**

Measured per stroke pixel against the same pixel with that layer hidden, at desktop:

| Overlay | Stroke pixels at 3:1 or more | Median |
| --- | --- | --- |
| Amber "gained" outline | 27% | 1.8:1 |
| Footprint rim | 59% | 3.5:1 |
| Red "removed" outline | 62% | 3.9:1 |
| Door markers (fill and ring together) | 41–44% | 2.5:1 |

- These are what the learner reads change review and the granted footprint from.
- **Proposed fix:** a dark casing under the rim and the outlines (a wider dark stroke beneath the coloured one), as the room labels already have.
- The door markers' white ring is what makes them visible. The fill-and-ring figure above mixes in the dark fill of doors not in the badge, so the markers should be re-measured ring-only after the casing change.

**R3. Real-device touch check: not done.** Required before any default decision:
- map scrolling versus touch selection, and lens dragging;
- the zoom toggle;
- the crowded L2 pair (19 px apart at 1× on 320, under the 24 px guideline; the door list, Find and 2× are the equivalent controls);
- Find and the door list as native pickers;
- the map dialog;
- pinch: the map sets `touch-action: none` in Inspect, as the flat map does, so the browser's pinch-zoom cannot start on the map while inspecting. Page zoom is not otherwise blocked.

**R4. Screen-reader check: not done.** Required before any default decision:
- Announcement wording and order.
- Arrow keys on the closed Find list change its value on each press. That identifies each entry and can switch level as the learner moves through it. The door list has worked the same way since Phase 05, but it needs hearing with a screen reader.
- The map's reading order:
  - its name is given three times: figure caption, image label and caption text;
  - SVG text (room labels, the name on the map) is exposed inside the image and application roles.

### COSMETIC BACKLOG

- Room labels at 320 px: only the Atrium fits whole (approved in Step 4).
- The public and restricted patterns are low contrast by design (the quiet treatment). The room's kind is also given by identification and the legend.
- The lens can be cut at the edge of the plan, past the last door, as on the flat map.
- The dark bottom canvas margin under the building on phones.
- From the art backlog:
  - L1 openings 05, 07 and 08 are weak;
  - poster marks in Living Shore;
  - a teal line at the Kelp Hall tank rim;
  - the L2 wall finish is plainer than L1's.

## Needed for a GO on default adoption

1. R1 and R2 fixed, with the parity and contrast measurements re-run.
2. R3 on a real Android phone in Chrome, using the scope listed under R3. A tester records the results; Claude cannot do this.
3. R4 with TalkBack (Android) or NVDA (Windows), at minimum: identify, Find across levels, Inspect with the door list, evidence, and closing the map.
4. Then the Step 7 decision.

Fictional facility and procedures; subject-matter review required before any real use.

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

## R1 and R2: fixed (Nov 12)

Tests: `test/v2.cutaway.r1r2.test.js` (4/4, in `npm run test:ui`). Measurements: `docs/v2-cutaway-r1r2.json`.

**R1, Inspect hit-testing.** In order:
1. A door on the shown level wins when genuinely hit: within 12 px of its marker, or within the flat map's 18 plan units and Step 4's capped radius.
2. A door on the level seen through the lens wins only within **10 px** of its marker.
3. Otherwise the room under the tap.

The 10 px was chosen by sweeping 6–22 px against the real marker positions:

| Measure | 10 px | Why it was chosen |
| --- | --- | --- |
| Room centres captured by an other-level door | 0 at every width | 12 px still captured one room centre at 320 px |
| Finger reach (taps 0 and 4 px off the marker) | 72.5–73.3% | The same as 12 to 22 px. Below 10 px it falls to 39–66% |
| Floor captured by other-level doors | 3.6–5.7% | |

- **Centre taps on all 24 spaces now match the flat map at 320, 400 and desktop**, with one exception. At the Ops offices centre the *flat* map captures a Level 1 door (Staff–gallery connector) through the lens; the cutaway selects the room. No door on the other level is captured anywhere on the cutaway.
- **Every door stays reachable** at three widths, 1× and 2×:
  - on its own level, by a click on the marker and 6 px to each side;
  - from the door list;
  - through the lens from the other level, for 11 of 15 doors. The other 4 are the stair-core doors, which sit in the same spot on both levels, where the shown level's door wins by design. They are reachable on their own level and from the list.
- **One Step 4 test changed** to the R1 rule. At 2× the crowded pairs are 39–52 px apart, so a click halfway between them is 20–26 px from either marker, which is not a genuine hit. The test now requires:
  - clicks on each marker, and within 8 px of it, pick that door;
  - clicks between the markers pick the nearer door or the room, never the farther door.

**R2, contrast.**
- Every boundary line has a dark casing, 1 px each side. A dashed line gets dashed casing, 1 px longer at each end of every dash, so the gaps still show the art.
- The first solid casing made the gained outline look like hazard tape and covered room edges, so it was replaced.
- The share of line-colour pixels at 3:1 or more against the adjacent colour, over the real art:

| Line | With casing (320 / 400 / desktop, 1× and 2×) | Without |
| --- | --- | --- |
| Footprint rim | 96–99% | 77–89% |
| Gained outline (amber) | 96–99% | 40–72% |
| Lost outline (red) | 97–99% | 90–97% |

- Anti-aliased edge pixels, a blend of the line and its edge, are reported separately in the JSON and not counted.
- Door markers stay above the casings.
- Room labels and markers are unchanged.

**Reruns after R1 and R2:**

| Run | Result |
| --- | --- |
| Step 6 automated review: playthrough at three widths | Identical, all Closed |
| Step 6 automated review: layout | Clean |
| Cutaway Step 3 | 10/10 |
| Cutaway Step 4 | 15/15 |
| Cutaway Step 5 | 5/5 |
| V2 | 58/58 |
| V1 | 47 pass |
| Engine, golden flow, CSS and assets | Green |

The automated door markers measure in the table under R2 above (41–44% at 3:1) was taken before these changes and is not re-measured ring-only; the phone check covers how markers read.

**Still open:** R3 and R4, using `docs/v2-cutaway-device-checklist.md`, which also covers text-size scaling (the app sets text in px, so 200% page zoom passing does not show that a larger font setting works).

## Needed for a GO on default adoption

1. R1 and R2 fixed, with the parity and contrast measurements re-run.
2. R3 on a real Android phone in Chrome, using the scope listed under R3. A tester records the results; Claude cannot do this.
3. R4 with TalkBack (Android) or NVDA (Windows), at minimum: identify, Find across levels, Inspect with the door list, evidence, and closing the map.
4. Then the Step 7 decision.

Fictional facility and procedures; subject-matter review required before any real use.

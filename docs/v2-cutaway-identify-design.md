# Cutaway map: identify-on-tap (integration Step 4). Finalised design; built Nov 12 behind the flag

Status, Nov 12: built behind the cutaway flag, with the Inspect zoom and the quieter footprint (see the integration plan). Steps 5 to 7 are not authorised. Implementation notes are at the end.

## What exists today (V2, flat map), and must keep working

- Outside **Inspect** the map is a picture (`role="img"`) named by its caption. Taps do nothing.
- In **Inspect** a tap or drag moves the lens and selects: a door under the lens on this level, else a door on the level seen through it, else (on a tap) the room. The evidence panel below the map shows only what is selected. Arrow keys move the lens. The named-door picker appears in Inspect and selects a door on either level.
- Denial reasons appear only in that evidence. The walk and the ticket never give one.

## The pattern

**A tap identifies. Inspection explains.** Identification says *what a thing is*, from the building's own data. It never says what this badge may do there.

### 1. Tap and Inspect do not collide

| Mode | Tap on the map | Result |
| --- | --- | --- |
| Inspect off | Identify | The thing's name appears on the map and in one identify line under it. No lens, no evidence, no selection stored on the ticket. |
| Inspect on | Unchanged from today | The lens moves and selects; the evidence panel shows it. The identify line shows the same name, so the two modes read alike. |

- Identifying a door outside Inspect offers one button in the identify line: **Inspect this door**. That turns Inspect on with the lens on that door, exactly as choosing it in the picker does. A tap never turns Inspect on by itself.
- The named-door picker is unchanged, and still only in Inspect.
- During a walk, taps identify nothing, as Inspect is unavailable today.

### 2. What is under a tap: one deterministic order

Measured in screen pixels, on the level shown. First match wins.

1. **Door**: the nearest door marker within 22 px. Ties go to the smaller distance, then to the door's id.
2. **Open passage**: within the passage's 15-unit span along its wall and 6 units either side of the wall line.
3. **Void** (Level 2): inside a void's rectangle.
4. **Stair core**: inside a core's rectangle.
5. **Room**: inside a room's rectangle.
6. Otherwise nothing, and the identify line clears.

Doors come first because they are the smallest targets and the only ones with evidence. Passages come before rooms because a passage lies on the line between two rooms. The Reef tank's water and the bridge are part of the Tank-top catwalks room.

Where two door markers are closer than 24 px (Quarantine and Tank-top west at 320 px), the tap rule above still picks one deterministically; the picker and the list in section 5 are the equivalent that does not depend on aim.

### 3. Labels: which stay, which appear on identification

- **Always visible:** a room's name, only where the whole name fits on that room's floor at the current width without touching a door marker. At 320 px that is about three rooms per level; at desktop nearly all.
- **Never always-visible:** door names, passage, stair and void names.
- **On identification:** the name of whatever was tapped, as a callout at that spot (the callout V2 already draws for a selected door), and in the identify line.
- No label is added to make a restricted room, a void or a core stand out. Restricted rooms keep the pattern V2 already draws when they are in the granted footprint.

So "selective labels" and "no permanent labels" mean: keep the room names that fit, add none, and let a tap name everything else.

### 4. One presentation, phone and desktop

- **Identify line:** one line directly under the map, above the caption. Form: **Name** · what it is · level. It is a polite live region.
- **Callout:** the same name on the map at the tapped spot, placed to stay inside the canvas margin.
- Same on every width; nothing hover-only.

### 5. Keyboard and screen reader

- A **Find on the map** list next to the level switch, available with Inspect off: grouped as Rooms, Doors, Open passages, Stairs, Open to the level below, for both levels. Choosing an entry switches level if needed and identifies it, the same as a tap. It is the equivalent control for every tap target, including the crowded ones.
- The identify line announces the result. Outside Inspect the drawing stays `role="img"`; its caption keeps the text summary of the badge.
- In Inspect nothing changes: arrow keys move the lens, the picker selects doors, evidence is announced as today.

### 6. Wording

| Thing | Identify line | Never says |
| --- | --- | --- |
| Room | **Food prep** · staff area · Level 2 | anything about this badge |
| Restricted room | **Quarantine** · restricted area · Level 2 | "no access", "denied", who may enter |
| Door | **Quarantine** · door with a badge reader · Level 2 · *Inspect this door* | whether it opens, or why not |
| Open passage | **Open passage** between West mezzanine and Ops offices · no reader · Level 2 | "unlocked", "always open to you" |
| Stair core | **West core** · stairs between Level 1 and Level 2 | that the stair is free to use: its doors have readers |
| Void | **Open to Level 1** · the Atrium is below · not a room on this level | anything that suggests a way down |

"Restricted" is the engine's classification of the room, the same word V2's legend already uses. It is a fact about the room, shown for every learner and every badge alike.

Only doors have inspection evidence. Selecting a room in Inspect keeps today's behaviour. Passages, cores and voids get no evidence panel content beyond their identification: there is nothing to inspect, and none is invented.

### 7. Scenario, permission and grading semantics

- Identification reads only the engine's static data: `SPACES`, `DOORS`, `LINKS`, `VOIDS`. It does not call `canEnter`, `walk` or `footprint`.
- It stores nothing on the ticket: no selection, no record entry. The identified item lives in view state, like the level switch.
- Granted, authorized and reachable are untouched; the map still draws granted only.
- Tests to add with the implementation: every tap target on both levels identifies at 320, 400 and desktop; ticket state, record and result are identical before and after any number of identifications; no identify text contains a denial word; the order in section 2, including the crowded pair; the Find list reaches every target.

## Decisions (Rone, Nov 12)

1. **Rooms in Inspect:** existing behaviour stays. A room can still be selected in Inspect and is identified; only doors produce access evidence. Passages, cores and voids are identified with no evidence.
2. **Keyboard and screen reader:** the grouped Find on the map list. Rooms are not Tab stops.
3. **Restricted classification:** shown to every learner, whatever the badge.
4. **Stairs:** described as the connection between levels. Door permissions stay in inspection.

The separation stands: tap identifies; Inspect explains.

## What Step 3 measured, and what it changes here

Measured on the flagged cutaway at its rendered size (`docs/v2-cutaway-step3-measurements.json`; the map is 304 px wide at 320 px, 384 px at 400 px, 364 px in the desktop column, and the building takes 83% of that).

| At 320 px | Cutaway | Flat map today |
| --- | --- | --- |
| Door marker | 14 px | 9 px |
| Door hit area | 44 px | 27 px |
| Closest markers, L1 | 26 px (Classroom, Living Shore staff gate) | 33 px |
| Closest markers, L2 | **19 px** (Quarantine, Tank-top · west) | 34 px |
| Lens | 71 px | 85 px |

Share of each room's floor where a tap selects the room and not a door, at 320 px: both stair cores **0%** on both levels (also 0% at 400 px and desktop); East mezzanine 21%; Dive locker 24%; West service hall 37%; West mezzanine 39%; Quarantine 40%; West gallery 50%; every other room over 50%.

So the concern is real: a 44 px door target does swallow room taps, and it swallows the stair cores entirely.

**Changes to section 2 (hit-testing):**

- A door's hit radius is **22 px, capped at half the distance to the nearest other door marker on that level, and never under 12 px**. At 320 px the Quarantine and Tank-top west doors then get about 10 px each by the cap and 12 px by the floor, so they overlap by a few pixels; the nearer centre wins, as before. No tap between two doors can pick a third thing.
- Inside a stair core, the core wins over its door unless the tap is within 12 px of the marker. The core's floor is about 25 × 13 px at 320 px, so on a phone the Find list is the dependable way to reach a core; the design does not pretend otherwise.
- These radii apply to identification (Inspect off). In Inspect the existing door-first selection is unchanged, because it is existing behaviour and the lens is for doors.

**Changes to section 4 (callout):** the callout is placed above the item, below it near the top edge, and is moved sideways if it would cover another door marker within 30 px. It must never cover the marker, passage gap or void edge it names. Step 3 already tests this for door names on all 15 doors at three widths.

## Coverage required before and with implementation

| Risk | Test |
| --- | --- |
| Real overlapping targets at 320 px | Real taps at the rendered positions of Quarantine and Tank-top · west, and at the midpoint between them and 4 px either side of it: each identifies the nearer door, never a room or the other level. Same for Classroom and Living Shore staff gate, and Dive locker and Tank-top · east. |
| Door radius intercepting room taps | For every room on both levels at 320, 400 and desktop: a real tap at the room's largest clear point identifies the room. The measurement above is re-run and must show every room except the cores over 50% at 320 px. |
| Stair cores | A tap in each core more than 12 px from its door marker identifies the core; the Find list reaches all four cores. |
| Callouts covering features | For every identifiable thing: the callout's box does not intersect the item's own marker or gap, nor any door marker within 30 px, and stays inside the canvas. |
| Find list switching levels | Choosing an item on the other level switches level, keeps focus on the Find list, announces "Level 2" and then the identification, in that order, once each. Escape or closing the map dialog returns focus to the control that opened it, as today. |
| Existing Inspect behaviour | The current V2 suite's Inspect tests run unchanged with the flag on: room tap selects the room, door tap selects the door, the panel's content for a door is byte-identical flag on and off, and a selected passage, core or void adds nothing to the panel beyond its name. |
| Semantics | Ticket state, record and result are identical before and after any number of identifications. No identify text matches a denial word. |

## Implementation notes (Nov 12)

- **Built as designed:** hit order (door, open passage, void, stair core, room), the capped door radius (22 px, half the distance to the nearest marker, never under 12 px), the core-beats-its-door rule, the wording table, "Inspect this door", the grouped Find list, identification only in view state, no lens or evidence outside Inspect, nothing during a walk.
- **Announcements:** the identify line is not itself a live region. Every identification is announced once through the page's existing live region instead, so a Find choice on the other level reads "Level 2. Quarantine · restricted area · Level 2" in one message, in that order. Two live regions could not guarantee the order and would announce the name twice.
- **Callouts:** stricter than designed. No identify callout covers any door marker (not only those within 30 px), its own gap or a void's edge, at 320 px, 400 px and desktop, from a tap or the Find list. An area's name (room, stair core) may sit closer to the tapped spot, since no marker is under it.
- **Reach at 320 px:** every stair core and all 7 open passages answer a real tap at all three widths. The crowded pairs pick the nearer door at the markers and 4 px either side of the midpoint.
- **Room labels are fewer than estimated.** Whole names that fit their floor: 1 on L1 and 0 on L2 at 320 px (the Atrium); 2 and 1 at 400 px and desktop. The design guessed about three per level at 320 px. Taps and the Find list name everything else; no labels were forced.
- **Zoom and labels:** at 2× in Inspect more labels fit; a label under the lens is hidden with the rest of that level's overlay, as markers are.

Fictional facility and procedures; subject-matter review required before any real use.

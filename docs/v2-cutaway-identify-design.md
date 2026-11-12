# Cutaway map: identify-on-tap (integration Step 4). Design note for review; not implemented

Status, Nov 12: design only. Steps 1 and 2 are built behind a flag; Steps 3 to 7 are not authorised.

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

## Questions for review

1. **Rooms in Inspect:** today a tap on a room in Inspect selects it and the panel says something about it. Keep, or make rooms identify-only in both modes so that evidence is strictly about doors?
2. **Find list or more:** is one grouped list enough as the keyboard equivalent, or should rooms on the map also be reachable by Tab?
3. **"Restricted area" for every learner:** it tells a learner Quarantine is restricted before they inspect anything. I think that is right, since V2's legend already does, but it is a teaching choice.
4. **Stair wording:** "stairs between Level 1 and Level 2" names the connection. Should it also name the doors on each side (West core · L1 and West mezzanine), or leave that to inspection?

Fictional facility and procedures; subject-matter review required before any real use.

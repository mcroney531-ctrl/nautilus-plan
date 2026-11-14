# Cutaway map: phone and TalkBack checklist (R3, R4)

For Rone, on an Android phone in Chrome. It takes about 30 minutes. Write PASS, FAIL or NOTE beside each line, and add a screenshot or a short screen recording for anything that isn't PASS. Claude cannot run this. Nothing here counts as passed until you report it.

## Open the flagged preview (the default V2 is unchanged)

1. On the phone, open **https://mcroney531-ctrl.github.io/nautilus-plan/dist/v2-cutaway-preview.html?map=cutaway**
   - The `?map=cutaway` part turns the cutaway on. Without it, the same file shows the ordinary flat map.
   - `v2.html` carries no cutaway art at all, so nobody using the normal V2 link sees any of this.
   - **Deployment status:** GitHub Pages builds `main` on every push. The run for commit `c0c20c2` succeeded, and its site artifact (172 MB) matches the repository's tracked files (177 MB). There is no Jekyll config excluding `dist/`, so the file should be published at this address. Claude cannot load the page from its environment, so step 1 is the real check: if the map shows painted art, the preview works.
   - The preview is **one self-contained file** (about 1 MB, with the art embedded and no other files), so nothing else has to load.
   - **If the link fails:** that is a publishing problem, not a failed test. Tell Claude. As a fallback, on a computer, download `dist/v2-cutaway-preview.html` from the repository and send it to the phone; Android Chrome's handling of local files varies, so the Pages link is the reliable route.
2. Leave Chrome's zoom at 100% and the phone's font size at default for parts A to D.

**Priority if time is short:** A3–A8, B1–B3 and C1–C8 first; the rest can follow.

## A. Touch (TalkBack off)

Open Elena's ticket → Configure → tick **All Staff** and **Education** → Facility Map.

| # | Do | Expect | Result |
| --- | --- | --- | --- |
| A1 | Swipe up and down with the finger starting **on the map**, Inspect off | The page scrolls. Nothing on the map gets selected | |
| A2 | Tap a room (Inspect off) | Its name appears on the map and in the line under it. No lens | |
| A3 | Tap **Inspect**, then drag the lens slowly across the map | The lens follows your finger; the page does **not** scroll | |
| A4 | In Inspect, tap **Zoom in**, then drag the lens to the right edge and hold it there | The view slides to follow the lens. **Whole building** returns to the full map | |
| A5 | In Inspect, try to pinch-zoom the page while your fingers are on the map | Note what happens. The map blocks pinch while inspecting (the flat map does too); pinch outside the map should still work | |
| A6 | L2, 1×, Inspect: tap the **Quarantine** door, then the **Tank-top · west** door (the closest pair) | Each tap selects the door you meant. Count misses out of 5 tries each | |
| A7 | Same pair at **2×** | Each tap selects the door you meant (5 tries each) | |
| A8 | In Inspect, tap the middle of **Kelp Hall** on L1 | Kelp Hall is selected, not a door upstairs (the R1 fix) | |
| A9 | Inspect off, use **Find on the map** → Level 2 · Rooms → Quarantine | The map switches to L2 and names Quarantine. The native picker opens and closes normally | |
| A10 | In Inspect, use **Inspect a door** → Loading dock | The lens moves to the dock and the evidence shows below | |
| A11 | Close the map with **Close map**, reopen, then use the phone's **Back** gesture | The map closes; Back doesn't leave the ticket | |
| A12 | Open the map, rotate the phone to landscape and back, with a door selected in Inspect | The lens and its name stay on the door; nothing is cut off | |
| A13 | Go to **Verify** → walk Elena in | The walk plays on the whole building, with no zoom controls during it | |
| A14 | Anything you had to tap twice, couldn't reach, or that scrolled unexpectedly | Note it | |

The on-screen keyboard: there are no text fields in the map, so there is nothing to test there. A9 and A10 use native pickers instead.

## B. Text size (WCAG 1.4.4; the app sets text sizes in px)

| # | Do | Expect | Result |
| --- | --- | --- | --- |
| B1 | Chrome → Settings → Accessibility → **Text scaling 200%**, then reload | Note whether the map controls, the identify line and the evidence get larger. If they **don't**, that is a finding: px sizes ignore this setting | |
| B2 | Android Settings → Display → **Font size** at maximum, then reload | Same as B1 | |
| B3 | With B1 on: open the map, identify a room, use Inspect and the evidence | Nothing overlaps or cuts off; no sideways scrolling | |
| B4 | Reset both settings | | |

## C. TalkBack (Settings → Accessibility → TalkBack on)

Swipe right to move forward, double-tap to activate. Elena's ticket → Facility Map.

| # | Do | Expect to hear | Result |
| --- | --- | --- | --- |
| C1 | Swipe through the map dialog from the top | "Facility map", Close map, Level 1 Gallery, Level 2 Topside, Inspect, Find on the map, then the map's description once or more. Note how many times the description is read | |
| C2 | Double-tap **Find on the map**, choose **Level 2 · Rooms → Quarantine** | Once: "Level 2. Quarantine · restricted area". Focus stays on the list | |
| C3 | Choose **Level 2 · Doors → Quarantine** | "Quarantine · door with a badge reader · Level 2", and an **Inspect this door** button after the line | |
| C4 | Activate **Inspect this door** | Inspect turns on; you hear "Inspect on. Inspecting Quarantine"; focus is on the door list | |
| C5 | Swipe on to the evidence | Inspection, Quarantine, Reader, Entry, Groups, This badge "Not granted", "Denied · badge has no group for this door", Records | |
| C6 | Find on the map: with focus on the closed list, swipe up and down (TalkBack's way of changing a value) | Note whether each step announces and switches the map. This is the R4 question | |
| C7 | Double-tap **Zoom in**, then **Whole building** | "Zoomed in, 2 times" / "Showing the whole building"; focus stays on the button | |
| C8 | Close the map | Focus returns to the **Facility Map** button | |
| C9 | Anything read twice, not at all, or in a confusing order | Note it | |

## D. Cross-check against the flat map (two minutes)

| # | Do | Expect | Result |
| --- | --- | --- | --- |
| D1 | Open the same link **without** `?map=cutaway`, Daniel's ticket → Facility Map → Inspect → Loading dock | The same evidence text as with the cutaway (reader fault) | |

## Findings log (real device)

| # | Found | Class | Status |
| --- | --- | --- | --- |
| F1 | Facility Map opened from the Shift Inbox: Inspect looked disabled with no reason given, and was mistaken for a broken feature. Inspect works from Elena's ticket | Minor UX and accessibility | **Fixed Nov 14, re-check on the phone:** in the inbox, Inspect stays unavailable but can be focused. "Open a ticket to inspect doors." is shown under the controls, is the button's description for screen readers, and is announced if the button is used. Tickets are unchanged; during a walk Inspect is disabled as before. Applies to the flat map too. Test in `test/v2.test.js` |

## Report back

Paste the tables with the Result column filled in, plus any screenshots. Include the phone model, Android version and Chrome version.

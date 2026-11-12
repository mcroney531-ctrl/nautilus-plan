# Cutaway map: mobile usability spike (Nov 12)

This spike is isolated: `src/v2` is not modified. `spikes/cutaway-zoom/build.py` applies its patches to the V2 sources in memory and writes `v2-zoom.html` (open it with `?map=cutaway`; add `&fp=quiet` for the quieter footprint). The patches are the implementation proposal. `spikes/cutaway-zoom/test.js` holds the interaction tests and writes `measurements.json` and `shots/`. Result: **10 of 10 pass.**

Step 4, Steps 5 to 7, default-map replacement and cutover stay on HOLD.

## What was tried

1. **The overview is unchanged.** At 1×, the spike draws exactly what today's flagged preview draws. This is byte-identical overlay markup, viewBox and lens clip, tested at 320 px, 400 px and desktop, with Inspect off and on, on doors on both levels.
2. **Zoom exists only in Inspect.** Inside Inspect there are three controls: −, + and *Whole building*, with zoom levels 1×, 2× and 3×. Turning Inspect off, starting a walk, or choosing *Whole building* returns to today's full canvas with its margins. Zoom is view state only: ticket state, steps, record and result were identical before and after zooming.
3. **The view follows the lens.** There is no separate pan gesture. Dragging the lens to the edge, tapping, pressing arrow keys, or choosing from the door list moves the lens, and the view keeps the lens and its label inside the map. So there is no clash between panning, dragging the lens and scrolling the page, and keyboard users get panning for free.
4. **Lens while zoomed:** the lens is capped at 112 px across on screen (at 1× it is today's lens). It shows less of the other level, which is the point of focused inspection.
5. **Hit testing** stays in screen pixels. The 22 px door radius and nearest-door-wins rule apply after zoom unchanged.
6. **Quieter footprint (opt-in, `fp=quiet`):** same meaning and legend. Public gallery dots and restricted stripes are kept, but sized in screen pixels:

   | Pattern | Today | Quiet |
   | --- | --- | --- |
   | Public gallery dots | about 4 px apart at 320 px | 12 px apart |
   | Restricted stripes | spaced with the map | 10 px apart, 40% opacity |

## Measurements (Inspect, lens on Quarantine)

The map element is the same size at every zoom; the view shows 100%, 25% and 11% of the canvas at 1×, 2× and 3×.

| 320 px | 1× (today) | 2× | 3× |
| --- | --- | --- | --- |
| Closest markers, L1 | 26 px | 52 px | 77 px |
| Closest markers, L2 (Quarantine and Tank-top · west) | **19 px** | **39 px** | 58 px |
| Lens | 71 px | 112 px | 112 px |
| Stair cores: share of floor where a tap selects the room | 0% | 25% | 63% |
| East mezzanine: share of floor where a tap selects the room | 21% | 74% | 90%+ |

At 400 px: L2 pair 24 / 49 / 73 px; cores 0 / 50 / 76%. At desktop: L2 pair 23 / 46 / 69 px.

**Real clicks at 320 px and 2×.** Each pair was clicked at both markers, and at 4 px either side of their midpoint. All 12 clicks picked the nearer door.

| Pair | Distance apart at 2× |
| --- | --- |
| Quarantine / Tank-top · west | 39 px |
| Classroom / Living Shore staff gate | 52 px |
| Dive locker / Tank-top · east | 45 px |

**Edges.** At 2× and 3×, the lens, the selection ring and the door's name stayed inside the map for all 15 doors, at all three widths. There was no sideways scrolling.

**Not covered by the margins.** Arrow keys can push the lens past the last door to the edge of the plan, where it is cut. Today's 1× map does the same; the margins only guarantee room for a lens centred on a door.

## Recommendation (smallest viable)

- **Build the zoom with two states: Whole building and 2×.** Make it a single toggle in Inspect rather than −/+ with 3×.
  - 2× clears the 24 px spacing guideline for every door pair at 320 px (closest pair 39 px), and gives the lens 112 px.
  - 3× only adds stair-core tap area. The Find list (Step 4) and Step 4's rule that a core beats its door away from the marker cover that.
- **Keep the follow-the-lens view.** Don't add free panning or pinch:
  - Inspect already sets `touch-action: none`, so the browser's own pinch is unavailable on the map in Inspect. Adding a custom pinch is the general navigation system GPT ruled out.
  - Zoom is never needed to finish a scenario, because the door list and the Find list do not depend on it.
- **Adopt the quiet footprint** at all widths, with the same legend.
- **Fold all of this into Step 4's build, in this order:** the zoom toggle, the quiet footprint, then identify-on-tap.
  - Step 4's tap-radius cap was designed around the 19 px pair at 1×; zoom does not change it, because identify works at 1× too.
  - When identify is built, a tap with Inspect off stays at 1×. Zoom stays an Inspect tool.

## Open points

- **Phones only, or every width?** At desktop the map is 364 px wide, close to a phone's, and the measurements are similar. My recommendation is all widths, for one behaviour.
- **Test coverage:** this was tested with mouse events in Chromium. A real-device touch check belongs to Step 6, as for the rest of the map.

Fictional facility and procedures; subject-matter review required before any real use.

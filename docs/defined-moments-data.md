# Defined moments: data available to the artwork

Reference for designing the completion artwork (the Dine-O end-card method: fixed designed art, live data in deliberately empty regions). Written at the functional freeze (tag `functional-freeze`). Nothing here changes the working build.

## How it plugs in

- `buildRecord(sc, t)` in `src/ui.html` builds the record from live state when a ticket is finalized (a `good` result, or Daniel's costed Wait). Tickets that need correction never produce a record.
- `recordHTML(sc, t)` is the current plain presentation. The finished artwork replaces only this function. `buildRecord()` stays as the contract.
- All text on the artwork should stay live HTML laid over the art, not baked into the image: it changes with the learner's choices, it must be readable by screen readers, and it has to survive long names.

## What `buildRecord()` returns today

```
{ kind, title, status, ref, outcome,
  person: { name, role, initials },
  fields: [[label, value], ...] }
```

| Ticket | kind | title | status | fields (in order) |
| --- | --- | --- | --- | --- |
| Elena | `issue` | Credential issued | Issued | Groups, Opens, Hours, Authorization, Verified |
| Marcus | `update` | Access updated | Temporary access | Exception, Authorization, Verified |
| Jordan | `offboard` | Audit recorded | Deactivated | Action, Reason, WO-1873, Remaining access |
| Daniel (escort) | `response` | Entry recorded | Escorted | Response, Escort, Authorization, Outcome |
| Daniel (wait) | `response` | Delivery delayed | Delayed | Response, Authorization, Outcome |

The ticket's `principle` line and the feedback text (`t.result.title` / `.text`) are also available.

### Real values the art has to hold (correct outcomes)

| Slot | Elena example | Longest current value |
| --- | --- | --- |
| Name | Elena Park | Daniel Brooks (13 chars). Design for 24. |
| Role (today's text) | Marine educator · starts Tuesday | 32 chars. A badge needs a shorter title; see gaps. |
| Groups | All Staff, Education | 2 groups |
| Opens | West Staff Entrance, Staff–gallery connector, Living Shore staff gate, Classroom | about 80 chars (4 doors) |
| Hours | All Staff 06:00–20:00 · Education 06:30–18:00 | about 45 chars |
| Authorization | WA-1041 | Short IDs (WA-1041, WO-2291, WO-1873, PO-4410, ESC-07) |
| Verified | Walked in, Tue 07:15 | short |
| Marcus exception | WO-2291: Tue 2026-10-27 05:00–08:00 · this badge only | about 55 chars |
| Jordan reason | Work authorization ended; no new approval exists | about 50 chars |
| Daniel escort | Priya Nair, Receiving supervisor · ESC-07 | about 42 chars |

## Gaps the finished artwork will probably need

None of these exist yet. Listed so the compositions can decide which ones they use; each would be a small data addition, not new logic.

1. **Portrait** per person, and for Priya: an image path. A consistent style across all five characters.
2. **Badge title**, shorter than `role`: for example "Marine Educator" (Elena), "Dive Crew Lead" (Marcus), "Exhibit AV Vendor" (Jordan), "Vendor · Deliveries" (Daniel).
3. **Department** if the badge shows one: Education, Husbandry / Dive, Exhibits (vendor), Receiving (vendor).
4. **Credential ID / employee number**: a fictional, consistent scheme (for example `NMC-` plus digits). Also seeds the decorative non-scannable code, so it is stable per person.
5. **Credential type**: Staff / Vendor / Contractor. It drives badge colour bands and is instructionally useful, because vendor badges should look different from staff badges.
6. **Dates: keep credential validity and work authorization separate.** These are two different things, and keeping them apart is the point of Jordan's ticket. The artwork must not merge them.
   - *Credential validity*: is the badge itself active? This is a property of the badge (status, issue date, and an expiry only if the badge has one).
   - *Work authorization*: is there current approval for the access the badge provides? This is a property of the records (WA-1041, WO-2291, WO-1873, PO-4410, ESC-07), each with its own window.
   - Jordan's problem is that WO-1873 ended on 2026-07-20 while his credential stayed active and kept granting access. Do not show a badge-level "No expiry set" as the cause; whether his badge had its own expiry is not established and should not be implied.
   - Issue dates need deciding deliberately, not defaulting. Only Elena's badge is issued today (2026-10-27). Marcus, Jordan and Daniel hold existing credentials: Oct 27 is the date of the update, audit, or response record, not of their badges. Their original issue dates (and any badge expiry) are content decisions still to be made.
7. **Approver / signature line** for the record: the approver names already exist on the authorization records (for example "J. Okoye, Education Manager" on WA-1041).
8. **Status stamp text** per outcome: ISSUED / TEMPORARY · EXPIRES 08:00 / DEACTIVATED (or VOID) / ESCORTED ENTRY / DELIVERY DELAYED.

## Constraints to design for

- **Sizes:** phone portrait from 320 to 412 px wide is the main target; desktop and phone landscape must also work. Dine-O scaled one board image and positioned the slots in percentages. That works if the art is designed at a reference size with slot boxes defined as percentages of it. A portrait composition (around 4:5) suits phones; desktop can show the same board centred.
- **Text slots:** each needs a box with room for the longest value above, at a readable size on a 320 px screen (at least 12 px). The long list fields (Opens, Hours) need multi-line space or can move to an expandable list under the art.
- **Contrast:** live text sits on the art, so the slot backgrounds need to stay plain enough to keep WCAG contrast.
- **Motion** (approved in principle): badge arrives, a brief scan passes, confirmation appears. Under a second, skippable, and with a static end state for `prefers-reduced-motion`.
- **Feedback stays separate:** the artifact records the outcome. The feedback and principle text can sit beneath it rather than inside the artwork.
- **Fictional disclaimer** stays visible somewhere on screen; the badge art should read as fictional (no real-looking security features, decorative code only).

## Deliverables that make integration fast

For each artifact: the art at the reference size (plus 2x), a list of slots with x / y / width / height as percentages, the font and size per slot, the alignment, and what each slot shows when a value is empty.

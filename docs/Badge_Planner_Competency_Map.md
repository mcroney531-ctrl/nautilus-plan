# Badge Planner Competency Map

Oct 26, 2026 · @Rone

Four scenarios train one job, a security administrator issuing and maintaining badge access, moving from one correct configuration to adapting a correct one when the building changes.

## Learner and job

The learner is a newly assigned security or facilities administrator who issues and maintains badge access for one building.

The performance: given an access request, grant exactly what the person needs, for exactly when they need it, and confirm it works from their side before closing the ticket. They also need to spot access that works but shouldn't exist.

This is not a course about the badge software. The workstation is a stand-in for any access system, and the skills transfer.

## Scenario arc

Each scenario adds one new skill and reuses everything before it. Characters are placeholders until the setting is chosen.

| # | Scenario | Character | Job task | New competency | Where the masking matters | Failure the learner can hit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Issue | New hire | Build a badge from scratch | Least privilege: pick groups that cover the need and nothing else | Footprint shows a "convenient" group bringing a restricted room inside the shape | Picks the broad group because it covers everything in one click |
| 2 | Diagnose | Dale, contractor | Fix a badge that looks right but fails | Separate where access applies from when it applies | Footprint looks correct; Dale's walk fails; the lens shows the 7:00 schedule | Widens access for a whole group (38 badges) instead of scoping a window to Dale |
| 3 | Audit | Former contractor | Review a badge nobody has complained about | Find access that works but shouldn't exist | Nothing fails on the walk; the lens lays the original work authorization over what the badge still opens, and the two contradict | Closes the ticket because nothing is broken |
| 4 | Hiccup | TBD | Keep someone working when the building changes | Choose between expanding access and a workaround under pressure | Lens shows a door reader offline; the footprint is still correct | Grants General Staff to reroute instead of arranging an escort |

## Masking layers

Each layer answers a question the others can't. If a layer stops doing that in a scenario, cut it from that scenario.

| Layer | Question it answers | Merge Shapes operation | Can't show |
| --- | --- | --- | --- |
| Badge footprint (admin view) | Where does this badge open? | Union per access group, Union of groups into the badge | Time, door status, whether rooms connect |
| Person's walk (their view) | Does it actually work for them? | Badge shape Subtracted from a dark building plate | Why a door failed |
| Inspection lens | What's here that the overview can't show? (schedules, authorizations, door status) | Lens-shaped hole over an information layer that changes by scenario | The big picture |

## Scaffolding

Support fades as the shift goes on, so the learner's last decisions are their own.

1. **Issue:** guided. Prompts point to the footprint and ask whether anything outside the need is lit.
2. **Diagnose:** hinted. The lens is always available. A prompt to use it appears after the failure, and the first pass names what to look for. A learner who inspects before issuing can prevent the failure entirely.
3. **Audit:** unprompted. No failure, no hint. The ticket just says "routine review."
4. **Hiccup:** independent. Two valid paths, and feedback compares the tradeoff instead of marking right or wrong.

The workstation, map, and characters stay the same throughout. Only the requests change.

## Setting requirements

The fictional business has to make all four scenarios feel natural. Use this list to check setting ideas against.

- A restricted room someone shouldn't drift into (server room, pharmacy, cash office, lab)
- At least two entrances with different rules (front and service or dock)
- Outside workers who come in on time windows
- Enough departments that a "convenient" group can overgrant
- A plausible reason someone left and never got cleaned up
- Doors or equipment that can go down without anyone being at fault
- A floor plan simple enough to read on a phone

## Open questions

- [ ] Does the learner ever get to inspect before something fails? A pre-flight check would reward expertise over trial and error.
- [ ] Is the hiccup scenario graded, or does it compare tradeoffs only?
- [ ] One persistent shift, or four separate scenarios from a menu?
- [ ] How much of this needs a real security admin to sanity-check before it goes in the portfolio?
- [ ] Which setting? Check candidates against Setting requirements.

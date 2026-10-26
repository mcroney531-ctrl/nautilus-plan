# Nautilus Access Desk

Interactive e-learning prototype. A newly assigned security/facilities administrator at a fictional aquarium (Nautilus Marine Center) issues and maintains badge access: configure, walk the person in, inspect with a masking lens, revise.

Fictional facility and policies. Not security or life-safety guidance; needs SME review before any real use.

## Commands
- `npm test` runs the engine tests (Node, no dependencies).
- `npm run build` inlines the engine and scenarios into `dist/nautilus_access.html` and a root `index.html` (served by GitHub Pages from `main`). Needs Python 3.

## Layout
- `src/` engine, scenarios, UI shell
- `test/` engine tests
- `dist/` built single-file app
- `docs/` competency map (instructional-design reference) and the Masking Mock Lab (process evidence, not part of the app)
- `reference/` superseded v1 prototype
- `HANDOFF.md` implementation source of truth; `CLAUDE.md` working rules

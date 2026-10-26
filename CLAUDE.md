# Nautilus Access Desk

Portfolio e-learning prototype: a fictional aquarium's badge-access workstation where the learner configures access, walks it as the person, inspects with a masking lens, and revises. Started from E-Learning Heroes challenge #571 (Merge Shapes / masking). **Read HANDOFF.md before doing anything.**

## Commands
- Test engine: `node test/test.js` (must stay green; add a test for every new rule or scenario)
- Build: `python3 build.py` → `dist/nautilus_access.html` (single self-contained file, no external deps)
- Check visually at phone width (~400px) AND desktop before calling UI work done. Playwright + Chromium are usually available: `require('playwright')`.

## Non-negotiables
- Access logic lives in `src/engine.js` and is data-driven. **No scenario-specific branches** in access evaluation. A new ticket = new person + request + records in `src/scenarios.js`.
- Keep three concepts separate in code and UI: **granted** (badge), **authorized** (work records), **reachable** (from an entrance at a time).
- Denial reasons are never shown by the walk or the ticket. Only inspection reveals why.
- The lens is the selector: the inspection panel only shows evidence for what the lens/tap selected.
- Change review = effective-permission difference (new − old, old − new), never "which checkbox changed."
- Wrong options must be tempting, never strawmen.
- Readers check on entry into the secured side; exit is free (simulation rule, not a life-safety model).
- Fictional facility and policies. Keep the SME-review disclaimer.

## Working with Rone
Short, direct, answers first. Wants real pushback, not validation. No filler words ("straightforward," "genuinely," "honestly"), no summary endings, bullets only when content is list-shaped. Acknowledge mistakes in one sentence. Rone often relays decisions through GPT: when asked, write a paste-ready prompt for GPT that invites disagreement.

# Nautilus V2: asset manifest (Phase 00A, in progress)

Status of every V2 visual asset: what is **production-ready**, what is a **candidate**, and what is **reference only**. Production assets are embedded into the single-file build, so each has a size budget (total embedded under 1.2 MB, see `v2-phase00-architecture.md` E). Reference images are design direction only; they are never cropped, embedded or treated as scenario data.

Status key: **Approved** (cleared for use) · **Candidate** (production-quality file, choice pending) · **Reference** (direction only, not a usable asset) · **Needed** (not yet supplied).

## 1. Textures (header and Shift Inbox sidebar)

Decision deferred (Rone + GPT, Oct 30): both directions are kept and will be judged in the real responsive shell during Phase 01. Whichever wins, it is applied with CSS `background-size: cover` plus a CSS gradient overlay, behind live HTML; no text, logo or control is ever baked into a texture.

### Candidate 01: Subtle Underwater (production-ready)

| File | Size | Bytes | Status |
| --- | --- | --- | --- |
| `assets/v2/textures/subtle/nmc-texture-header.webp` | 2560×640 | 14 KB | Candidate |
| `assets/v2/textures/subtle/nmc-texture-sidebar.webp` | 720×1600 | 7 KB | Candidate |
| `assets/v2/textures/subtle/source/make_textures.py` | generator | | Source (writes to `/mnt/data/...`; edit `out` to rerun) |

Measured (white text, WCAG): header worst case 6.9:1 (bright light-ray area, right half), 14.9:1 in the left 36% text-safe zone; sidebar worst case 11.1:1. **Passes AA everywhere without an overlay.** Low detail, so it reads as "deep water" rather than "reef" and loses most of its light rays in a thin desktop header. Size cost is negligible (21 KB).

### Candidate 02: Richer Underwater (reference only)

| File | Size | Status |
| --- | --- | --- |
| `mock-like-collage-preview.png` (held by Rone/GPT, not in the repo) | 1983×793 | Reference |
| `mock-like-board-preview.png` (held by Rone/GPT, not in the repo) | 1536×1024 | Reference |

No standalone files exist yet; nothing may be cropped from the boards. Measured on the board's header art: white-text contrast falls to about 1:1 in the light shafts, and a tenth of the area is below 3:1. To reach AA (4.5:1) for white text everywhere it needs a **navy overlay of about 60%** (4.8:1 worst case; 70% gives 6.9:1). Estimated cost as standalone WebP: header about 190–250 KB, sidebar about 100–130 KB at quality 70–80. Because the overlay hides fine detail, quality 60–65 is probably enough. The board's sidebar art puts dense kelp at the left edge, exactly where avatars and names sit.

**The Candidate 02 board is not a source of scenario data.** It shows names, roles, portraits and a logo that differ from the approved project: "Marcus Lee, Contractor", "Jordyn Kim, Researcher", "Daniel Brooks, Facilities", "Priya Shah, Operations". The scenarios are authoritative: Marcus Reyes (dive crew lead), Jordyn Kim (exhibit AV vendor), Daniel Brooks (frozen-feed driver, vendor), Priya Nair (receiving supervisor). Its portraits are also a different style from the approved circular avatars.

### Responsive application (either candidate)

| Surface | Phone (320–759 px) | Desktop |
| --- | --- | --- |
| Header | Full width, about 56–64 px tall: `cover` shows nearly the whole 4:1 image, compressed | Full width, about 64–80 px tall at 1440: a 20:1 strip, so `cover` shows only about a fifth of the image's height; `background-position` must target the art's focal band |
| Shift Inbox | Full-screen inbox (portrait about 0.5–0.6 aspect): sidebar art crops slightly | Sidebar about 260–300 px wide: `cover` crops the sides of the 720-wide art |

Both need a solid fallback colour (the navy token) for loading, forced-colours mode and print.

### Requirements for the design handoff (00B)

1. **Fix the header height** at each breakpoint before final header art is made. A 4:1 master is mostly wasted in a 20:1 desktop header. Either supply the header as 2560×320 (8:1) with the focal content in a stated horizontal band, or state the band (for example "focal detail in y = 35–65%") so CSS can position it.
2. **Text-safe zones are part of the asset spec:** header left 40% (logo, wordmark, page title) and the sidebar's centre column (avatars, names, previews, status) must be calm. Detail belongs at the edges and toward the bottom.
3. **Contrast is tested on the composed surface:** live white text over texture plus overlay must meet 4.5:1 (normal text) and 3:1 (large text, icons, selected-state indicators) at the brightest point under any text. A text shadow does not count.
4. **Selected and inactive inbox states must not depend on the texture:** each inbox item gets its own solid or translucent backing so selection reads the same over any part of the art.
5. **If Candidate 02 is chosen**, supply clean standalone files: header (2560×640, or 2560×320 per item 1) and sidebar (720×1600), WebP or high-quality PNG, with no text, logos, UI, people or credentials, with the calm zones from item 2, and without baked-in darkening (the overlay stays in CSS so it can be tuned against contrast measurements). The optional "light rays overlay" and "reef ambience" panels on the board are not needed for the locked layout; skip them unless 00B places them.

## 2. Logo

| Asset | Status |
| --- | --- |
| Canonical circular-wave logo system: full lockup, reversed lockup for navy, mark only (must read at 24 px) | **Needed** (in production) |

SVG, text outlined. The Candidate 02 board shows a logo concept; it is reference only until the canonical files arrive.

## 3. Character portraits

| Person | File | Status |
| --- | --- | --- |
| Elena Park | `assets/avatar_elena.webp` (192 px) | Approved (V1 style) |
| Marcus Reyes | `assets/avatar_marcus.webp` | Approved (V1 style) |
| Daniel Brooks | `assets/avatar_daniel.webp` | Approved (V1 style) |
| Jordyn Kim | `assets/avatar_jordyn.webp` | **Needs regeneration** (HANDOFF open item: too close to Elena; staff polo on a vendor) |
| Priya Nair | none | **Needed** |

Master spec: 1024×1024 PNG with transparency, circle-cropped, same framing, lighting and background for all five; Claude produces the 192 px web sizes. **Open question:** the approved set is the circular stylized avatars; the Candidate 02 board shows a different, more photographic set with wrong names. Confirm the approved set remains canonical.

## 4. Decorative elements

Candidate 02 board shows wave divider, fish school, coral corner and kelp concepts. **Reference** only; SVG preferred, `aria-hidden`, and only where 00B places them.

## 5. Approved Elena outcome assets (unchanged)

`assets/record_issue_v1.webp` (166 KB), `assets/badge_front_v1.webp` (63 KB): approved, in use in V1.

## 6. Embedded budget so far

| Item | KB |
| --- | --- |
| Elena record + badge | 229 |
| Four avatars | 56 |
| Textures, Candidate 01 | 21 |
| Textures, Candidate 02 (estimate, q65–80) | 250–380 |
| **Total with Candidate 01 / Candidate 02** | **about 306 / 535–665** |

Both fit under 1.2 MB, leaving room for the logo, Priya and later outcome artwork.

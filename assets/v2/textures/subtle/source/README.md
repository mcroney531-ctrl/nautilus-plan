# Nautilus V2 — underwater UI textures (candidate 01)

Two clean, standalone backgrounds generated specifically for the Nautilus V2 shell, **not extracted from composite mockups**. No labels, logos, text, credentials or controls are baked in.

- `nmc-texture-header.webp`: 2560 × 640, text-safe dark navy at left, subdued blue light and fish silhouettes toward right. Intended behind live Nautilus branding and top navigation.
- `nmc-texture-sidebar.webp`: 720 × 1600, darker underwater motif, intended behind live Shift Inbox controls, avatars and ticket list.
- `texture-preview.png`: layout preview made from the two full standalone assets.
- `make_textures.py`: reproducible source generator for adjustable color/light/opacity.

These are **candidates pending visual approval**, not the final design freeze. Their intentionally low contrast is for *background* usage. Overlay a dark gradient if needed and test live text against the composed surface to WCAG contrast targets; do not rely on text shadow alone. Avoid stretching the textures unevenly; use `background-size: cover` and CSS gradient overlays. Their exact artwork alignment is not itself information-bearing.

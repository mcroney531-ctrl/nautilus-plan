"""Shared by surfacemask.py and maskcheck.py: what a surface mask must keep clear of, read from the painting."""
import numpy as np
from PIL import Image, ImageFilter
_f = lambda m, flt: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(flt)) > 0
grow = lambda m, n: _f(m, ImageFilter.MaxFilter(2 * n + 1)); shrink = lambda m, n: _f(m, ImageFilter.MinFilter(2 * n + 1))
def painted_caps(a, T):
    """Painted wall caps on wall line T: neutral near-white pixels within 16 px of the wall's outline. (Mid-wall near-white
    pixels are lamp housings, not caps.)"""
    a = a.astype(int); white = (a.min(axis=2) > 185) & (a.max(axis=2) - a.min(axis=2) < 30); return white & T & ~shrink(T, 16)
def locked_mask(man, a):
    """Locked pixels. A plain entry locks its whole box. An entry with "silhouette" locks the painted exhibit inside the box:
    its bright water and glass (G and B over the thresholds), closed over 3 px gaps and grown 3 px."""
    a = a.astype(int); out = np.zeros(a.shape[:2], bool)
    for l in man.get("locked", []):
        b = l["box_px"]; box = np.zeros_like(out); box[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
        if "silhouette" in l: s = l["silhouette"]; sil = box & (a[..., 1] > s["min_g"]) & (a[..., 2] > s["min_b"]); out |= grow(shrink(grow(sil, 3), 3), 3) & grow(box, 3)
        else: out |= box
    return out
def wall_silhouette(p, w, shape, grow_px=4):
    """Screen silhouette (variant C, 4 px per unit) of a partition-height north-south wall at plan x = w["at"], y = w["a"]..w["b"]:
    side face, cap and the end face towards the viewer, grown by grow_px."""
    from PIL import ImageDraw
    s, k, off, h, sh, t = 4, p["k"], p["off"], p["hI"], p["sh"], 2.2; X = lambda x: x * s; Y = lambda y: (off + k * y) * s
    xx, ya, yb, dx, dy = X(w["at"]), Y(w["a"]), Y(w["b"]), sh * h * s, h * s; ht = t * s / 2; im = Image.new("L", (shape[1], shape[0]), 0); d = ImageDraw.Draw(im)
    d.polygon([(xx - ht, ya), (xx + ht, ya), (xx + ht, yb), (xx + ht + dx, yb - dy), (xx + ht + dx, ya - dy), (xx - ht + dx, ya - dy)], fill=255)
    d.polygon([(xx - ht, ya), (xx - ht, yb), (xx + ht, yb), (xx + ht + dx, yb - dy), (xx - ht + dx, yb - dy)], fill=255)
    return grow(np.asarray(im) > 0, grow_px)

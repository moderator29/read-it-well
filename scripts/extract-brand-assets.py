#!/usr/bin/env python3
"""
Cut the NaijaFinds brand artwork out of the supplied sheets.

Reproducible so the assets can be regenerated when new artwork arrives, rather
than existing as one-off files nobody can rebuild.

Sources are the owner-supplied sheets. Set SHEETS to wherever they live.

Island: the supplied render has three label chips baked into it. They carry
garbled text and invented inventory counts, so they are removed here and live
chips are composed over the image in the UI instead.
"""

from PIL import Image, ImageFilter
from collections import deque
import numpy as np
import pathlib
import sys

SHEETS = pathlib.Path("assets/source-sheets")
BRAND = pathlib.Path("apps/web/public/brand")

CUTOUT = "island-logo-cutout.png"   # alpha already present
CLEAN = "auth-icons.png"            # same artwork, no annotation


def trim(img: Image.Image, thr: int = 12, pad: int = 2) -> Image.Image:
    a = np.asarray(img)[:, :, 3]
    ys, xs = np.where(a > thr)
    return img.crop(
        (
            max(0, xs.min() - pad),
            max(0, ys.min() - pad),
            min(img.width, xs.max() + 1 + pad),
            min(img.height, ys.max() + 1 + pad),
        )
    )


def is_label(px) -> bool:
    """The flat indigo chips and their white text."""
    r, g, b, a = px
    if a < 40:
        return False
    if 12 <= r <= 100 and 10 <= g <= 85 and 50 <= b <= 175 and b > r + 22 and b > g + 27:
        return True
    return r > 190 and g > 190 and b > 195


def strip_labels(img: Image.Image, seeds) -> Image.Image:
    a = np.asarray(img).astype(int).copy()
    h, w = a.shape[:2]
    mask = np.zeros((h, w), bool)
    for sx, sy in seeds:
        if sx >= w or sy >= h or not is_label(a[sy, sx]):
            continue
        q = deque([(sx, sy)])
        while q:
            x, y = q.popleft()
            if x < 0 or y < 0 or x >= w or y >= h or mask[y, x]:
                continue
            if not is_label(a[y, x]):
                continue
            mask[y, x] = True
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    # Generous dilation. The chips have a soft drop shadow and an antialiased
    # edge; a tight mask leaves a dark halo exactly where the chip used to be,
    # which is more visible than the chip.
    m = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(11))
    a[np.asarray(m) > 100] = [0, 0, 0, 0]
    return Image.fromarray(a.astype("uint8"), "RGBA")


def largest_component(img: Image.Image) -> Image.Image:
    """Drop every floating fragment left behind by the chip removal."""
    a = np.asarray(img).copy()
    solid = a[:, :, 3] > 40
    h, w = solid.shape
    seen = np.zeros((h, w), np.int32)
    comp = 0
    sizes = {}
    for y in range(h):
        for x in range(w):
            if solid[y, x] and seen[y, x] == 0:
                comp += 1
                n = 0
                q = deque([(x, y)])
                seen[y, x] = comp
                while q:
                    cx, cy = q.popleft()
                    n += 1
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and solid[ny, nx] and seen[ny, nx] == 0:
                            seen[ny, nx] = comp
                            q.append((nx, ny))
                sizes[comp] = n
    if not sizes:
        return img
    main = max(sizes, key=sizes.get)
    a[seen != main, 3] = 0
    return trim(Image.fromarray(a, "RGBA"), thr=10, pad=0)


def main() -> None:
    cut = SHEETS / CUTOUT
    clean = SHEETS / CLEAN
    if not cut.exists() or not clean.exists():
        print(f"source sheets not found under {SHEETS}, nothing to do", file=sys.stderr)
        return

    BRAND.mkdir(parents=True, exist_ok=True)
    src = Image.open(cut).convert("RGBA")

    island = trim(src.crop((30, 190, 600, 705)))
    island = strip_labels(
        island,
        seeds=[(120, 120), (150, 135), (100, 110), (378, 55), (390, 70), (410, 45),
               (460, 165), (470, 180), (500, 155)],
    )
    island = largest_component(island)
    island.save(BRAND / "island.png", optimize=True)
    print("island", island.size)

    # Logo comes from the un-annotated sheet so no marker ink is included.
    csrc = Image.open(clean).convert("RGBA")
    logo = trim(csrc.crop((630, 210, 1005, 570)))
    logo.save(BRAND / "logo.png", optimize=True)
    print("logo", logo.size)

    print("run scripts/build-icon-assets.py next to resample and sharpen")


if __name__ == "__main__":
    main()

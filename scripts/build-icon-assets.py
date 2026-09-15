#!/usr/bin/env python3
"""
Build the Vallo icon and brand assets from the supplied artwork.

Two jobs:

1.  Give the secondary icons the same tile the primary sheet has, so the whole
    family reads as one set. The primary "3D ICON STYLE" sheet ships each glyph
    on a rounded, glass-lit indigo tile. The eleven slots pulled from the larger
    192 icon pack ship bare. Compositing them onto a matched tile is what makes
    a mixed-source set stop looking mixed.

2.  Resample everything to a consistent 2x working size with Lanczos plus a
    light unsharp pass. This does not invent detail the source never had, but it
    stops the browser doing a cheaper bilinear upscale on high density screens,
    which is where these were visibly soft.

Re-runnable. Reads from assets/, writes to apps/web/public/.
"""

from PIL import Image, ImageDraw, ImageFilter
import json
import pathlib

ICONS = pathlib.Path("apps/web/public/icons")
BRAND = pathlib.Path("apps/web/public/brand")

# Sampled from the primary sheet's own tiles.
TILE_TOP = (69, 30, 101)
TILE_BOTTOM = (84, 76, 200)
TILE_RADIUS_RATIO = 0.22

# Slots taken from the 192 icon pack. These arrive bare and need a tile.
SECONDARY = [
    "verified", "secure", "search", "star", "bed", "bath",
    "pool", "wifi", "parking", "location", "kitchen",
]

TARGET = 200          # 2x the largest size any surface renders an icon at
ISLAND_TARGET = 1100  # 2x the widest the hero renders


def make_tile(size: int) -> Image.Image:
    """Rounded, vertically graded, glass-lit tile matching the primary sheet."""
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGBA", (size, size))
    px = grad.load()
    for y in range(size):
        t = y / max(1, size - 1)
        px_row = tuple(
            round(TILE_TOP[i] + (TILE_BOTTOM[i] - TILE_TOP[i]) * t) for i in range(3)
        )
        for x in range(size):
            px[x, y] = (*px_row, 255)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=round(size * TILE_RADIUS_RATIO), fill=255
    )
    tile.paste(grad, (0, 0), mask)

    # Inner top-left specular, the thing that gives the tile its glass read.
    spec = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(spec)
    d.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=round(size * TILE_RADIUS_RATIO),
        outline=(255, 255, 255, 46),
        width=max(1, round(size * 0.018)),
    )
    d.ellipse(
        [-size * 0.25, -size * 0.55, size * 0.78, size * 0.42],
        fill=(255, 255, 255, 20),
    )
    spec = spec.filter(ImageFilter.GaussianBlur(size * 0.02))
    tile.alpha_composite(Image.composite(spec, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask))
    return tile


def sharpen(img: Image.Image) -> Image.Image:
    return img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=62, threshold=2))


def fit(img: Image.Image, box: int) -> Image.Image:
    s = box / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def main() -> None:
    manifest = json.loads((ICONS / "_manifest.json").read_text())

    # 1. Tile the secondary icons.
    tile = make_tile(TARGET)
    for name in SECONDARY:
        p = ICONS / f"{name}.png"
        if not p.exists():
            print(f"  skip {name}, not present")
            continue
        glyph = Image.open(p).convert("RGBA")
        glyph = sharpen(fit(glyph, round(TARGET * 0.62)))
        canvas = tile.copy()
        canvas.alpha_composite(
            glyph,
            ((TARGET - glyph.width) // 2, (TARGET - glyph.height) // 2),
        )
        canvas.save(p, optimize=True)
        manifest[name] = {"w": TARGET, "h": TARGET, "src": "pack-192 on generated tile"}
        print(f"  tiled  {name}")

    # 2. Resample the primary icons up to the same working size.
    for p in sorted(ICONS.glob("*.png")):
        name = p.stem
        if name in SECONDARY:
            continue
        img = Image.open(p).convert("RGBA")
        if max(img.size) < TARGET:
            img = sharpen(fit(img, TARGET))
            img.save(p, optimize=True)
            manifest.setdefault(name, {})
            manifest[name].update({"w": img.width, "h": img.height})
            print(f"  scaled {name} -> {img.size}")

    (ICONS / "_manifest.json").write_text(json.dumps(manifest, indent=2))

    # 3. Brand artwork.
    for fname, box in (("island.png", ISLAND_TARGET), ("logo.png", 760), ("mark.png", 640)):
        p = BRAND / fname
        if not p.exists():
            continue
        img = Image.open(p).convert("RGBA")
        if max(img.size) < box:
            img = sharpen(fit(img, box))
            img.save(p, optimize=True)
            print(f"  brand  {fname} -> {img.size}")

    print(f"done. {len(manifest)} icons in pack.")


if __name__ == "__main__":
    main()

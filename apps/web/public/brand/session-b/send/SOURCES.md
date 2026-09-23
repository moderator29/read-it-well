# Session B crops: send

Cut by `scripts/design/session-b-crops.mjs --surface send` (the `send` block,
wallet worker). Render: `77A54EA3-BBB5-4BF4-B3A5-144C99CABAF7.png` at the
repository root, 1024x1536, phone screen 667 image px wide.

Treatment for every file: plane-fit ground subtraction, brightest-channel key,
unpremultiplied, alpha feathered over the outer 4 per cent, WebP with alpha at
the source's own size (never upscaled).

| File | Box (left, top, w, h) | Source | Display at 390 | What it is |
| --- | --- | ---: | --- | --- |
| `plate-recipient.webp` | 228, 694, 64, 64 | 64px | 34px (68 at 2x, 102 at 3x) | Person glyph on a round glass plate, the Recipient row |
| `plate-amount.webp` | 228, 874, 64, 64 | 64px | 34px (68 at 2x, 102 at 3x) | Naira sign on a round glass plate, the Amount row |
| `plate-note.webp` | 227, 1026, 64, 64 | 64px | 34px (68 at 2x, 102 at 3x) | Speech bubble on a round glass plate, the Narration row |
| `plate-shield.webp` | 229, 1230, 64, 64 | 64px | 34px (68 at 2x, 102 at 3x) | Shield with a tick on a round glass plate, the reassurance card |

Sharp at 2x. At 3x each is a 1.6x upscale and reads softer on a 3x phone; the
render has no more pixels to give.

Not cut, on purpose: the Bank row's plate (bank send was removed by the founder on 23 September), the scan
button (no scanner), the NDIC and 256 bit badges (false or uncheckable
claims), and the plate inside the lit Send Money button (it sits on saturated
blue, which the key cannot separate from its ground; drawn in CSS).

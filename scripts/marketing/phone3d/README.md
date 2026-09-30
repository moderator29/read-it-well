# phone3d — photoreal 3D phone renders for store screenshots, social posts and films

three.js (0.186.1) running in headless Chromium with WebGL2 on SwiftShader, driven from Node.
The phones are generic geometry built in code: no brand artwork, logos or trademarks.

- **Stills** (`studio.mjs`): transparent PNGs. Rendered at 2× with 4× MSAA, then downscaled with
  sharp's lanczos3. Returns the projected screen corners and a CSS homography so you can anchor
  HTML overlays.
- **Live mode** (`browser/live.js`): draws the same phones into a film page's own canvas, one
  synchronous, deterministic `render()` per frame.

```
phone3d/
  studio.mjs            Node API: createPhoneStudio(), startPhoneServer(), homography helpers
  poses.mjs             pose presets (shared by Node and browser)
  browser/engine.js     stills engine (runs in the page)
  browser/live.js       live mode for films
  browser/look.js       environment (RoomEnvironment + softboxes, PMREM), lights, screen/sheen materials
  browser/models.js     'island' + 'android' models, colour variants
  browser/geometry.js   continuous-corner outline, profile sweep, caps/rings, buttons
  browser/homography.js 4-point homography -> CSS matrix3d (Node + browser)
  browser/index.html    stills engine page; browser/live-test.html live-mode demo (time slider)
  test/make-test-screen.mjs  builds the 1320×2868 test screen
  test/gallery.mjs           every pose × both models + colour variants -> contact sheets
  test/live-frames.mjs       live-mode frames, determinism check, AA timings
```

Requirements: `playwright-core` and `sharp` resolve from the repo root `node_modules`.
three resolves from `scripts/marketing/node_modules`. Chromium defaults to `/opt/pw-browsers/chromium`
(override with `executablePath` or `PHONE3D_CHROMIUM`). The browser is launched with
`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-webgl`.
Startup fails loudly if no WebGL2 context can be created. A local HTTP server (127.0.0.1, random
port) serves the ES modules, because Chromium blocks module imports from `file://`.

## Stills API

```js
import { createPhoneStudio } from '/home/user/read-it-well/scripts/marketing/phone3d/studio.mjs';

const studio = await createPhoneStudio();      // one browser, reused; ~10–15 s incl. shader warm-up
const r = await studio.render({
  screen: '/abs/path/screen.png',              // path or Buffer (PNG/WebP/JPEG, sRGB), ideally 1320×2868
  model: 'island',                              // 'island' | 'android'
  color: 'black-titanium',                      // 'black-titanium' | 'natural-titanium' | 'blue' | 'silver'
  width: 1600, height: 2400,                    // output px
  pose: 'three-quarter-left',                   // or rotation: { x, y, z } (degrees); both may be combined
  fov: 24, fill: 0.8,
  shadow: { type: 'drop' },                     // 'contact' | 'drop' | 'none' (default)
});
// r.png, r.shadowPng?, r.screenCorners, r.screenCss, r.bbox, ...
await studio.close();
```

`createPhoneStudio(options)`:

| option | default | |
|---|---|---|
| `executablePath` | `/opt/pw-browsers/chromium` | Chromium binary (or env `PHONE3D_CHROMIUM`) |
| `msaa` | true | 4× MSAA on top of the 2× supersample |
| `warmup` | true | render once per model at startup so shaders and PMREMs are compiled before your first render |
| `verbose` | false | forward the page console |
| `args` | [] | extra Chromium flags |

`studio.info` has the WebGL renderer string, the models and the colours. Calls to `render()` are queued: there is one GPU context.
`startPhoneServer()` (the static/screen/upload server), `homography()` and `cssMatrix3d()` are exported too.

### Options

| option | default | meaning |
|---|---|---|
| `screen` | required | Path or Buffer. Unlit (`MeshBasicMaterial`, `toneMapped:false`), sRGB, mipmaps and 16× anisotropy, so UI colours are pixel-accurate. It fills the display rect exactly for 1320×2868 images. Other aspect ratios are cover-fitted and anchored at the top (`screenFit: 'stretch'` to stretch instead). |
| `model` | `'island'` | `island`: 77.6 × 163 × 8.25 mm, pill cut-out with lens dot. Left side: small button and two volume buttons. Right side: long power button and a flush button. `android`: 76 × 160.6 × 8.2 mm, satin frame, centred punch hole, volume rocker and power on the right. Its height follows from even 1.95 mm bezels around a 1320×2868 display. |
| `color` | island `black-titanium`, android `silver` | frame / back / antenna colours |
| `width`, `height` | 1600 × 2400 | output size in px |
| `supersample` | 2 | render scale before the lanczos3 downscale (1–4). Big frames are tiled automatically (≤ 8192 px per side and ≤ 16.8 MP per tile). |
| `pose` | `'front'` | preset (see below). Sets `rotation` and `fov`, and for close-ups also `focus`, `show` and `fill`. Explicit options win. |
| `rotation` | from pose | `{x, y, z}` in degrees, Euler order ZXY (yaw → pitch → roll). `y>0` shows the phone's **left** edge (screen turns right). `x>0` tips the top towards the camera, `x<0` leans it away (the bottom edge becomes visible). `z>0` rolls counter-clockwise. |
| `fov` | pose / 22 | vertical field of view of a frame in which the whole phone fills 85 %. It only controls perspective strength: a wider fov puts the camera closer. |
| `fill` | 0.8 | fraction of the frame the phone's projected bbox fills (limiting dimension); with `show`/`crop`, the fraction that region fills. `>1` lets the phone bleed off the frame. |
| `focus` | `{x:0,y:0}` | point on the phone the camera aims at, as fractions of width/height from the centre (+y = top). Aiming at the top (`y:0.4`) is like moving the camera up there: the top face of the frame shows, as in IMG_6732. |
| `show` | – | phone-space framing `{from, to}`, as fractions of the phone's length from the top. That section is fitted to `fill`, and the cut edge is aligned to the frame edge (e.g. `{from:0,to:0.6}` = top 60 %, running off the bottom). |
| `crop` | – | image-space framing `{x0,y0,x1,y1}` (0..1 of the projected phone bbox, y down). Presets: `'top'`, `'bottom'`, `'top-half'`, `'bottom-half'`. |
| `align` | `'auto'` | `'center'`, `'top'`, `'bottom'`, `'left'`, `'right'` or combinations (`'top left'`): puts the fitted region flush with that frame edge. |
| `offset` / `offsetPx` | 0 | shift in fractions of the frame (`{x, y}`, +y down) or in px. The shift is a lens shift, so perspective is unchanged, like cropping a bigger photo. |
| `reflection` | 0.12 | glass sheen on the display, 0..1 (fresnel + soft studio gradient + faint diagonal streak, blended toward white by at most a few %). `0` leaves the screen pixels untouched. |
| `exposure` | 1.0 | tone-mapping exposure (Khronos PBR Neutral). It affects the metal only, never the screen. |
| `env` | `'light'` | studio preset: `'light'` for light backdrops, `'dark'` (brighter rims) for dark ones |
| `envIntensity`, `keyLight` | 1, 1 | environment and key-light multipliers |
| `shadow` | `{type:'none'}` | see Shadows. A string works as shorthand: `shadow: 'drop'`. |
| `shadowMode` | `'composite'` | `'composite'`: the shadow is inside `png` (phone over shadow). `'separate'`: `png` is the phone only and the shadow comes back in `shadowPng`. |
| `shadowPng` | false | also return the shadow layer when compositing |
| `pngCompression` | 6 | zlib level for the PNGs |

### Result

| field | |
|---|---|
| `png` | Buffer, RGBA PNG with **straight** alpha on a transparent background (shadow included when `shadowMode:'composite'`) |
| `shadowPng` | Buffer or null: the shadow alone, as colour `#000` with alpha |
| `screenCorners` | `{topLeft, topRight, bottomRight, bottomLeft}` output-px positions of the **display rect** corners (= the screen image's corners for 1320×2868 images; the display's rounded corners lie inside them) |
| `screenQuad` | the same four as `[[x,y] ×4]` in order TL, TR, BR, BL |
| `screenImage` | `{width, height, corners}`: projected corners of the supplied image (differs from the display rect only when cover-fitted) |
| `screenHomography` | 3×3 row-major matrix mapping screen-image px `(u,v)` to output px: `x = (h0u+h1v+h2)/(h6u+h7v+h8)`, `y = (h3u+h4v+h5)/(…)` |
| `screenCss` | `matrix3d(…)` mapping an element of the screen image's size (e.g. 1320×2868 CSS px) onto the screen: `position:absolute; left:0; top:0; transform-origin:0 0; transform:<screenCss>` inside a container the size of the output image |
| `bbox` / `shadowBbox` | tight `{x, y, width, height}` of the phone (alpha > 1 %) and of the shadow, in output px |
| `bboxProjected` | analytic projected bbox (sub-pixel) |
| `timings` | ms: `total`, `browser`, `browserMain`, `browserShadow`, `resize`, `encode` |

Anchoring an HTML pop-up card to a point of the screen: map the point from screen-image px with `screenHomography`.
To lay a whole HTML screen over the display, use `screenCss`. Both are exact, because a
perspective view of a plane is a homography.

### Poses

| pose | rotation (x, y, z) | fov | notes |
|---|---|---|---|
| `front` | 0, 0, 0 | 22 | straight on (IMG_6734 / IMG_6730) |
| `three-quarter-left` | 4, 30, 0 | 24 | left edge + buttons visible, screen faces right |
| `three-quarter-right` | 4, −30, 0 | 24 | right edge + buttons visible, screen faces left |
| `hero-low` | −24, −22, 2 | 34 | camera below, phone leaning away (IMG_6738 / 6.jpg) |
| `top-down-steep` | −45, −27, 6 | 38 | seen from above, bottom edge (port, speaker holes) toward camera (IMG_6731 / IMG_6737) |
| `lean-back` | −32, 9, 0 | 26 | reclined like on a stand |
| `flat-tilt` | −12, 32, 19 | 26 | floating, tilted (IMG_6739 left phone) |
| `flat-tilt-right` | −18, −30, −8 | 28 | its mirror (IMG_6739 right phone) |
| `hero-high` | 18, 0, 0 | 34 | camera aims at the top from slightly above |
| `closeup-top` | 32, 0, 0 | 62 | + `focus {y:.4}`, `show {0,.66}`: top of the phone with its top face (IMG_6732 / 9.jpg) |
| `closeup-bottom` | −45, −27, 6 | 38 | + `focus {y:−.3}`, `show {.42,1}`: bottom part from above (IMG_6731 / IMG_6737) |
| `hero-top` | −24, −22, 2 | 34 | + `show {0,.78}`: hero-low bleeding off the bottom edge (IMG_6738) |

### Shadows

The shadow is a real projection of the phone onto a backdrop plane behind it. The plane faces
the camera, as for a light studio background. It is not a blurred copy of the silhouette.

- Each point's distance to the backdrop is recorded, and the penumbra grows with it, using three
  height bands blurred separately. Parts near the backdrop cast tighter, darker shadows, which
  matters for tilted poses.
- An ambient-occlusion layer (straight-back projection, wide blur) is added on top.
- Masks are rendered at half resolution in WebGL and blurred with sharp (Gaussian), then
  upscaled.

| field | `drop` default | `contact` default | |
|---|---|---|---|
| `opacity` | 0.42 | 0.6 | key-shadow darkness |
| `offset` | `{x: .018·H, y: .058·H}` | `{x:0, y:.008·H}` | displacement of the phone centre's shadow, output px (H = projected phone height). It sets the light direction. A number means y only. |
| `blur` | .04·H | .006·H | Gaussian sigma (px) at the centre's height; scales with distance to the backdrop |
| `distance` | 0.2 × phone height (mm) | 1.2 mm | gap between the phone's farthest point and the backdrop |
| `ambientOpacity`, `ambientBlur` | 0.18, .07·H | 0.32, .03·H | contact / ambient-occlusion layer |
| `resolution` | 0.5 | 0.5 | mask resolution relative to the output |
| `color` | `#000000` | | shadow colour |

The shadow is black with alpha. For the most natural result on tinted backgrounds, composite the
separate `shadowPng` with `multiply`.

### Look

- **Metal:** `MeshPhysicalMaterial` with metalness 1 and roughness about 0.3 (the android's satin
  frame is rougher). Its colour is the specular F0 of the variant.
- **Environment:** three's RoomEnvironment layout through `PMREMGenerator`. The shell is darkened
  and its camera-side panel removed, so front-facing metal stays dark. Softboxes added: a large one
  overhead/behind, a strip above the camera, tall rim strips left and right, and a dim floor.
  RoomEnvironment is inlined in `look.js`, because the addon imports the bare specifier `three`,
  which would force every host page to carry an import map.
- **Lights:** key light top-left-front, rim light right-back, weak fill from below.
- **Glass:** the cover glass is glossy black, with a 2.5D rounded edge.
- **Holes:** the port, speaker and mic holes are cut into the frame with the stencil buffer
  (real walls and bevels, not decals).
- **Depth:** near/far planes are fitted tightly around the phone, and the layered decals (cut-out,
  lens) sit on a z offset plus polygon offset, so nothing z-fights.

## Live mode (films)

`browser/live.js` imports only three (by absolute URL `/node_modules/three/build/three.module.js`)
and files from this folder, so the host page needs **no import map**. It only needs to serve
`/phone3d/` and `/node_modules/` the way `startPhoneServer()` does.

```js
import { createLivePhones } from '/phone3d/browser/live.js';
const live = await createLivePhones({ canvas, width: 1080, height: 1920, dpr: 1, env: 'dark', aa: 'msaa' });
const p = live.add({ model: 'island', color: 'black-titanium' });
p.set({ cx: 540, cy: 960, height: 1500, rotation: { x: -8, y: -20, z: 4 }, fov: 26, visible: true });
p.setScreen(img);        // HTMLImageElement | HTMLCanvasElement | ImageBitmap | video; null = black glass; 'clear' = transparent display
live.render();           // synchronous, deterministic
p.screenQuad();          // [tl, tr, br, bl] display corners in canvas CSS px
p.screenCss(1320, 2868, bleed); // matrix3d for an HTML screen element (see below)
p.screenClip(1320, 2868, bleed); // matching clip-path
p.screenSpec();          // { aspect, cornerRadius, outline, clipPath, cutout:{pill|hole, lens} } as fractions of the display
```

- **Per-phone camera.** `cx, cy, height` are canvas CSS px: the phone centre and its on-screen
  height at zero rotation. `fov` means the same as in stills. Each phone has its own camera, with
  the sensor shifted so its centre lands on `(cx, cy)`. Rotation pivots on the phone centre.
- **Order and background.** Phones draw in `add()` order, later ones on top. The background is
  transparent and there is no shadow (the film draws its own).
- **Options.** `env: 'light' | 'dark' | config`: `dark` has brighter rims so black frames separate
  from dark backgrounds. `exposure`, `updateStyle` (default true: sets `canvas.style` size).
- **Anti-aliasing (`aa`).**
  - `'msaa'` (default): 4× multisampling on the canvas.
  - `'ss'`: the drawing buffer is `supersample` (default 1.5) × larger and the browser downscales
    the canvas. About as clean as MSAA and roughly 2× cheaper on SwiftShader.
  - `'fxaa'`: one post pass. Cheaper, but it softens text and wobbles on thin highlights.
  - `'none'`: shows stair-stepping.
- **Screen updates.** `p.updateScreen()` re-uploads a canvas you drew into. `live.setSize(w, h)`
  and `live.remove(p)` are also available.

### Mapping the film's HTML screen onto the phone

1. Corner order is **TL, TR, BR, BL** of the display *rect*, i.e. the screen content's
   `(0,0)`, `(w,0)`, `(w,h)`, `(0,h)`, in canvas CSS px. The display's rounded corners and
   cut-out lie inside that rect.
2. The transform is a 4-point homography expressed as CSS `matrix3d`. Place the element at the
   canvas's top-left, with `position:absolute; left:0; top:0; transform-origin:0 0`, in a
   container aligned with the canvas. Then set `transform = p.screenCss(w, h, bleed)` every frame
   after `live.render()`, where `w×h` is the element's content size (any size with the display's
   aspect, e.g. 1320×2868).
3. Recommended stacking: the HTML screen goes **under** the canvas, with the phone in
   `p.setScreen('clear')`.
   - The canvas then draws the black border, the pill/hole and the glass reflection on top, and
     leaves the display transparent.
   - Give the element `padding: <bleed>px` in the screen's edge colour, with bleed about 10 px.
     Set `clip-path: p.screenClip(w, h, bleed)` so the padding tucks under the black border: no
     anti-aliasing seam, nothing past the corners.
4. If the HTML must be **above** the canvas instead:
   - Use `p.setScreen(null)` (black glass) and `bleed = 0`.
   - Clip with `screenSpec().clipPath`, a percent polygon of the exact display outline.
   - Draw the cut-out yourself from `screenSpec().cutout`.

`live-test.html?overlay=1` demonstrates the recommended setup.

## Tests

```bash
node scripts/marketing/phone3d/test/make-test-screen.mjs out/test-screen.png
node scripts/marketing/phone3d/test/gallery.mjs out/gallery --size 1600x2000 --shadow drop
node scripts/marketing/phone3d/test/live-frames.mjs out/live
```

The test screen is `docs/store/screenshots/source/01-find-your-next-home-1.webp` (1320×2682), padded
with a 186-px `#010118` status bar (9:41, signal, wifi, battery). The script reads the file from
git HEAD if it is missing from the working tree.

## Performance (SwiftShader, 4 vCPU)

Measured with `test/bench.mjs` and `test/live-frames.mjs` on 2026-09-30. Other jobs were sharing
the machine (load average 5–6 on 4 cores), so an idle machine is faster.

| stills (2× supersample, 4× MSAA, drop shadow) | min | median | max |
|---|---|---|---|
| 1600×2000 (10 renders, 5 poses × 2 models) | 1.95 s | 2.57 s | 3.41 s |
| 2000×2500 (5 renders; 2 tiles) | 3.01 s | 3.33 s | 4.16 s |
| startup + shader/PMREM warm-up | | 7–15 s | |

A render splits into roughly 60 % GPU pass, 15 % lanczos3 resize and 15 % shadow + PNG encode.
The first render at a new output size pays a one-off buffer allocation.
Levers, in order of impact:

1. `createPhoneStudio({ msaa: false })`: about 2.5× faster GPU pass, slight aliasing on thin highlights
2. `supersample: 1.5`
3. `shadow: 'none'`

| live mode, 1080×1920 @ dpr 1, `render()` + GPU completion | one phone ~1500 px | two phones ~1100 px |
|---|---|---|
| `aa:'msaa'` (default) | 847 ms (min 541) | 682 ms (min 496) |
| `aa:'ss'`, 1.5× (browser downscale) | 383 ms (min 309) | 459 ms (min 439) |
| `aa:'fxaa'` | 473 ms (min 317) | 682 ms (min 425) |
| `aa:'none'` (jaggies) | 177 ms (min 160) | 251 ms (min 224) |

In every mode the `render()` call itself returns in about 2 ms; the GPU work completes
asynchronously. MSAA and 1.5× supersampling are both clean on moving silhouettes. FXAA softens
text and wobbles on thin highlights. Rendering is deterministic: the same state gives identical
pixels (checked by hashing the drawing buffer).

## Known limitations

- **Software rasterisation.** Seconds per still; live mode is not real-time on SwiftShader.
  Timings grow when the machine is shared.
- **Reflections are image-based only.** There is no ray-traced inter-reflection or ambient
  occlusion between parts. The phone does not reflect in its own screen.
- **Screen fitting.** The display is a flat plane. Images whose aspect differs from 1320×2868 are
  cover-cropped; top-anchored, so the status bar is kept.
- **Model detail.** The camera bump and the back are simple: the back is flat frosted glass, not
  modelled for hero shots of the rear. Button, antenna and hole positions are generic
  approximations.
- **Shadows.**
  - The shadow assumes a backdrop plane facing the camera. It is not a floor under a standing
    phone.
  - The penumbra is approximated with three height bands.
  - The shadow is clipped to the output frame.
- **The glass sheen is stylised.** It is procedural, not a reflection of the environment map.

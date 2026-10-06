// Live mode: draw the studio phones into a host page's own canvas, one synchronous,
// deterministic render per frame (for GSAP-driven films rendered frame by frame).
//
//   import { createLivePhones } from '/phone3d/browser/live.js';
//   const live = await createLivePhones({ canvas, width, height, dpr: 1, env: 'dark' });
//   const p = live.add({ model: 'island', color: 'black-titanium' });
//   p.set({ cx: 540, cy: 960, height: 1500, rotation: { x: 0, y: -20, z: 0 }, fov: 24 });
//   p.setScreen(img);            // or null (black glass) or 'clear' (transparent display)
//   live.render();
//   const [tl, tr, br, bl] = p.screenQuad(); // CSS px, for a matrix3d HTML overlay
//
// Imports only three (absolute URL, no import map needed) and this folder's modules.

import * as THREE from '/node_modules/three/build/three.module.js';
import { MODELS, COLORS, buildPhone } from './models.js';
import { buildEnvironment, createStudioLights, createScreenMaterials, ENV_PRESETS } from './look.js';
import { quadToCss } from './homography.js';

const DEG = Math.PI / 180;
const FIT = 0.85; // same framing reference as the stills: phone = 85% of the frame height

// FXAA 3.11-style pass on premultiplied RGBA; edges are detected on luma + coverage so dark
// frames against a transparent background are smoothed too.
const FXAA_SHADER = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    varying vec2 vUv;
    float lum(vec4 c) { return dot(c.rgb, vec3(0.299, 0.587, 0.114)) + 0.6 * c.a; }
    void main() {
      vec4 cM = texture2D(tDiffuse, vUv);
      vec4 cNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uTexel);
      vec4 cNE = texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * uTexel);
      vec4 cSW = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * uTexel);
      vec4 cSE = texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * uTexel);
      float lM = lum(cM), lNW = lum(cNW), lNE = lum(cNE), lSW = lum(cSW), lSE = lum(cSE);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.0312, lMax * 0.125)) { gl_FragColor = cM; return; }
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
      dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
      vec4 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)) + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)));
      vec4 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5) + texture2D(tDiffuse, vUv + dir * 0.5));
      float lB = lum(b);
      gl_FragColor = (lB < lMin || lB > lMax) ? a : b;
    }`,
};

class LivePhone {
  constructor(live, model, color) {
    if (!MODELS[model]) throw new Error(`live: unknown model '${model}'`);
    if (!COLORS[color]) throw new Error(`live: unknown color '${color}'`);
    this.live = live;
    this.materials = createScreenMaterials();
    this.entry = buildPhone(model, color, this.materials);
    this.group = this.entry.group;
    this.group.matrixAutoUpdate = false;
    this.group.visible = false;
    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
    this.state = { cx: live.width / 2, cy: live.height / 2, height: live.height * 0.7, rotation: { x: 0, y: 0, z: 0 }, fov: 24, focus: { x: 0, y: 0 }, visible: true, reflection: 0.12 };
    this.screenTexture = null;
    this.materials.setSheen(this.state.reflection, this.entry.info.display);
    this._dirty = true;
  }

  /** cx, cy, height in canvas CSS px (phone centre and on-screen height at zero rotation). */
  set(s = {}) {
    const st = this.state;
    for (const k of ['cx', 'cy', 'height', 'fov', 'visible', 'reflection']) if (s[k] !== undefined) st[k] = s[k];
    if (s.rotation) st.rotation = { ...st.rotation, ...s.rotation };
    if (s.focus) st.focus = { ...st.focus, ...s.focus };
    if (s.reflection !== undefined) this.materials.setSheen(st.reflection, this.entry.info.display);
    this._dirty = true;
    return this;
  }

  _update() {
    if (!this._dirty) return;
    const st = this.state;
    const info = this.entry.info;
    const Wc = this.live.width;
    const Hc = this.live.height;
    const aspect = Wc / Hc;
    const f = 1 / Math.tan((st.fov * DEG) / 2);
    // camera distance: the phone (height H) fills FIT of a frame with vertical fov `fov`
    const d = (f * info.height) / (2 * FIT);
    const R = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(st.rotation.x * DEG, st.rotation.y * DEG, st.rotation.z * DEG, 'ZXY'),
    );
    const M = R.multiply(new THREE.Matrix4().makeTranslation(-(st.focus.x || 0) * info.width, -(st.focus.y || 0) * info.height, 0));
    this.group.matrix.copy(M);
    this.group.matrixWorldNeedsUpdate = true;
    this.group.updateMatrixWorld(true);
    // phone extent around the pivot (the focus shift moves it off the rotation centre)
    const reach = info.radius + Math.hypot((st.focus.x || 0) * info.width, (st.focus.y || 0) * info.height);
    const near = Math.max(0.5, d - reach - 6);
    const far = d + reach + 6;
    const top = near / f;
    const P = new THREE.Matrix4().makePerspective(-top * aspect, top * aspect, top, -top, near, far);
    // NDC affine: scale the virtual frame to the requested on-screen height, then shift the
    // optical axis (phone centre) to (cx, cy) — a per-phone camera with a shifted sensor.
    const s = st.height / (FIT * Hc);
    const tx = (st.cx / Wc) * 2 - 1;
    const ty = 1 - (st.cy / Hc) * 2;
    const A = new THREE.Matrix4().set(s, 0, 0, tx, 0, s, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
    const cam = this.camera;
    cam.matrix.makeTranslation(0, 0, d);
    cam.matrixWorld.copy(cam.matrix);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    cam.position.set(0, 0, d);
    cam.near = near;
    cam.far = far;
    cam.projectionMatrix.multiplyMatrices(A, P);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    this._dirty = false;
  }

  /** Display corners [tl, tr, br, bl] in canvas CSS px ({x, y}), after projection. */
  screenQuad() {
    this._update();
    const d = this.entry.info.display;
    const pts = [[d.x0, d.y1], [d.x1, d.y1], [d.x1, d.y0], [d.x0, d.y0]];
    const v = new THREE.Vector3();
    return pts.map(([x, y]) => {
      v.set(x, y, d.z).applyMatrix4(this.group.matrixWorld).applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
      return { x: ((v.x + 1) / 2) * this.live.width, y: ((1 - v.y) / 2) * this.live.height };
    });
  }

  /**
   * CSS transform (matrix3d) that maps an HTML element whose content box is w×h CSS px —
   * placed at the canvas' top-left with `transform-origin: 0 0` — onto the projected display.
   * `bleed` (element px, default 0): the element has that much extra margin on every side
   * (padding in the screen's edge colour) that extends under the phone's black border; use
   * ~6-12 px with setScreen('clear') so the anti-aliased display edge shows no seam.
   */
  screenCss(w = 1320, h = 2868, bleed = 0) {
    return quadToCss(w, h, this.screenQuad(), bleed);
  }

  /**
   * CSS clip-path (px, for the same element as screenCss(w, h, bleed)) that trims the
   * element to the display's rounded outline grown outward by the bleed — the grown part
   * hides under the black border; nothing pokes out past the phone's corners.
   */
  screenClip(w = 1320, h = 2868, bleed = 0) {
    const info = this.entry.info;
    const d = info.display;
    const dw = d.x1 - d.x0;
    const dh = d.y1 - d.y0;
    const pxPerMm = w / dw;
    const grow = Math.min(bleed / pxPerMm, info.borderWidth * 0.8); // mm
    const ol = info.outline;
    const pts = [];
    for (let i = 0; i < ol.n; i++) {
      const u = info.displayInset - grow;
      const x = ol.x[i] - u * ol.nx[i];
      const y = ol.y[i] - u * ol.ny[i];
      const ex = bleed + ((x - d.x0) / dw) * w;
      const ey = bleed + ((d.y1 - y) / dh) * h;
      pts.push(`${ex.toFixed(2)}px ${ey.toFixed(2)}px`);
    }
    return `polygon(${pts.join(', ')})`;
  }

  /**
   * Display geometry as fractions of the display (x of width, y of height, origin top-left),
   * so an HTML screen can be clipped to match: corner radius, exact outline polygon and the
   * cut-out (pill + lens, or punch hole).
   */
  screenSpec() {
    const info = this.entry.info;
    const d = info.display;
    const dw = d.x1 - d.x0;
    const dh = d.y1 - d.y0;
    const nx = (x) => (x - d.x0) / dw;
    const ny = (y) => (d.y1 - y) / dh;
    const spec = MODELS[info.model];
    const out = {
      model: info.model,
      aspect: dw / dh,
      displayMm: { width: dw, height: dh },
      cornerRadius: (spec.corner.radius - spec.displayInset) / dw, // nominal, fraction of width
      cornerRadiusY: (spec.corner.radius - spec.displayInset) / dh,
      outline: info.displayOutline.map(([x, y]) => [nx(x), ny(y)]),
      cutout: null,
    };
    // exact display shape for an HTML screen: `clip-path: <clipPath>` (percent units)
    out.clipPath = `polygon(${out.outline.map(([x, y]) => `${(x * 100).toFixed(3)}% ${(y * 100).toFixed(3)}%`).join(', ')})`;
    const c = info.cutout;
    if (c.type === 'pill') {
      out.cutout = {
        type: 'pill',
        x: nx(c.cx - c.w / 2),
        y: ny(c.cy + c.h / 2),
        width: c.w / dw,
        height: c.h / dh,
        radius: c.h / 2 / dw,
        lens: { cx: nx(c.lensX), cy: ny(c.cy), diameter: c.lensD / dw },
      };
    } else {
      out.cutout = { type: 'hole', cx: nx(0), cy: ny(c.cy), diameter: c.d / dw };
    }
    return out;
  }

  /** null = black glass (reflections only), 'clear' = transparent display with reflections,
   *  or an HTMLImageElement / HTMLCanvasElement / ImageBitmap / HTMLVideoElement. */
  setScreen(src) {
    const m = this.materials;
    m.uniforms.uClear.value = src === 'clear' ? 1 : 0;
    if (src === null || src === undefined || src === 'clear') {
      m.screen.map = m.placeholder;
      m.screen.needsUpdate = true;
      this._releaseTexture();
      return this;
    }
    if (this.screenTexture && this.screenTexture.image === src) {
      this.screenTexture.needsUpdate = true; // same element: re-upload (animated canvas)
      return this;
    }
    this._releaseTexture();
    const tex = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.live.maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    // cover-fit into the display (top anchored), exact for 1320×2868 images
    const iw = src.naturalWidth || src.videoWidth || src.width;
    const ih = src.naturalHeight || src.videoHeight || src.height;
    const d = this.entry.info.display;
    const ad = (d.x1 - d.x0) / (d.y1 - d.y0);
    const ai = iw / ih;
    if (Math.abs(ai - ad) / ad > 0.002) {
      if (ai > ad) {
        tex.repeat.x = ad / ai;
        tex.offset.x = (1 - tex.repeat.x) / 2;
      } else {
        tex.repeat.y = ai / ad;
        tex.offset.y = 1 - tex.repeat.y;
      }
    }
    this.screenTexture = tex;
    m.screen.map = tex;
    m.screen.needsUpdate = true;
    return this;
  }

  /** Re-upload the current screen canvas/video after drawing into it. */
  updateScreen() {
    if (this.screenTexture) this.screenTexture.needsUpdate = true;
    return this;
  }

  _releaseTexture() {
    if (this.screenTexture) this.screenTexture.dispose();
    this.screenTexture = null;
  }

  dispose() {
    this._releaseTexture();
    this.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
  }
}

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {number} o.width   canvas CSS width
 * @param {number} o.height  canvas CSS height
 * @param {number} [o.dpr=1]
 * @param {'dark'|'light'|object} [o.env='light']
 * @param {'msaa'|'none'|'ss'|'fxaa'} [o.aa='msaa']  anti-aliasing mode
 * @param {number} [o.supersample=1.5]  drawing-buffer scale for aa 'ss' (browser downscales)
 * @param {boolean} [o.updateStyle=true] set canvas.style width/height
 */
export async function createLivePhones(o) {
  const { canvas, width, height } = o;
  const dpr = o.dpr ?? 1;
  const aa = o.aa || 'msaa';
  const ss = aa === 'ss' ? o.supersample ?? 1.5 : 1;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: aa === 'msaa',
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    stencil: true,
    powerPreference: 'high-performance',
  });
  const gl = renderer.getContext();
  if (!(gl instanceof WebGL2RenderingContext)) throw new Error('live: WebGL2 is required');
  renderer.setPixelRatio(dpr * ss);
  renderer.setSize(width, height, o.updateStyle !== false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const envRT = buildEnvironment(renderer, typeof o.env === 'object' ? o.env : ENV_PRESETS[o.env || 'light'] || ENV_PRESETS.light);
  scene.environment = envRT.texture;
  const lights = createStudioLights();
  scene.add(...lights.list);

  // FXAA: render into an sRGB 8-bit target (tone mapping + output encoding applied in the
  // materials, as for the canvas), then filter into the canvas.
  let fx = null;
  if (aa === 'fxaa') {
    const bw = Math.round(width * dpr);
    const bh = Math.round(height * dpr);
    const rt = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: true, stencilBuffer: true });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    rt.isXRRenderTarget = true; // three: apply tone mapping + sRGB output like the canvas
    const mat = new THREE.ShaderMaterial({ ...FXAA_SHADER, uniforms: THREE.UniformsUtils.clone(FXAA_SHADER.uniforms), depthTest: false, depthWrite: false, blending: THREE.NoBlending });
    mat.uniforms.tDiffuse.value = rt.texture;
    mat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const qs = new THREE.Scene();
    qs.add(quad);
    fx = { rt, qs, cam: new THREE.Camera() };
  }

  const live = {
    width,
    height,
    dpr,
    aa,
    renderer,
    scene,
    phones: [],
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    models: Object.keys(MODELS),
    colors: Object.keys(COLORS),

    add({ model = 'island', color } = {}) {
      const p = new LivePhone(live, model, color || (model === 'android' ? 'silver' : 'black-titanium'));
      scene.add(p.group);
      live.phones.push(p);
      return p;
    },

    remove(p) {
      scene.remove(p.group);
      p.dispose();
      live.phones = live.phones.filter((q) => q !== p);
    },

    /** Synchronous render of all visible phones (in add order; later phones on top). */
    render() {
      const target = fx ? fx.rt : null;
      renderer.setRenderTarget(target);
      renderer.clear(true, true, true);
      for (const p of live.phones) {
        if (!p.state.visible) continue;
        p._update();
        for (const q of live.phones) q.group.visible = q === p;
        renderer.clearDepth();
        renderer.clearStencil();
        renderer.render(scene, p.camera);
      }
      for (const q of live.phones) q.group.visible = false;
      if (fx) {
        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        renderer.render(fx.qs, fx.cam);
      }
    },

    /** Resize the canvas (CSS px). */
    setSize(w, h) {
      live.width = w;
      live.height = h;
      renderer.setSize(w, h, o.updateStyle !== false);
      if (fx) {
        fx.rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
        fx.qs.children[0].material.uniforms.uTexel.value.set(1 / Math.round(w * dpr), 1 / Math.round(h * dpr));
      }
      for (const p of live.phones) p._dirty = true;
    },

    dispose() {
      for (const p of live.phones) p.dispose();
      envRT.dispose();
      fx?.rt.dispose();
      renderer.dispose();
    },
  };
  // compile programs up front so the first film frame is not slow
  renderer.compile(scene, new THREE.PerspectiveCamera());
  return live;
}

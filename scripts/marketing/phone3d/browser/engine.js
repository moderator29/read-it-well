// Browser-side render engine for the phone studio (three.js r186, WebGL2 via SwiftShader).
// Loaded by index.html; exposes window.__phone3d = { ready, render(params), info() }.

import * as THREE from '/node_modules/three/build/three.module.js';
import { MODELS, COLORS, buildPhone } from './models.js';
import { DEFAULT_ENV, ENV_PRESETS, buildEnvironment, createStudioLights, createScreenMaterials } from './look.js';

const DEG = Math.PI / 180;
const MAX_TILE_DIM = 8192;
const MAX_TILE_AREA = 16.8e6;

// ---------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------

// Projects the phone onto a backdrop plane z = uPlaneZ along the light direction and
// writes, per pixel, the occlusion of the occluder closest to the plane split into three
// "height above backdrop" levels (R, G, B) — Node blurs each with a penumbra matching its
// height. uMode = 1 writes plain coverage (ambient occlusion pass).
function makeShadowMaskMaterial() {
  return new THREE.ShaderMaterial({
    name: 'shadow-mask',
    side: THREE.DoubleSide,
    uniforms: {
      uLight: { value: new THREE.Vector3(0, 0, 1) },
      uPlaneZ: { value: -50 },
      uHMin: { value: 0 },
      uHMax: { value: 1 },
      uMode: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform vec3 uLight;
      uniform float uPlaneZ;
      uniform float uHMin;
      uniform float uHMax;
      varying float vH;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float h = wp.z - uPlaneZ;
        vec3 p = wp.xyz - uLight * (h / uLight.z);
        vH = h;
        vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.0);
        float zn = clamp((h - uHMin) / max(uHMax - uHMin, 1e-3), 0.0, 1.0) * 1.98 - 0.99;
        clip.z = zn * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHMin;
      uniform float uHMax;
      uniform float uMode;
      varying float vH;
      void main() {
        if (uMode > 0.5) { gl_FragColor = vec4(1.0); return; }
        float t = clamp((vH - uHMin) / max(uHMax - uHMin, 1e-3), 0.0, 1.0) * 2.0;
        vec3 w = vec3(max(0.0, 1.0 - t), max(0.0, 1.0 - abs(t - 1.0)), max(0.0, t - 1.0));
        gl_FragColor = vec4(w, 1.0);
      }`,
  });
}

// ---------------------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------------------

// Silhouette points of the phone section between local y = yLo..yHi (for `show` framing).
function sectionPoints(info, yLo, yHi) {
  const pts = [];
  const h = info.hull;
  for (let i = 0; i < h.length; i += 3) {
    if (h[i + 1] >= yLo - 1e-6 && h[i + 1] <= yHi + 1e-6) pts.push([h[i], h[i + 1], h[i + 2]]);
  }
  const ol = info.outline;
  const zs = info.hullZ;
  for (const yc of [yLo, yHi]) {
    for (let i = 0; i < ol.n; i++) {
      const j = (i + 1) % ol.n;
      const a = ol.y[i] - yc;
      const b = ol.y[j] - yc;
      if (a * b > 0 || a === b) continue;
      const t = a / (a - b);
      const x = ol.x[i] + (ol.x[j] - ol.x[i]) * t;
      for (const z of zs) pts.push([x, yc, z]);
    }
  }
  return pts;
}

class Engine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;
    this.canvas.height = 64;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: new URLSearchParams(location.search).get('aa') !== '0',
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        stencil: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      throw new Error(`WebGL2 context could not be created: ${e.message}`);
    }
    const gl = renderer.getContext();
    if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) {
      throw new Error('WebGL2 is not available in this browser context');
    }
    this.gl = gl;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.glInfo = {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      samples: gl.getParameter(gl.SAMPLES),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    };
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.useEnvironment('light');
    this.scene.environmentIntensity = 1.0;

    this.lights = createStudioLights();
    this.key = this.lights.key;
    this.scene.add(...this.lights.list);

    this.camera = new THREE.PerspectiveCamera(22, 1, 1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.shared = createScreenMaterials();

    this.shadowMat = makeShadowMaskMaterial();
    this.phones = new Map();
    this.current = null;
    this.screens = new Map();
    this.screenOrder = [];
    this.shadowRT = null;
  }

  info() {
    return { gl: this.glInfo, models: Object.keys(MODELS), colors: Object.keys(COLORS) };
  }

  setEnvironment(cfg) {
    const rt = buildEnvironment(this.renderer, cfg);
    this.envRT?.dispose();
    this.envRT = rt;
    this.envCfg = cfg;
    this.envName = null;
    this.scene.environment = rt.texture;
  }

  /** Switch between the named presets ('light' | 'dark'); PMREMs are cached. */
  useEnvironment(name) {
    // a preset name, or a config object of the same shape as ENV_PRESETS' entries
    const key = typeof name === 'string' ? name : JSON.stringify(name);
    if (this.envName === key) return;
    this.envCache = this.envCache || {};
    if (!this.envCache[key]) this.envCache[key] = buildEnvironment(this.renderer, typeof name === 'string' ? ENV_PRESETS[name] || DEFAULT_ENV : name);
    this.scene.environment = this.envCache[key].texture;
    this.envName = key;
  }

  usePhone(model, color) {
    const key = `${model}|${color}`;
    let entry = this.phones.get(key);
    if (!entry) {
      entry = buildPhone(model, color, this.shared);
      this.phones.set(key, entry);
    }
    if (this.current !== entry) {
      if (this.current) this.scene.remove(this.current.group);
      this.scene.add(entry.group);
      this.current = entry;
    }
    return entry;
  }

  async useScreen(key, url) {
    let tex = this.screens.get(key);
    if (!tex) {
      const img = new Image();
      img.decoding = 'sync';
      img.src = url;
      await img.decode();
      tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.glInfo.maxAnisotropy;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      tex.userData.size = [img.naturalWidth, img.naturalHeight];
      this.screens.set(key, tex);
      this.screenOrder.push(key);
      while (this.screenOrder.length > 4) {
        const old = this.screenOrder.shift();
        this.screens.get(old)?.dispose();
        this.screens.delete(old);
      }
    }
    this.shared.screen.map = tex;
    return tex;
  }

  // Fit the screen image into the display rect ('cover' anchored to the top by default).
  applyScreenFit(tex, disp, fit) {
    const [iw, ih] = tex.userData.size;
    const ai = iw / ih;
    const ad = (disp.x1 - disp.x0) / (disp.y1 - disp.y0);
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    if (fit !== 'stretch' && Math.abs(ai - ad) / ad > 0.002) {
      if (ai > ad) {
        tex.repeat.x = ad / ai;
        tex.offset.x = (1 - tex.repeat.x) / 2;
      } else {
        tex.repeat.y = ai / ad;
        tex.offset.y = 1 - tex.repeat.y; // keep the top (status bar) visible
      }
    }
    tex.updateMatrix();
    return { repeat: [tex.repeat.x, tex.repeat.y], offset: [tex.offset.x, tex.offset.y] };
  }

  // -------------------------------------------------------------------------------------
  // Framing: camera distance from fov (perspective strength), then an NDC affine that
  // zooms/pans (equivalent to cropping a larger photo, perspective unchanged).
  // -------------------------------------------------------------------------------------
  frame(entry, p) {
    const { width: W, height: H } = p;
    const aspect = W / H;
    const f = 1 / Math.tan((p.fov * DEG) / 2);
    const R = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(p.rotation.x * DEG, p.rotation.y * DEG, p.rotation.z * DEG, 'ZXY'),
    );
    // `focus`: point of the phone (fractions of width/height from the centre, +y = up)
    // that the camera aims at. Aiming at the top/bottom changes the perspective like
    // moving the camera, not just the framing.
    const fx = (p.focus?.x ?? 0) * entry.info.width;
    const fy = (p.focus?.y ?? 0) * entry.info.height;
    const M = R.clone().multiply(new THREE.Matrix4().makeTranslation(-fx, -fy, 0));
    const e = M.elements;
    const hull = entry.info.hull;
    const n = hull.length / 3;
    const wx = new Float64Array(n);
    const wy = new Float64Array(n);
    const wz = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = hull[i * 3];
      const y = hull[i * 3 + 1];
      const z = hull[i * 3 + 2];
      wx[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      wy[i] = e[1] * x + e[5] * y + e[9] * z + e[13];
      wz[i] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    const bboxAt = (d) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < n; i++) {
        const w = d - wz[i];
        const nx = ((f / aspect) * wx[i]) / w;
        const ny = (f * wy[i]) / w;
        if (nx < x0) x0 = nx;
        if (nx > x1) x1 = nx;
        if (ny < y0) y0 = ny;
        if (ny > y1) y1 = ny;
      }
      return { x0, x1, y0, y1 };
    };
    const radius = entry.info.radius;
    const fitFill = 0.85;
    let maxZ = -Infinity;
    for (let i = 0; i < n; i++) maxZ = Math.max(maxZ, wz[i]);
    let lo = Math.max(radius * 1.05, maxZ + 2); // keep every hull point in front of the camera
    let hi = lo * 400;
    for (let it = 0; it < 60; it++) {
      const mid = Math.sqrt(lo * hi);
      const bb = bboxAt(mid);
      const size = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2;
      if (size > fitFill) lo = mid;
      else hi = mid;
    }
    const d = hi;
    const bb = bboxAt(d);
    let reg;
    let autoAlign = 'center';
    if (p.show) {
      // phone-space framing: the section between `from` and `to` (fractions of the phone
      // length measured from the top) is fitted; the cut edge goes to the frame edge.
      const Hh = entry.info.height;
      const yHi = Hh / 2 - (p.show.from ?? 0) * Hh;
      const yLo = Hh / 2 - (p.show.to ?? 1) * Hh;
      const pts = sectionPoints(entry.info, yLo, yHi);
      const proj = (q) => {
        const x = e[0] * q[0] + e[4] * q[1] + e[8] * q[2] + e[12];
        const y = e[1] * q[0] + e[5] * q[1] + e[9] * q[2] + e[13];
        const z = e[2] * q[0] + e[6] * q[1] + e[10] * q[2] + e[14];
        const w = d - z;
        return [((f / aspect) * x) / w, (f * y) / w];
      };
      reg = { x0: Infinity, x1: -Infinity, top: -Infinity, bot: Infinity };
      for (const q of pts) {
        const [nx, ny] = proj(q);
        reg.x0 = Math.min(reg.x0, nx);
        reg.x1 = Math.max(reg.x1, nx);
        reg.bot = Math.min(reg.bot, ny);
        reg.top = Math.max(reg.top, ny);
      }
      const mid = (reg.top + reg.bot) / 2;
      const cutLo = (p.show.to ?? 1) < 1 ? proj([0, yLo, 0])[1] : null;
      const cutHi = (p.show.from ?? 0) > 0 ? proj([0, yHi, 0])[1] : null;
      if (cutLo !== null && cutHi === null) autoAlign = cutLo < mid ? 'bottom' : 'top';
      if (cutHi !== null && cutLo === null) autoAlign = cutHi < mid ? 'bottom' : 'top';
    } else {
      const c = { x0: 0, y0: 0, x1: 1, y1: 1, ...(p.crop || {}) };
      reg = {
        x0: bb.x0 + c.x0 * (bb.x1 - bb.x0),
        x1: bb.x0 + c.x1 * (bb.x1 - bb.x0),
        top: bb.y1 - c.y0 * (bb.y1 - bb.y0),
        bot: bb.y1 - c.y1 * (bb.y1 - bb.y0),
      };
    }
    const s = p.fill * Math.min(2 / (reg.x1 - reg.x0), 2 / (reg.top - reg.bot));
    let tx = (-s * (reg.x0 + reg.x1)) / 2;
    let ty = (-s * (reg.top + reg.bot)) / 2;
    const al = p.align && p.align !== 'auto' ? p.align : autoAlign;
    if (al.includes('left')) tx = -1 - s * reg.x0;
    if (al.includes('right')) tx = 1 - s * reg.x1;
    if (al.includes('top')) ty = 1 - s * reg.top;
    if (al.includes('bottom')) ty = -1 - s * reg.bot;
    tx += (p.offset?.x ?? 0) * 2;
    ty -= (p.offset?.y ?? 0) * 2;

    // tight near/far around the phone (+ shadow plane handled separately)
    let zmin = Infinity;
    let zmax = -Infinity;
    for (let i = 0; i < n; i++) {
      if (wz[i] < zmin) zmin = wz[i];
      if (wz[i] > zmax) zmax = wz[i];
    }
    const near = Math.max(0.5, d - zmax - 3);
    const far = d - zmin + 3;
    const top = near / f;
    const P = new THREE.Matrix4().makePerspective(-top * aspect, top * aspect, top, -top, near, far);
    const A = new THREE.Matrix4().set(s, 0, 0, tx, 0, s, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
    const PA = new THREE.Matrix4().multiplyMatrices(A, P);
    return {
      R,
      M,
      d,
      f,
      s,
      tx,
      ty,
      aspect,
      near,
      far,
      P,
      PA,
      bbox: bb,
      zmin,
      zmax,
      phoneBBoxPx: {
        x: ((s * bb.x0 + tx + 1) / 2) * W,
        y: ((1 - (s * bb.y1 + ty)) / 2) * H,
        width: ((s * (bb.x1 - bb.x0)) / 2) * W,
        height: ((s * (bb.y1 - bb.y0)) / 2) * H,
      },
    };
  }

  setCamera(fr, tileM = null) {
    const cam = this.camera;
    cam.position.set(0, 0, fr.d);
    cam.quaternion.identity();
    cam.near = fr.near;
    cam.far = fr.far;
    cam.updateMatrixWorld(true);
    const M = tileM ? new THREE.Matrix4().multiplyMatrices(tileM, fr.PA) : fr.PA.clone();
    cam.projectionMatrix.copy(M);
    cam.projectionMatrixInverse.copy(M).invert();
  }

  projectPx(fr, W, H, local) {
    const v = new THREE.Vector3(...local).applyMatrix4(fr.M);
    v.z -= fr.d; // view space (camera at +d looking down -Z)
    const clip = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(fr.PA);
    const nx = clip.x / clip.w;
    const ny = clip.y / clip.w;
    return { x: ((nx + 1) / 2) * W, y: ((1 - ny) / 2) * H };
  }

  // -------------------------------------------------------------------------------------
  async render(p) {
    const t0 = performance.now();
    const timings = {};
    const entry = this.usePhone(p.model, p.color);
    const tex = await this.useScreen(p.screenKey, p.screenUrl);
    const fit = this.applyScreenFit(tex, entry.info.display, p.screenFit || 'cover');
    this.shared.setSheen(p.reflection, entry.info.display);
    this.renderer.toneMappingExposure = p.exposure;
    this.useEnvironment(p.env || 'light');
    this.scene.environmentIntensity = p.envIntensity ?? 1;
    this.key.intensity = 2.2 * (p.keyLight ?? 1);
    timings.setup = performance.now() - t0;

    const W = p.width;
    const H = p.height;
    const ss = p.ss;
    const fr = this.frame(entry, p);
    const group = entry.group;
    group.matrixAutoUpdate = false;
    group.matrix.copy(fr.M);
    group.matrixWorldNeedsUpdate = true;
    group.updateMatrixWorld(true);

    const meta = { token: p.token, uploads: [], camera: { distance: fr.d, fov: p.fov, zoom: fr.s } };

    // ---- screen corners (display rect) + image corners (for homographies) -------------
    const disp = entry.info.display;
    const z = disp.z;
    const corner = (x, y) => this.projectPx(fr, W, H, [x, y, z]);
    meta.screenCorners = {
      topLeft: corner(disp.x0, disp.y1),
      topRight: corner(disp.x1, disp.y1),
      bottomRight: corner(disp.x1, disp.y0),
      bottomLeft: corner(disp.x0, disp.y0),
    };
    // image corners: UV (0..1) -> display position via inverse cover transform
    const [iw, ih] = tex.userData.size;
    const uvToLocal = (u, v) => {
      const ud = (u - fit.offset[0]) / fit.repeat[0];
      const vd = (v - fit.offset[1]) / fit.repeat[1];
      return [disp.x0 + ud * (disp.x1 - disp.x0), disp.y0 + vd * (disp.y1 - disp.y0)];
    };
    meta.image = {
      width: iw,
      height: ih,
      corners: {
        topLeft: corner(...uvToLocal(0, 1)),
        topRight: corner(...uvToLocal(1, 1)),
        bottomRight: corner(...uvToLocal(1, 0)),
        bottomLeft: corner(...uvToLocal(0, 0)),
      },
    };
    meta.phoneBBoxProjected = fr.phoneBBoxPx;

    // ---- shadow masks ------------------------------------------------------------------
    if (p.shadow && p.shadow.type && p.shadow.type !== 'none') {
      const ts = performance.now();
      meta.shadow = await this.renderShadow(entry, fr, p);
      timings.shadow = performance.now() - ts;
    }

    // ---- main pass (tiled) ---------------------------------------------------------------
    const W2 = Math.round(W * ss);
    const H2 = Math.round(H * ss);
    let nx = 1;
    let ny = 1;
    const fits = (tw, th) => tw <= MAX_TILE_DIM && th <= MAX_TILE_DIM && tw * th <= MAX_TILE_AREA;
    while (!fits(Math.ceil(W2 / nx), Math.ceil(H2 / ny))) {
      if (Math.ceil(W2 / nx) >= Math.ceil(H2 / ny)) nx++;
      else ny++;
    }
    const tw = Math.ceil(W2 / nx);
    const th = Math.ceil(H2 / ny);
    this.renderer.setRenderTarget(null);
    if (this.canvas.width !== tw || this.canvas.height !== th) this.renderer.setSize(tw, th, false);
    this.renderer.setViewport(0, 0, tw, th);
    const tiles = [];
    const tm = performance.now();
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x0 = i * tw;
        const y0 = j * th; // from the top
        // NDC sub-rect of this tile (full image spans W2 x H2)
        const nx0 = (x0 / W2) * 2 - 1;
        const nx1 = ((x0 + tw) / W2) * 2 - 1;
        const nyTop = 1 - (y0 / H2) * 2;
        const nyBot = 1 - ((y0 + th) / H2) * 2;
        const sx = 2 / (nx1 - nx0);
        const sy = 2 / (nyTop - nyBot);
        const T = new THREE.Matrix4().set(
          sx, 0, 0, -sx * (nx0 + nx1) / 2,
          0, sy, 0, -sy * (nyTop + nyBot) / 2,
          0, 0, 1, 0,
          0, 0, 0, 1,
        );
        this.setCamera(fr, T);
        this.renderer.render(this.scene, this.camera);
        const buf = new Uint8Array(tw * th * 4);
        this.gl.readPixels(0, 0, tw, th, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buf);
        const name = `tile-${i}-${j}`;
        await upload(p.token, name, buf);
        tiles.push({ name, x: x0, y: y0, width: tw, height: th });
      }
    }
    timings.main = performance.now() - tm;
    this.setCamera(fr, null);
    meta.render = { width: W2, height: H2, tiles };
    timings.total = performance.now() - t0;
    meta.timings = timings;
    return meta;
  }

  async renderShadow(entry, fr, p) {
    const sh = p.shadow;
    const W = p.width;
    const H = p.height;
    const res = sh.resolution ?? 0.5;
    const sw = Math.max(16, Math.round(W * res));
    const shh = Math.max(16, Math.round(H * res));
    const phonePx = fr.phoneBBoxPx.height; // projected phone height in output px
    const contact = sh.type === 'contact';
    const gap = sh.distance ?? (contact ? 1.2 : 0.2 * entry.info.height);
    const planeZ = fr.zmin - gap;
    const hRef = Math.max(0.5, 0 - planeZ);
    const hMin = fr.zmin - planeZ;
    const hMax = fr.zmax - planeZ;
    const pxPerMm = ((H / 2) * fr.f * fr.s) / (fr.d - planeZ);
    const off = sh.offset ?? (contact ? { x: 0, y: 0.008 * phonePx } : { x: 0.018 * phonePx, y: 0.058 * phonePx });
    const offX = typeof off === 'number' ? 0 : off.x ?? 0;
    const offY = typeof off === 'number' ? off : off.y ?? 0;
    const l = new THREE.Vector3(-(offX / pxPerMm) / hRef, offY / pxPerMm / hRef, 1).normalize();
    const blur = sh.blur ?? (contact ? 0.006 * phonePx : 0.04 * phonePx);
    const levels = [hMin, (hMin + hMax) / 2, hMax];
    const sigmas = levels.map((h) => Math.max(0.6, (blur * h) / hRef));
    const ambient = {
      opacity: sh.ambientOpacity ?? (contact ? 0.32 : 0.18),
      sigma: sh.ambientBlur ?? (contact ? 0.03 * phonePx : 0.07 * phonePx),
    };

    if (!this.shadowRT || this.shadowRT.width !== sw || this.shadowRT.height !== shh) {
      this.shadowRT?.dispose();
      this.shadowRT = new THREE.WebGLRenderTarget(sw, shh, { depthBuffer: true, stencilBuffer: false });
    }
    const mat = this.shadowMat;
    mat.uniforms.uPlaneZ.value = planeZ;
    mat.uniforms.uHMin.value = hMin;
    mat.uniforms.uHMax.value = hMax;
    this.setCamera(fr, null);
    // camera far must include the plane for x/y clipping (z is overridden in the shader)
    const r = this.renderer;
    const prevClear = r.getClearAlpha();
    r.setRenderTarget(this.shadowRT);
    r.setClearColor(0x000000, 0);
    this.scene.overrideMaterial = mat;
    const bufs = {};
    for (const mode of [0, 1]) {
      mat.uniforms.uMode.value = mode;
      mat.uniforms.uLight.value.copy(mode === 0 ? l : new THREE.Vector3(0, 0, 1));
      r.clear(true, true, true);
      r.render(this.scene, this.camera);
      const buf = new Uint8Array(sw * shh * 4);
      r.readRenderTargetPixels(this.shadowRT, 0, 0, sw, shh, buf);
      bufs[mode] = buf;
    }
    this.scene.overrideMaterial = null;
    r.setRenderTarget(null);
    r.setClearColor(0x000000, prevClear);
    await upload(p.token, 'shadow-key', bufs[0]);
    await upload(p.token, 'shadow-ambient', bufs[1]);
    return {
      width: sw,
      height: shh,
      scale: res,
      sigmas, // output-px sigmas for the R, G, B height levels
      opacity: sh.opacity ?? (contact ? 0.6 : 0.42),
      ambient,
      color: sh.color ?? '#000000',
      light: [l.x, l.y, l.z],
      plane: { z: planeZ, gap, hMin, hMax, hRef, pxPerMm },
    };
  }
}

async function upload(token, name, data) {
  const res = await fetch(`/upload/${token}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: new Blob([data]), // a Blob body is ~15x faster than a raw typed array in Chromium
  });
  if (!res.ok) throw new Error(`upload of ${name} failed: ${res.status}`);
}

// ---------------------------------------------------------------------------------------

let engine = null;
const ready = (async () => {
  engine = new Engine();
  // warm-up: build both models and compile programs
  for (const m of Object.keys(MODELS)) engine.usePhone(m, m === 'android' ? 'silver' : 'black-titanium');
  engine.renderer.compile(engine.scene, engine.camera);
  return engine.info();
})();

window.__phone3d = {
  ready,
  debug: () => engine,
  info: () => engine.info(),
  render: async (params) => {
    await ready;
    return engine.render(params);
  },
};

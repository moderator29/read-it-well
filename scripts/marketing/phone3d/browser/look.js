// Shared "look" of the phone studio: environment (PMREM), lights, screen / cut-out / lens
// materials with the glass sheen. Used by the stills engine (engine.js) and the live mode
// (live.js), so both render identically.
//
// three is imported by absolute URL so pages need no import map.

import * as THREE from '/node_modules/three/build/three.module.js';

// ---------------------------------------------------------------------------------------
// RoomEnvironment: same layout as three/examples/jsm/environments/RoomEnvironment.js
// (MIT, three.js authors; originally from model-viewer), inlined here because the addon
// imports the bare specifier 'three', which would force every host page to carry an import
// map. Knobs: shell albedo, light scaling, and dropping the camera-side panel.
// ---------------------------------------------------------------------------------------

function createRoomEnvironment(room) {
  const scene = new THREE.Scene();
  scene.position.y = -3.5;
  const geometry = new THREE.BoxGeometry();
  geometry.deleteAttribute('uv');
  const roomMaterial = new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: new THREE.Color().setScalar(room.wall) });
  const boxMaterial = new THREE.MeshStandardMaterial();

  const mainLight = new THREE.PointLight(0xffffff, 900 * room.pointScale, 28, 2);
  mainLight.position.set(0.418, 16.199, 0.3);
  scene.add(mainLight);

  const shell = new THREE.Mesh(geometry, roomMaterial);
  shell.position.set(-0.757, 13.219, 0.717);
  shell.scale.set(31.713, 28.305, 28.591);
  scene.add(shell);

  const boxes = [
    [[-10.906, 2.009, 1.846], -0.195, [2.328, 7.905, 4.651]],
    [[-5.607, -0.754, -0.758], 0.994, [1.97, 1.534, 3.955]],
    [[6.167, 0.857, 7.803], 0.561, [3.927, 6.285, 3.687]],
    [[-2.017, 0.018, 6.124], 0.333, [2.002, 4.566, 2.064]],
    [[2.291, -0.756, -2.621], -0.286, [1.546, 1.552, 1.496]],
    [[-2.193, -0.369, -5.547], 0.516, [3.875, 3.487, 2.986]],
  ];
  for (const [pos, ry, scale] of boxes) {
    const b = new THREE.Mesh(geometry, boxMaterial);
    b.position.set(...pos);
    b.rotation.set(0, ry, 0);
    b.scale.set(...scale);
    scene.add(b);
  }

  const area = (intensity) =>
    new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity * room.lightScale });
  const lights = [
    [[-16.116, 14.37, 8.208], [0.1, 2.428, 2.739], 50], // -x right
    [[-16.109, 18.021, -8.207], [0.1, 2.425, 2.751], 50], // -x left
    [[14.904, 12.198, -1.832], [0.15, 4.265, 6.331], 17], // +x
    [[-0.462, 8.89, 14.52], [4.38, 5.441, 0.088], 43, 'front'], // +z (camera side)
    [[3.235, 11.486, -12.541], [2.5, 2.0, 0.1], 20], // -z
    [[0.0, 20.0, 0.0], [1.0, 0.1, 1.0], 100], // +y
  ];
  for (const [pos, scale, intensity, tag] of lights) {
    if (tag === 'front' && room.dropFront) continue;
    const l = new THREE.Mesh(geometry, area(intensity));
    l.position.set(...pos);
    l.scale.set(...scale);
    scene.add(l);
  }
  return scene;
}

// World directions as seen from the phone: the camera sits on +Z, +Y is up.
export const ENV_PRESETS = {
  // studio for light backdrops (default for stills)
  light: {
    blur: 0.03,
    room: { wall: 0.16, lightScale: 0.3, pointScale: 0.5, dropFront: true },
    panels: [
      { name: 'topBig', pos: [0, 12, -5], size: [30, 20], intensity: 3.2 }, // overhead + behind
      { name: 'topFront', pos: [-2, 10, 6], size: [20, 3], intensity: 5 }, // strip above camera
      { name: 'rimL', pos: [-12, 2, -4], size: [3, 24], intensity: 8 },
      { name: 'rimR', pos: [12, 2, -2], size: [3, 24], intensity: 6 },
      { name: 'floor', pos: [0, -10, 2], size: [30, 24], intensity: 0.45 },
    ],
  },
  // for dark backdrops: brighter rims so a dark frame still separates from the background
  dark: {
    blur: 0.03,
    room: { wall: 0.12, lightScale: 0.3, pointScale: 0.45, dropFront: true },
    panels: [
      { name: 'topBig', pos: [0, 12, -5], size: [30, 20], intensity: 3.6 },
      { name: 'topFront', pos: [-2, 10, 6], size: [20, 3], intensity: 5.5 },
      { name: 'rimL', pos: [-12, 2, -4], size: [3.4, 24], intensity: 12 },
      { name: 'rimR', pos: [12, 2, -2], size: [3.4, 24], intensity: 10 },
      { name: 'floor', pos: [0, -10, 2], size: [30, 24], intensity: 0.5 },
    ],
  },
  // for near-black grounds (the store images' night ground): the dark studio plus a ring of
  // light around the phone, a little in front of it and a little behind, so the rounded front
  // edge of a black frame catches one continuous highlight on all four sides, the bottom
  // included. The flat front of the band and the cover glass reflect only what is behind the
  // camera, which stays dark, so the frame reads as a thin bright line, not a lit band.
  night: {
    blur: 0.03,
    room: { wall: 0.12, lightScale: 0.3, pointScale: 0.45, dropFront: true },
    panels: [
      { name: 'topBig', pos: [0, 12, -5], size: [30, 20], intensity: 3.6 },
      { name: 'topFront', pos: [-2, 10, 6], size: [20, 3], intensity: 5.5 },
      { name: 'rimL', pos: [-12, 2, -4], size: [3.4, 24], intensity: 12 },
      { name: 'rimR', pos: [12, 2, -2], size: [3.4, 24], intensity: 10 },
      { name: 'floor', pos: [0, -10, 2], size: [30, 24], intensity: 0.5 },
    ],
    // arcs of an open cylinder around the view axis: `from`/`to` in degrees, 0 = below the
    // phone, 90 = its right, 180 = above, 270 = its left; z0..z1 along the axis (+z = camera)
    // (radius 3: inside the room's floor at y -4.4 and nearer than its boxes, so nothing
    // occludes the ring)
    // (32 to 108 degrees off the view axis; on the island's 0.62 mm front edge that is a
    // highlight about 4 px wide at luminance 180 or more on a phone 1100 px wide)
    arcs: [
      { name: 'ringBottom', radius: 3, z0: -0.975, z1: 4.8, from: -50, to: 50, intensity: 7 },
      { name: 'ringRight', radius: 3, z0: -0.975, z1: 4.8, from: 40, to: 140, intensity: 7 },
      { name: 'ringTop', radius: 3, z0: -0.975, z1: 4.8, from: 130, to: 230, intensity: 7.5 },
      { name: 'ringLeft', radius: 3, z0: -0.975, z1: 4.8, from: 220, to: 320, intensity: 7.5 },
    ],
  },
};
export const DEFAULT_ENV = ENV_PRESETS.light;

/** PMREM render target for an environment config (or preset name). */
export function buildEnvironment(renderer, cfg = DEFAULT_ENV) {
  if (typeof cfg === 'string') cfg = ENV_PRESETS[cfg] || DEFAULT_ENV;
  const room = { ...DEFAULT_ENV.room, ...(cfg.room || {}) };
  const root = new THREE.Scene();
  root.add(createRoomEnvironment(room));
  const plane = new THREE.PlaneGeometry(1, 1);
  for (const p of cfg.panels || []) {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1).multiplyScalar(p.intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.set(...p.pos);
    mesh.scale.set(p.size[0], p.size[1], 1);
    mesh.lookAt(0, 0, 0);
    root.add(mesh);
  }
  for (const a of cfg.arcs || []) {
    const len = Math.abs(a.z1 - a.z0);
    const t0 = (a.from * Math.PI) / 180;
    const tl = ((a.to - a.from) * Math.PI) / 180;
    const geo = new THREE.CylinderGeometry(a.radius, a.radius, len, a.segments || 48, 1, true, t0, tl);
    geo.rotateX(Math.PI / 2); // cylinder axis along the view axis (theta 0 lands below the phone)
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1).multiplyScalar(a.intensity),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(0, 0, (a.z0 + a.z1) / 2);
    root.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(root, cfg.blur ?? 0.03);
  pmrem.dispose();
  root.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return rt;
}

/** Key / rim / fill directional lights (camera on +Z). */
export function createStudioLights() {
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3.2, 4.2, 4.5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(4.5, 2.2, -2.5);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(0.5, -3, 4);
  return { key, rim, fill, list: [key, rim, fill] };
}

// ---------------------------------------------------------------------------------------
// Screen-side materials
// ---------------------------------------------------------------------------------------

export function makeLensTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.beginPath();
  g.arc(128, 128, 127.5, 0, Math.PI * 2);
  g.fill();
  const gr = g.createRadialGradient(116, 112, 3, 128, 128, 70);
  gr.addColorStop(0, '#2b3561');
  gr.addColorStop(0.3, '#141c3a');
  gr.addColorStop(0.75, '#060812');
  gr.addColorStop(1, '#010102');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(128, 128, 70, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(78, 88, 120, 0.33)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(128, 128, 72, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(170, 180, 230, 0.30)';
  g.beginPath();
  g.arc(108, 102, 8, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let lensTexture = null;

// Subtle glass sheen, folded into the (unlit) display, cut-out and lens materials so it
// costs no extra pass: Schlick fresnel against a soft procedural studio sky plus a faint
// diagonal streak, blended towards white in output (sRGB) space with a small weight.
// It only ever lifts the UI slightly, never re-colours it; strength 0 leaves the screen
// pixels untouched. In 'clear' mode the display writes alpha = sheen only (see live.js).
function addSheen(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSheen = uniforms.uSheen;
    shader.uniforms.uSheenRect = uniforms.uSheenRect;
    shader.uniforms.uClear = uniforms.uClear;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec4 uSheenRect;
        varying vec3 vSheenWPos;
        varying vec3 vSheenN;
        varying vec2 vSheenUv;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vSheenWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vSheenN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
        vSheenUv = (position.xy - uSheenRect.xy) / (uSheenRect.zw - uSheenRect.xy);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSheen;
        uniform float uClear;
        varying vec3 vSheenWPos;
        varying vec3 vSheenN;
        varying vec2 vSheenUv;`,
      )
      .replace(
        '#include <colorspace_fragment>',
        `#include <colorspace_fragment>
        float sheenA = 0.0;
        if (uSheen > 0.0) {
          vec3 sV = normalize(cameraPosition - vSheenWPos);
          vec3 sN = normalize(vSheenN);
          float ndv = clamp(dot(sN, sV), 0.0, 1.0);
          float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
          vec3 sR = reflect(-sV, sN);
          float sky = smoothstep(-0.25, 0.85, sR.y);
          float d = vSheenUv.x * 0.85 + (1.0 - vSheenUv.y) * 0.55 - 0.38 + sR.x * 0.25;
          float streak = exp(-d * d / (2.0 * 0.12 * 0.12));
          float wide = smoothstep(0.9, -0.2, vSheenUv.x * 0.6 + (1.0 - vSheenUv.y) * 0.8);
          sheenA = clamp(uSheen * (0.2 * streak + 0.1 * wide + 1.6 * fres * (0.3 + 0.7 * sky)), 0.0, 0.6);
        }
        if (uClear > 0.5) {
          // transparent display: only the reflection is drawn (premultiplied white)
          gl_FragColor = vec4(vec3(sheenA), sheenA);
        } else {
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), sheenA);
        }`,
      );
  };
  material.customProgramCacheKey = () => 'phone3d-sheen';
  return material;
}

/**
 * Display, cut-out and lens materials sharing one set of sheen uniforms.
 * set.setSheen(strength, displayRect) must be called with the phone's display rect.
 */
export function createScreenMaterials() {
  const uniforms = {
    uSheen: { value: 0.12 },
    uSheenRect: { value: new THREE.Vector4(-1, -1, 1, 1) },
    uClear: { value: 0 },
  };
  const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  placeholder.colorSpace = THREE.SRGBColorSpace;
  placeholder.needsUpdate = true;
  lensTexture = lensTexture || makeLensTexture();
  const screen = addSheen(new THREE.MeshBasicMaterial({ map: placeholder, toneMapped: false }), uniforms);
  // the cut-out and lens never use 'clear' mode: they are opaque parts of the glass
  const opaqueUniforms = { ...uniforms, uClear: { value: 0 } };
  const cutout = addSheen(new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), opaqueUniforms);
  const lens = addSheen(
    new THREE.MeshBasicMaterial({ map: lensTexture, transparent: true, toneMapped: false }),
    opaqueUniforms,
  );
  for (const [m, f, u] of [[cutout, -1, -1], [lens, -2, -2]]) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = f;
    m.polygonOffsetUnits = u;
  }
  return {
    screen,
    cutout,
    lens,
    placeholder,
    uniforms,
    setSheen(strength, rect) {
      uniforms.uSheen.value = strength;
      if (rect) uniforms.uSheenRect.value.set(rect.x0, rect.y0, rect.x1, rect.y1);
    },
  };
}

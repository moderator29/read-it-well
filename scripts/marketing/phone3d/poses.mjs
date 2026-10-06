// Pose presets: phone rotation (degrees) + default field of view, and for the close-up
// compositions also the camera aim (`focus`) and phone-space framing (`show`, `fill`).
//
// Rotation convention (Euler order 'ZXY', applied yaw -> pitch -> roll):
//   y (yaw)   > 0 turns the phone's LEFT edge towards the camera (screen faces right)
//   x (pitch) > 0 tips the top towards the camera (camera looks down on it),
//             < 0 leans the top away (camera looks up at it / sees the bottom edge)
//   z (roll)  > 0 rotates counter-clockwise in the image
// Wider fov = stronger perspective (the camera moves closer so the phone still fits).
// Every value can be overridden per render (rotation, fov, focus, show, fill, ...).

export const POSES = {
  // straight on, gentle telephoto perspective (IMG_6734 / IMG_6730)
  front: { rotation: { x: 0, y: 0, z: 0 }, fov: 22 },
  // left edge + buttons visible, screen turned to the right (left phone of a pair)
  'three-quarter-left': { rotation: { x: 4, y: 30, z: 0 }, fov: 24 },
  // right edge + buttons visible, screen turned to the left (right phone of a pair)
  'three-quarter-right': { rotation: { x: 4, y: -30, z: 0 }, fov: 24 },
  // camera below looking up, phone leaning away, right edge visible (IMG_6738 / 6.jpg)
  'hero-low': { rotation: { x: -24, y: -22, z: 2 }, fov: 34 },
  // strong perspective from above: bottom edge (port, speaker holes) and right edge
  // towards the camera, screen receding (IMG_6731 / IMG_6737)
  'top-down-steep': { rotation: { x: -45, y: -27, z: 6 }, fov: 38 },
  // reclined like on a stand, slight turn to show the left edge
  'lean-back': { rotation: { x: -32, y: 9, z: 0 }, fov: 26 },
  // floating, tilted and turned, left edge visible (IMG_6739, left phone)
  'flat-tilt': { rotation: { x: -12, y: 32, z: 19 }, fov: 26 },

  // --- extras ---------------------------------------------------------------------------
  // mirror of flat-tilt (IMG_6739, right phone)
  'flat-tilt-right': { rotation: { x: -18, y: -30, z: -8 }, fov: 28 },
  // camera slightly above aiming at the top, top edge of the frame visible
  'hero-high': { rotation: { x: 18, y: 0, z: 0 }, fov: 34, focus: { y: 0.25 } },

  // --- close-up compositions (framed like the reference shots) -------------------------
  // top ~60% of the phone, top edge towards the camera, wide lens (IMG_6732 / 9.jpg)
  'closeup-top': {
    rotation: { x: 32, y: 0, z: 0 },
    fov: 62,
    focus: { y: 0.4 },
    show: { from: 0, to: 0.66 },
    fill: 0.94,
  },
  // bottom ~58% of the phone seen from above, port side visible (IMG_6731 / IMG_6737)
  'closeup-bottom': {
    rotation: { x: -45, y: -27, z: 6 },
    fov: 38,
    focus: { y: -0.3 },
    show: { from: 0.42, to: 1 },
    fill: 0.86,
  },
  // top ~78% of a hero-low shot, bleeding off the bottom edge (IMG_6738 / 6.jpg)
  'hero-top': {
    rotation: { x: -24, y: -22, z: 2 },
    fov: 34,
    show: { from: 0, to: 0.78 },
    fill: 0.86,
  },
};

export const POSE_NAMES = Object.keys(POSES);
export const REQUIRED_POSES = [
  'front',
  'three-quarter-left',
  'three-quarter-right',
  'hero-low',
  'top-down-steep',
  'lean-back',
  'flat-tilt',
];

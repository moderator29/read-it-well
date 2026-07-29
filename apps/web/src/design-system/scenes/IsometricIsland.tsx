import { palette } from "@naijafinds/design-tokens";

/**
 * The NaijaFinds hero object: a lit island city on an isometric plate.
 *
 * Authored as vector geometry rather than shipped as a bitmap. That keeps it
 * perfectly sharp on every density, lets the palette follow the design tokens,
 * costs a few KB instead of a megabyte, and means it never needs re-exporting
 * when the brand colours move.
 *
 * Everything is deterministic. There is no randomness anywhere in this file, so
 * the server and client render byte identical markup and React never warns
 * about a hydration mismatch.
 */

/* Isometric projection. x runs down-right, y runs down-left, z runs up. */
const TILE_W = 26;
const TILE_H = 13;
const UNIT_Z = 15;
const ORIGIN_X = 400;
const ORIGIN_Y = 210;

type Pt = { x: number; y: number };

function project(gx: number, gy: number, gz = 0): Pt {
  return {
    x: ORIGIN_X + (gx - gy) * TILE_W,
    y: ORIGIN_Y + (gx + gy) * TILE_H - gz * UNIT_Z,
  };
}

const poly = (pts: Pt[]) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

/* ------------------------------------------------------------------ pieces */

type BoxSpec = {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  /** Window grid columns per face. 0 disables windows. */
  cols?: number;
  rows?: number;
  /** Warm interior light versus cool glass. */
  warm?: boolean;
  roof?: string;
};

/**
 * One building. Draws the three faces a viewer can actually see, shaded so the
 * light reads as coming from the upper left, plus a lit window grid.
 */
function Building({ x, y, w, d, h, cols = 3, rows = 5, warm = false, roof }: BoxSpec) {
  const top = poly([
    project(x, y, h),
    project(x + w, y, h),
    project(x + w, y + d, h),
    project(x, y + d, h),
  ]);
  const east = poly([
    project(x + w, y, h),
    project(x + w, y + d, h),
    project(x + w, y + d, 0),
    project(x + w, y, 0),
  ]);
  const south = poly([
    project(x, y + d, h),
    project(x + w, y + d, h),
    project(x + w, y + d, 0),
    project(x, y + d, 0),
  ]);

  const lit = warm ? "#FFC978" : "#7DE7F5";
  const litAlt = warm ? "#FF9F5A" : "#7FB6FF";

  const windows: React.ReactElement[] = [];
  if (cols > 0 && rows > 0) {
    const padU = 0.18;
    const stepZ = (h - 0.5) / rows;
    const winZ = stepZ * 0.52;

    // East face windows
    const stepE = (d - padU * 2) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = (r * 7 + c * 3 + x + y) % 4 !== 0;
        const yy = y + padU + c * stepE;
        const zz = 0.55 + r * stepZ;
        windows.push(
          <polygon
            key={`e${r}-${c}`}
            points={poly([
              project(x + w, yy, zz + winZ),
              project(x + w, yy + stepE * 0.6, zz + winZ),
              project(x + w, yy + stepE * 0.6, zz),
              project(x + w, yy, zz),
            ])}
            fill={on ? lit : "#151029"}
            opacity={on ? 0.9 : 0.75}
          />,
        );
      }
    }

    // South face windows
    const stepS = (w - padU * 2) / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = (r * 5 + c * 11 + x * 2 + y) % 5 !== 0;
        const xx = x + padU + c * stepS;
        const zz = 0.55 + r * stepZ;
        windows.push(
          <polygon
            key={`s${r}-${c}`}
            points={poly([
              project(xx, y + d, zz + winZ),
              project(xx + stepS * 0.6, y + d, zz + winZ),
              project(xx + stepS * 0.6, y + d, zz),
              project(xx, y + d, zz),
            ])}
            fill={on ? litAlt : "#151029"}
            opacity={on ? 0.72 : 0.7}
          />,
        );
      }
    }
  }

  return (
    <g>
      <polygon points={south} fill="#171232" />
      <polygon points={east} fill="#241C46" />
      <polygon points={top} fill={roof ?? "#3A2E6B"} />
      <polygon points={top} fill="url(#nf-iso-roofsheen)" opacity="0.5" />
      {windows}
    </g>
  );
}

/** A low residential block with a coloured roof, for scale contrast. */
function House({ x, y, roof }: { x: number; y: number; roof: string }) {
  return <Building x={x} y={y} w={0.9} d={0.9} h={1.1} cols={1} rows={1} warm roof={roof} />;
}

/** Palm tree. Trunk plus four fronds, drawn in projected space. */
function Palm({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const base = project(x, y, 0);
  const topPt = project(x, y, 1.5 * scale);
  const frond = (dx: number, dy: number) =>
    `M${topPt.x},${topPt.y} q${dx * 0.55},${dy * 0.4 - 8 * scale} ${dx},${dy}`;
  return (
    <g>
      <line
        x1={base.x}
        y1={base.y}
        x2={topPt.x}
        y2={topPt.y}
        stroke="#4A3A2A"
        strokeWidth={2.4 * scale}
        strokeLinecap="round"
      />
      <g stroke="#2FB68A" strokeWidth={2.2 * scale} fill="none" strokeLinecap="round">
        <path d={frond(-13 * scale, 5 * scale)} />
        <path d={frond(13 * scale, 5 * scale)} />
        <path d={frond(-8 * scale, -4 * scale)} />
        <path d={frond(9 * scale, -3 * scale)} />
      </g>
      <circle cx={topPt.x} cy={topPt.y} r={2 * scale} fill="#34D399" />
    </g>
  );
}

/* ------------------------------------------------------------------ scene */

/** Skyline layout. Ordered back to front so painter's algorithm depth works. */
const SKYLINE: BoxSpec[] = [
  { x: 0.2, y: 2.4, w: 1.0, d: 1.0, h: 4.2, cols: 2, rows: 6, roof: "#4C3B8F" },
  { x: 1.4, y: 2.6, w: 1.1, d: 1.1, h: 7.4, cols: 3, rows: 9, roof: "#5B46A8" },
  { x: 0.3, y: 1.1, w: 1.0, d: 1.0, h: 5.6, cols: 2, rows: 7, roof: "#43348A" },
  { x: 2.7, y: 2.5, w: 1.0, d: 1.0, h: 3.4, cols: 2, rows: 4, warm: true, roof: "#6B4FB8" },
  { x: 1.6, y: 1.2, w: 1.2, d: 1.2, h: 9.6, cols: 3, rows: 11, roof: "#6D4FD1" },
  { x: 3.0, y: 1.2, w: 1.0, d: 1.1, h: 5.0, cols: 2, rows: 6, roof: "#4C3B8F" },
  { x: 0.4, y: -0.2, w: 1.1, d: 1.0, h: 6.6, cols: 3, rows: 8, roof: "#54409C" },
  { x: 1.8, y: -0.3, w: 1.1, d: 1.1, h: 4.4, cols: 2, rows: 5, warm: true, roof: "#7C5CD6" },
  { x: 3.1, y: -0.2, w: 1.0, d: 1.0, h: 7.8, cols: 2, rows: 9, roof: "#5B46A8" },
  { x: 2.6, y: 3.8, w: 1.0, d: 1.0, h: 2.6, cols: 2, rows: 3, warm: true, roof: "#338AFF" },
];

const HOUSES = [
  { x: -1.2, y: 3.4, roof: "#F97316" },
  { x: -1.2, y: 2.2, roof: "#0066FF" },
  { x: -1.3, y: 1.0, roof: "#22D3EE" },
  { x: 4.4, y: 2.0, roof: "#FBBF24" },
  { x: 4.4, y: 3.2, roof: "#34D399" },
];

const PALMS = [
  { x: -2.1, y: 2.6, scale: 1 },
  { x: -2.2, y: 1.2, scale: 0.85 },
  { x: 5.3, y: 1.4, scale: 0.95 },
  { x: 5.2, y: 2.8, scale: 1.05 },
  { x: -1.9, y: 4.2, scale: 0.8 },
  { x: 4.9, y: 4.4, scale: 0.9 },
];

export function IsometricIsland({ className }: { className?: string }) {
  /* Island plate corners, generous margin around the built area. */
  const PLATE = { x0: -3.2, y0: -1.6, x1: 6.4, y1: 5.6 };
  const plateTop = poly([
    project(PLATE.x0, PLATE.y0),
    project(PLATE.x1, PLATE.y0),
    project(PLATE.x1, PLATE.y1),
    project(PLATE.x0, PLATE.y1),
  ]);

  const depth = 34;
  const pE0 = project(PLATE.x1, PLATE.y0);
  const pE1 = project(PLATE.x1, PLATE.y1);
  const pS1 = project(PLATE.x0, PLATE.y1);

  /* Under-plate: tapers to a point so the island reads as floating rock. */
  const keel = project((PLATE.x0 + PLATE.x1) / 2, (PLATE.y0 + PLATE.y1) / 2);

  return (
    <svg
      /*
       * Cropped tight to the geometry. The scene is authored on an 800 wide
       * grid but only spans roughly x 165 to 615, so framing to the content
       * makes the island fill its container instead of floating in dead space.
       */
      viewBox="158 -16 484 606"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="An illustrated island city of lit towers, houses and palm trees floating above water"
    >
      <defs>
        <linearGradient id="nf-iso-roofsheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="nf-iso-plate" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#2B6EA8" />
          <stop offset="45%" stopColor="#1E4E7E" />
          <stop offset="100%" stopColor="#14335A" />
        </linearGradient>

        <linearGradient id="nf-iso-keel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#332B5E" />
          <stop offset="55%" stopColor="#1A1535" />
          <stop offset="100%" stopColor={palette.ink950} stopOpacity="0" />
        </linearGradient>

        <radialGradient id="nf-iso-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#338AFF" stopOpacity="0.55" />
          <stop offset="55%" stopColor={palette.cyan500} stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="nf-iso-pool" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#7DE7F5" />
          <stop offset="100%" stopColor="#22A5C4" />
        </radialGradient>

        <linearGradient id="nf-iso-road" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D5C86" />
          <stop offset="100%" stopColor="#27405F" />
        </linearGradient>
      </defs>

      {/* Ambient halo. Sells the float and ties the object to the page glow. */}
      <ellipse cx="400" cy="330" rx="360" ry="250" fill="url(#nf-iso-halo)" />

      {/*
       * Island underside. Curved rather than a flat wedge so it reads as rock
       * torn from the ground, and it fades out at the tip so the island looks
       * suspended rather than cut off.
       */}
      <path
        d={`M ${project(PLATE.x0, PLATE.y1).x} ${project(PLATE.x0, PLATE.y1).y + depth}
            C ${keel.x - 96} ${keel.y + 92}, ${keel.x - 40} ${keel.y + 140}, ${keel.x - 6} ${keel.y + 196}
            C ${keel.x + 20} ${keel.y + 138}, ${keel.x + 92} ${keel.y + 96}, ${project(PLATE.x1, PLATE.y1).x} ${project(PLATE.x1, PLATE.y1).y + depth} Z`}
        fill="url(#nf-iso-keel)"
      />

      {/* Plate rim, the visible soil thickness */}
      <polygon
        points={poly([pE0, pE1, { x: pE1.x, y: pE1.y + depth }, { x: pE0.x, y: pE0.y + depth }])}
        fill="#123252"
      />
      <polygon
        points={poly([pE1, pS1, { x: pS1.x, y: pS1.y + depth }, { x: pE1.x, y: pE1.y + depth }])}
        fill="#0D2440"
      />

      {/* Water surface */}
      <polygon points={plateTop} fill="url(#nf-iso-plate)" />

      {/* Shoreline shimmer */}
      <polygon points={plateTop} fill="none" stroke="#7DE7F5" strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Land mass sitting on the water plate */}
      <polygon
        points={poly([
          project(-2.6, -1.0),
          project(5.8, -1.0),
          project(5.8, 5.0),
          project(-2.6, 5.0),
        ])}
        fill="#1A4A38"
      />
      <polygon
        points={poly([
          project(-2.4, -0.8),
          project(5.6, -0.8),
          project(5.6, 4.8),
          project(-2.4, 4.8),
        ])}
        fill="#215C44"
      />

      {/* Roads */}
      <polygon
        points={poly([project(-2.4, 0.75), project(5.6, 0.75), project(5.6, 1.05), project(-2.4, 1.05)])}
        fill="url(#nf-iso-road)"
      />
      <polygon
        points={poly([project(-2.4, 3.35), project(5.6, 3.35), project(5.6, 3.65), project(-2.4, 3.65)])}
        fill="url(#nf-iso-road)"
      />
      <polygon
        points={poly([project(2.35, -0.8), project(2.62, -0.8), project(2.62, 4.8), project(2.35, 4.8)])}
        fill="url(#nf-iso-road)"
      />

      {/* Resort pool, the one warm cyan note on the ground plane */}
      <polygon
        points={poly([project(3.5, 3.9), project(4.6, 3.9), project(4.6, 4.6), project(3.5, 4.6)])}
        fill="url(#nf-iso-pool)"
      />

      {/* Palms behind the skyline */}
      {PALMS.filter((p) => p.y < 2).map((p) => (
        <Palm key={`pb-${p.x}-${p.y}`} {...p} />
      ))}

      {/* Skyline, back to front */}
      {SKYLINE.map((b) => (
        <Building key={`b-${b.x}-${b.y}`} {...b} />
      ))}

      {/* Low rise */}
      {HOUSES.map((h) => (
        <House key={`h-${h.x}-${h.y}`} {...h} />
      ))}

      {/* Palms in front */}
      {PALMS.filter((p) => p.y >= 2).map((p) => (
        <Palm key={`pf-${p.x}-${p.y}`} {...p} />
      ))}

      {/* Beacon on the tallest tower */}
      <circle cx={project(2.2, 1.8, 9.6).x} cy={project(2.2, 1.8, 9.6).y - 4} r="4" fill="#00C8FF">
        <animate
          attributeName="opacity"
          values="1;0.25;1"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

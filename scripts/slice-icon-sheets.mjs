/**
 * Slice the supplied glass icon sheets into individual square PNGs.
 *
 * Run from the repository root:
 *
 *   node scripts/slice-icon-sheets.mjs
 *
 * WHY THIS IS NOT A FIXED GRID.
 *
 * The obvious approach is to divide a 1254x1254 sheet into 5 by 5 and cut. It
 * is wrong on at least one real sheet: the transaction set has 24 objects in a
 * 5x5 layout, and the row that carries only four does not leave a hole in the
 * fifth column, it SPREADS its four objects across the full width. A fixed grid
 * slices that row through the middle of every object in it.
 *
 * So the geometry is measured rather than assumed, in two passes:
 *
 *   1. ROW BANDS. Take the maximum luminance of every pixel row across the whole
 *      sheet. A run of dark rows is a gutter. What is left between gutters is a
 *      band of objects.
 *   2. COLUMNS, PER BAND. Repeat the same scan horizontally, but only within one
 *      band at a time. This is the part that has to be per band, because the
 *      columns genuinely differ between rows.
 *
 * Column gutters cannot be found from a whole-sheet scan the way row gutters
 * can. The objects glow, and on a sheet this dense the bloom from two
 * neighbouring tiles meets in the middle of the gutter and lifts it above any
 * threshold that still separates the rows. Scanning inside a single band is what
 * makes the gutter reappear.
 *
 * PRESERVING THE GLOW, WHICH IS THE POINT.
 *
 * The glow is part of the mark and cropping it off would be the single easiest
 * way to ruin this artwork. The detected box is the part bright enough to clear
 * the threshold, so it is always TIGHTER than the object's true extent. Each box
 * is therefore expanded to the midpoint of the gutter on every side before it is
 * cut, which reclaims the bloom that fell below the threshold, and then squared
 * on the longer edge so every output has the same aspect.
 *
 * Nothing is resampled. Each tile is an `extract` at source resolution, so the
 * output is exactly the pixels the founder rendered.
 */

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEETS = path.join(ROOT, "assets/brand-sheets");
const OUT = path.join(ROOT, "assets/brand-sliced");

/**
 * How far from the ground colour a pixel must be before it counts as artwork.
 *
 * MEASURED IN COVERAGE, NOT IN A MINIMUM, and that distinction is the whole
 * reason this works on both sheet types. The first version of this script asked
 * "is the darkest pixel in this row still bright enough to be ground", which is
 * fine on black and fails on white: the light sheet's objects cast soft drop
 * shadows into the gutters, so the darkest pixel in a gutter row reaches 195
 * against a ground of 253, and no single threshold separates that from an
 * object. It found 13 objects where there are 24.
 *
 * Counting instead is robust to a shadow. A gutter row has a handful of grey
 * pixels; a row of objects has hundreds.
 */
const DARK_FLOOR = 70;
const LIGHT_CEIL = 238;

/** A line is a gutter when fewer than this share of it is artwork. */
const GUTTER_COVERAGE = 0.012;

/** A gutter shorter than this is noise inside an object, not a gap between two. */
const MIN_GUTTER = 10;

/** An object narrower than this is a stray highlight, not a mark. */
const MIN_OBJECT = 60;

/**
 * Sheets whose geometry is BORROWED from another sheet rather than detected.
 *
 * The transaction set exists twice: `CF5A4150` is 24 glass tiles on black and
 * `C0F67033` is the same 24 objects, in the same order and the same positions,
 * as frosted white glass on white. Detection works perfectly on the dark one and
 * does not on the light one, because the light objects float free with no tile
 * and cast soft shadows that bridge the gutters between them. Tuning a threshold
 * until it happens to find 24 would be fitting the answer.
 *
 * Borrowing the dark sheet's boxes is better than a tuned threshold for a reason
 * beyond convenience: it makes the pairing EXACT BY CONSTRUCTION. Index 07 in the
 * dark set and index 07 in the light set are guaranteed to be the same object,
 * which is the whole property the light and dark system depends on. A detector
 * that found 24 boxes on each sheet independently could still pair them wrongly.
 *
 * Both sheets are 1254x1254, which is checked below rather than assumed.
 */
/**
 * Sheets cut on a declared grid rather than a detected one, and why detection
 * is the wrong tool on exactly these two.
 *
 * The two hero sheets are six large scenes in a regular three by two, each one
 * standing on a lit glass plinth. Detection gets the columns right and the rows
 * wrong, and the reason is the plinth: its glow spills below the object far
 * further than the object's own bloom, so the bottom row's lower gutter all but
 * vanishes while the upper one stays wide. The band that comes out is offset
 * upward, and squaring it on the longer edge, which on a wide scene is the
 * width, then pulls the frame up again. The result took the top off the shield
 * scene and the bottom off the phone, and carried a slice of the row above into
 * both.
 *
 * On a grid this regular a declared division cannot make that mistake. Six even
 * cells on a sheet whose margins are even is exact, and every object sits inside
 * its own cell with the whole plinth glow intact.
 *
 * THESE ARE ALSO NOT SQUARED, deliberately. A hero scene is wider than it is
 * tall; squaring it would either crop the scene or pad it with ground that the
 * layout then has to fight. The 210 small objects ARE squared, because they are
 * drawn square and a uniform box is what an icon component needs.
 */
const FIXED_GRID = {
  "7EE388E5-C9EC-4F55-8E06-06D4DC9D6703.png": { cols: 3, rows: 2 },
  "8DBE517E-D257-473A-9352-A1B9BF1DF687.png": { cols: 3, rows: 2 },
};

/**
 * Sheets whose COLUMN COUNT PER ROW is declared, because detection cannot find
 * the gutters and the reason is physical rather than a threshold to tune.
 *
 * `C0F67033` is the transaction set as frosted white glass on white. Its objects
 * float free with no tile and each one casts a soft drop shadow that reaches into
 * the gutter beside it, so two neighbours are joined by a continuous grey bridge.
 * Row detection still works, because the vertical gaps are wide. Column detection
 * finds 19 objects where there are 24, and no threshold that separates the
 * bridged pairs still keeps the pale objects whole.
 *
 * WHAT WAS TRIED FIRST AND WHY IT IS GONE. This sheet used to borrow its geometry
 * wholesale from the dark twin `CF5A4150`, on the stated grounds that the two
 * carry the same 24 objects in the same order, so the boxes would transfer. The
 * order claim is true and the geometry claim is not. THE TWO SHEETS WRAP
 * DIFFERENTLY: the dark one runs 5,5,5,5,4 and the light one runs 5,5,5,4,5.
 * Reading order is identical, so index 20 is the identity card on both, but from
 * the fourth row on, a box borrowed row for row is looking at the wrong place on
 * the sheet, and no amount of growing or lifting the frame corrects a cell that
 * is in the wrong row.
 *
 * That is worth keeping in the file, because the mistake is invisible from the
 * dark sheet alone. The two only diverge in the last five of twenty four, and a
 * borrowed render looks plausible right up until the two sheets are laid side by
 * side and counted.
 *
 * Declaring the counts is the honest fix. The rows are detected; within a row the
 * objects are evenly spaced, so the band is divided by the declared count.
 */
/**
 * Per-sheet relaxation of the gutter test, for one sheet and one reason.
 *
 * On `C0F67033` the drop shadow under the first row all but touches the wallets
 * in the second, so the gap between those two rows narrows to about a dozen
 * pixels carrying a faint grey wash. At the default coverage the run is not
 * clear enough for long enough and the two rows come back as one band. Every
 * other gutter on that sheet is found comfortably.
 *
 * This is raised for this sheet alone rather than globally. The default is what
 * keeps the dense dark sheets from merging a row into its neighbour, and
 * loosening it everywhere to rescue one white sheet would trade nine working
 * sheets against one.
 */
const SHEET_TUNING = {
  "C0F67033-70FD-4CDF-83FE-ACFAEB115CC8.png": { gutterCoverage: 0.02 },
};

const DECLARED_COLUMNS = {
  "C0F67033-70FD-4CDF-83FE-ACFAEB115CC8.png": [5, 5, 5, 4, 5],
};

function runsOfGround(profile, threshold) {
  const runs = [];
  let start = null;
  for (let i = 0; i < profile.length; i += 1) {
    if (profile[i] <= threshold) {
      if (start === null) start = i;
    } else {
      if (start !== null && i - start >= MIN_GUTTER) runs.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null && profile.length - start >= MIN_GUTTER) runs.push([start, profile.length - 1]);
  return runs;
}

/** The spans of artwork left between the ground runs, plus each span's gutters. */
function spansBetween(runs, length) {
  const spans = [];
  for (let i = 0; i < runs.length - 1; i += 1) {
    const from = runs[i][1] + 1;
    const to = runs[i + 1][0] - 1;
    if (to - from + 1 >= MIN_OBJECT) {
      spans.push({ from, to, padBefore: runs[i], padAfter: runs[i + 1] });
    }
  }
  return spans;
}

/** Expand a span to the middle of the gutter on each side, then clamp. */
function withGlow({ from, to, padBefore, padAfter }, limit) {
  const before = Math.round((padBefore[0] + padBefore[1]) / 2);
  const after = Math.round((padAfter[0] + padAfter[1]) / 2);
  return { from: Math.max(0, before), to: Math.min(limit - 1, after) };
}

async function sliceSheet(file) {
  const src = path.join(SHEETS, file);
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  const declared = FIXED_GRID[file];
  if (declared) {
    const cellW = Math.floor(w / declared.cols);
    const cellH = Math.floor(h / declared.rows);
    const boxes = [];
    for (let r = 0; r < declared.rows; r += 1) {
      for (let k = 0; k < declared.cols; k += 1) {
        boxes.push({ left: k * cellW, top: r * cellH, width: cellW, height: cellH });
      }
    }
    const stemFixed = file.slice(0, 8).toLowerCase();
    const dirFixed = path.join(OUT, stemFixed);
    await mkdir(dirFixed, { recursive: true });
    for (let i = 0; i < boxes.length; i += 1) {
      const n = String(i + 1).padStart(2, "0");
      await sharp(src).extract(boxes[i]).png({ compressionLevel: 9 }).toFile(path.join(dirFixed, `${n}.png`));
    }
    return { file, stem: stemFixed, onWhite: false, declaredGrid: declared, count: boxes.length, boxes };
  }
  const lum = (x, y) => {
    const i = (y * w + x) * c;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };

  /* Decide which way round the sheet is by sampling its corners. */
  const corner = (lum(4, 4) + lum(w - 5, 4) + lum(4, h - 5) + lum(w - 5, h - 5)) / 4;
  const onWhite = corner > 128;
  const isArt = onWhite ? (v) => v < LIGHT_CEIL : (v) => v > DARK_FLOOR;

  /* Coverage per row: how many pixels in it are artwork rather than ground. */
  const rowProfile = new Array(h).fill(0);
  for (let y = 0; y < h; y += 1) {
    let n = 0;
    for (let x = 0; x < w; x += 1) if (isArt(lum(x, y))) n += 1;
    rowProfile[y] = n;
  }
  const coverage = SHEET_TUNING[file]?.gutterCoverage ?? GUTTER_COVERAGE;
  const rowSpans = spansBetween(runsOfGround(rowProfile, Math.round(w * coverage)), h);

  const declaredRows = DECLARED_COLUMNS[file];
  if (declaredRows && declaredRows.length !== rowSpans.length) {
    throw new Error(
      `${file} declares ${declaredRows.length} rows and ${rowSpans.length} were detected. ` +
        "Fix the declaration rather than the threshold: the counts are a statement about the artwork.",
    );
  }

  const cells = [];
  for (const rowSpan of rowSpans) {
    const band = withGlow(rowSpan, h);
    const bandHeight = rowSpan.to - rowSpan.from + 1;
    const colProfile = new Array(w).fill(0);
    for (let x = 0; x < w; x += 1) {
      let n = 0;
      for (let y = rowSpan.from; y <= rowSpan.to; y += 1) if (isArt(lum(x, y))) n += 1;
      colProfile[x] = n;
    }
    const declaredCols = DECLARED_COLUMNS[file]?.[rowSpans.indexOf(rowSpan)];
    if (declaredCols) {
      const cellW = w / declaredCols;
      for (let k = 0; k < declaredCols; k += 1) {
        cells.push({
          x: Math.round(k * cellW),
          y: band.from,
          w: Math.round(cellW),
          h: band.to - band.from + 1,
        });
      }
      continue;
    }
    const colSpans = spansBetween(runsOfGround(colProfile, Math.round(bandHeight * coverage)), w);
    for (const colSpan of colSpans) {
      const box = withGlow(colSpan, w);
      cells.push({ x: box.from, y: band.from, w: box.to - box.from + 1, h: band.to - band.from + 1 });
    }
  }

  /*
   * Square every cell ON THE ROW PITCH, not on its own longer edge.
   *
   * The obvious rule, square on whichever edge is longer, is wrong on a uniform
   * grid and the transaction sheet proves it. Four of its twenty four objects
   * are small and round, a ring chart, a warning triangle, an info disc, a clock
   * face, so the column gutters either side of them are much wider than the
   * gutters around a full-width object. Expanding to the gutter midpoint then
   * makes the box WIDER THAN THE TILE, squaring takes that width as the edge,
   * and the resulting box is taller than the row and eats a strip of the tile
   * above and the tile below. It is only visible on those four, which is exactly
   * why it survived a first look.
   *
   * The row band is the reliable measurement. Its edges are gutter midpoints
   * between rows, so its height IS the grid pitch, and on sheets of square tiles
   * the pitch is the tile. Taking the edge from the band and centring it on the
   * column's own centre gives every object the same frame and cannot overflow
   * into the neighbouring row, because the band is bounded by the gutters.
   */
  let squared = cells.map((cell) => {
    const edge = Math.min(cell.h, w, h);
    let left = Math.round(cell.x + cell.w / 2 - edge / 2);
    let top = cell.y;
    left = Math.max(0, Math.min(left, w - edge));
    top = Math.max(0, Math.min(top, h - edge));
    return { left, top, width: edge, height: edge };
  });

  const stem = file.slice(0, 8).toLowerCase();
  const dir = path.join(OUT, stem);
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < squared.length; i += 1) {
    const n = String(i + 1).padStart(2, "0");
    await sharp(src).extract(squared[i]).png({ compressionLevel: 9 }).toFile(path.join(dir, `${n}.png`));
  }
  return { file, stem, onWhite, count: squared.length, boxes: squared };
}

await mkdir(OUT, { recursive: true });
const files = (await readdir(SHEETS)).filter((f) => f.toLowerCase().endsWith(".png")).sort();

const report = [];
for (const file of files) {
  const result = await sliceSheet(file);
  report.push(result);
  console.log(
    `${result.stem}  ${result.onWhite ? "light" : "dark "}  ${String(result.count).padStart(2)} objects` +
      (result.declaredGrid ? `  (declared ${result.declaredGrid.cols}x${result.declaredGrid.rows} grid)` : "") +
      (DECLARED_COLUMNS[file] ? `  (declared columns ${DECLARED_COLUMNS[file].join(",")})` : ""),
  );
}
await writeFile(path.join(OUT, "slice-report.json"), JSON.stringify(report, null, 1), "utf8");
console.log(`\n${report.reduce((n, r) => n + r.count, 0)} objects written to assets/brand-sliced`);

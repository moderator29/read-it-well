/**
 * A small QR code encoder for deposit addresses. Client-safe, no dependencies.
 *
 * WHY IT IS HAND WRITTEN. No QR package is installed, the registry is not
 * reachable from the build machine, and an address QR must never be drawn by
 * a third-party image service (that would send the deposit address, and so
 * the payment, to somebody else's server). A deposit address is at most ~100
 * bytes, so this encodes exactly one case, and encodes it by the book
 * (ISO/IEC 18004): byte mode, error correction level M, versions 1 to 10
 * (up to 213 bytes), all eight masks scored by the standard penalty rules.
 * It follows the structure of Project Nayuki's reference implementation (MIT).
 *
 * What is tested (`qr.test.ts`): the Reed-Solomon codewords against the
 * published worked example, the format and version bit strings against the
 * published tables, the fixed patterns, and the data capacity. It has NOT
 * been scanned by a phone camera in this session; do that once before the
 * flag goes on.
 */

type Spec = { total: number; ecPerBlock: number; blocks: number; align: number[] };

/** Level M, versions 1..10: total codewords, EC codewords per block, block count, alignment centres. */
const SPECS: readonly Spec[] = [
  { total: 26, ecPerBlock: 10, blocks: 1, align: [] },
  { total: 44, ecPerBlock: 16, blocks: 1, align: [6, 18] },
  { total: 70, ecPerBlock: 26, blocks: 1, align: [6, 22] },
  { total: 100, ecPerBlock: 18, blocks: 2, align: [6, 26] },
  { total: 134, ecPerBlock: 24, blocks: 2, align: [6, 30] },
  { total: 172, ecPerBlock: 16, blocks: 4, align: [6, 34] },
  { total: 196, ecPerBlock: 18, blocks: 4, align: [6, 22, 38] },
  { total: 242, ecPerBlock: 22, blocks: 4, align: [6, 24, 42] },
  { total: 292, ecPerBlock: 22, blocks: 5, align: [6, 26, 46] },
  { total: 346, ecPerBlock: 26, blocks: 5, align: [6, 28, 50] },
];

export const QR_MAX_VERSION = SPECS.length;

/** Data codewords at level M for a version. */
export function dataCapacity(version: number): number {
  const spec = SPECS[version - 1];
  if (!spec) throw new Error("Unsupported QR version.");
  return spec.total - spec.ecPerBlock * spec.blocks;
}

/* ---------------------------------------------------------- Reed-Solomon */

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

export function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j]!, root);
      if (j + 1 < result.length) result[j]! ^= result[j + 1]!;
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

export function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i]! ^= gfMul(coef, factor);
    });
  }
  return result;
}

/* ---------------------------------------------------------- bit strings */

/** The 15 format bits for level M and a mask. */
export function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask; // level M is 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** The 18 version bits (versions 7 and above). */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

const bit = (value: number, i: number): boolean => ((value >>> i) & 1) !== 0;

/* ---------------------------------------------------------- the symbol */

export type QrMatrix = { size: number; version: number; mask: number; modules: boolean[][] };

/** UTF-8 bytes of a string, without TextEncoder so it runs anywhere. */
function utf8(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
}

/** The data codewords (mode, count, bytes, terminator, padding) for a version. */
export function dataCodewords(bytes: readonly number[], version: number): number[] {
  const capacity = dataCapacity(version);
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capBits = capacity * 8;
  if (bits.length > capBits) throw new Error("Too long for this version.");
  push(0, Math.min(4, capBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  for (let pad = 0xec; out.length < capacity; pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

/** Split into blocks, add EC, interleave: the final codeword sequence. */
export function interleave(data: readonly number[], version: number): number[] {
  const spec = SPECS[version - 1]!;
  const numShort = spec.blocks - (spec.total % spec.blocks);
  const shortLen = Math.floor(spec.total / spec.blocks);
  const divisor = rsDivisor(spec.ecPerBlock);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < spec.blocks; i++) {
    const len = shortLen - spec.ecPerBlock + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    const ecc = rsRemainder(dat, divisor);
    const block = [...dat];
    if (i < numShort) block.push(0);
    blocks.push([...block, ...ecc]);
  }
  const out: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - spec.ecPerBlock || j >= numShort) out.push(block[i]!);
    });
  }
  return out;
}

function maskHit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

class QrSymbol {
  readonly size: number;
  readonly modules: boolean[][];
  readonly fn: boolean[][];

  constructor(readonly version: number) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fn = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  private set(x: number, y: number, dark: boolean): void {
    this.modules[y]![x] = dark;
    this.fn[y]![x] = true;
  }

  drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.finder(3, 3);
    this.finder(this.size - 4, 3);
    this.finder(3, this.size - 4);
    const align = SPECS[this.version - 1]!.align;
    const last = align.length - 1;
    align.forEach((ax, i) =>
      align.forEach((ay, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) this.set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }),
    );
    this.drawFormat(0);
    if (this.version >= 7) {
      const bits = versionBits(this.version);
      for (let i = 0; i < 18; i++) {
        const a = this.size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this.set(a, b, bit(bits, i));
        this.set(b, a, bit(bits, i));
      }
    }
  }

  private finder(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= this.size || yy >= this.size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.set(xx, yy, dist !== 2 && dist !== 4);
      }
  }

  drawFormat(mask: number): void {
    const bits = formatBits(mask);
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(bits, i));
    this.set(8, 7, bit(bits, 6));
    this.set(8, 8, bit(bits, 7));
    this.set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) this.set(this.size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.set(8, this.size - 15 + i, bit(bits, i));
    this.set(8, this.size - 8, true);
  }

  drawCodewords(data: readonly number[]): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.fn[y]![x] && i < data.length * 8) {
            this.modules[y]![x] = bit(data[i >>> 3]!, 7 - (i & 7));
            i++;
          }
        }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) if (!this.fn[y]![x] && maskHit(mask, x, y)) this.modules[y]![x] = !this.modules[y]![x];
  }

  penalty(): number {
    const n = this.size;
    const m = this.modules;
    let score = 0;
    const line = (get: (i: number) => boolean) => {
      let run = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && get(i) === get(i - 1)) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      for (let i = 0; i + 10 < n; i++) {
        const s = Array.from({ length: 11 }, (_, k) => (get(i + k) ? 1 : 0)).join("");
        if (s === "10111010000" || s === "00001011101") score += 40;
      }
    };
    for (let y = 0; y < n; y++) line((x) => m[y]![x]!);
    for (let x = 0; x < n; x++) line((y) => m[y]![x]!);
    for (let y = 0; y + 1 < n; y++)
      for (let x = 0; x + 1 < n; x++) {
        const c = m[y]![x];
        if (c === m[y]![x + 1] && c === m[y + 1]![x] && c === m[y + 1]![x + 1]) score += 3;
      }
    const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const total = n * n;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * 10;
    return score;
  }
}

/** Encode text (a deposit address) as a QR symbol at level M. Throws if it will not fit version 10. */
export function encodeQr(text: string): QrMatrix {
  const bytes = utf8(text);
  let version = 0;
  for (let v = 1; v <= QR_MAX_VERSION; v++) {
    const countBits = v <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCapacity(v) * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) throw new Error("That text is too long for a QR code here.");

  const codewords = interleave(dataCodewords(bytes, version), version);
  const symbol = new QrSymbol(version);
  symbol.drawFunctionPatterns();
  symbol.drawCodewords(codewords);

  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask++) {
    symbol.applyMask(mask);
    symbol.drawFormat(mask);
    const score = symbol.penalty();
    if (score < bestScore) {
      best = mask;
      bestScore = score;
    }
    symbol.applyMask(mask);
  }
  symbol.applyMask(best);
  symbol.drawFormat(best);
  return { size: symbol.size, version, mask: best, modules: symbol.modules };
}

/** The dark modules as one SVG path (1 unit per module), for a crisp render at any size. */
export function qrPath(matrix: QrMatrix, quiet = 4): string {
  const parts: string[] = [];
  matrix.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
    }),
  );
  return parts.join("");
}

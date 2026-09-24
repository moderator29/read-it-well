/**
 * UNIT SHAPES AS DATA (V-66): the shape of the home in the words the market
 * uses, how many bedrooms are en-suite, and whether a boys' quarters comes
 * with it.
 *
 * "2 bedroom" says little in Nigeria. A self-contain is one room with its own
 * kitchen and toilet, a room and parlour shares facilities, a mini flat is one
 * bedroom with a sitting room. These are the database's `unit_shape` enum and
 * the `ensuite_count` and `has_bq` columns (migration `20260924150600`), read
 * by their own query like the compound facts (`compound.ts` says why), so a
 * database without the migration shows no shapes rather than no catalogue.
 *
 * Pure and tested. The card line, the drawer's chips, the wizard and the
 * search box's shorthand parser (`query-parse.ts`) all read this list.
 */

export const UNIT_SHAPES = [
  "self_contain",
  "room_parlour",
  "mini_flat",
  "flat",
  "duplex",
  "terrace",
  "semi_detached",
  "detached",
  "bungalow",
  "maisonette",
  "penthouse",
  "boys_quarters",
] as const;
export type UnitShape = (typeof UNIT_SHAPES)[number];

export function isUnitShape(value: unknown): value is UnitShape {
  return typeof value === "string" && (UNIT_SHAPES as readonly string[]).includes(value);
}

/**
 * The shapes as people type them (V-66), longest phrases first so "semi
 * detached" is not read as "detached". The search box's parser reads these,
 * and a shape filter uses them to keep an UNSHAPED listing whose own title
 * says the word (batch 4 review): a typed shape must not hide real listings
 * that simply predate the shape question.
 */
export const SHAPE_PHRASES: readonly [RegExp, UnitShape][] = [
  [/(?:^|\s)s\/c(?=\s|$)/g, "self_contain"],
  [/\bself[\s-]*con(?:tain(?:ed)?)?\b/g, "self_contain"],
  [/\broom\s*(?:and|&|n)\s*parlou?r\b/g, "room_parlour"],
  [/\bmini[\s-]*flat\b/g, "mini_flat"],
  [/\bsemi[\s-]*detached\b/g, "semi_detached"],
  [/\bdetached(?:\s+house)?\b/g, "detached"],
  [/\bterraced?(?:\s+house)?\b/g, "terrace"],
  [/\bduplex\b/g, "duplex"],
  [/\bbungalow\b/g, "bungalow"],
  [/\bmaisonn?ette\b/g, "maisonette"],
  [/\bpenthouse\b/g, "penthouse"],
  [/\bboys?'?\s*quarters?\b/g, "boys_quarters"],
  [/\bflat\b/g, "flat"],
];

/** The shapes a piece of text names, each once, longest phrase winning. */
export function shapesInText(text: string): UnitShape[] {
  let rest = ` ${text.toLowerCase()} `;
  const found: UnitShape[] = [];
  for (const [pattern, shape] of SHAPE_PHRASES) {
    const re = new RegExp(pattern.source, "g");
    if (re.test(rest)) {
      if (!found.includes(shape)) found.push(shape);
      rest = rest.replace(new RegExp(pattern.source, "g"), " ");
    }
  }
  return found;
}

/** How a shape is written in an address bar: `mini-flat`, `self-contain`. */
export function shapeSlug(shape: UnitShape): string {
  return shape.replace(/_/g, "-");
}

export function shapeFromSlug(slug: string): UnitShape | null {
  const shape = slug.trim().toLowerCase().replace(/-/g, "_");
  return isUnitShape(shape) ? shape : null;
}

export type UnitFacts = {
  shape?: UnitShape;
  /** Bedrooms with their own bathroom. */
  ensuiteCount?: number;
  hasBq?: boolean;
};

export type UnitRow = {
  unit_shape?: string | null;
  ensuite_count?: number | null;
  has_bq?: boolean | null;
};

export const UNIT_COLUMNS = "unit_shape, ensuite_count, has_bq";

/** A row's answers, or null when it gave none. An unknown shape is dropped. */
export function readUnit(row: UnitRow | null | undefined): UnitFacts | null {
  if (!row) return null;
  const out: UnitFacts = {};
  if (isUnitShape(row.unit_shape)) out.shape = row.unit_shape;
  if (typeof row.ensuite_count === "number" && row.ensuite_count >= 0) out.ensuiteCount = row.ensuite_count;
  if (typeof row.has_bq === "boolean") out.hasBq = row.has_bq;
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * The drawer's shape chips (any of them) and "With BQ". Strict about silence:
 * a listing that never said its shape matches no shape.
 */
export function matchesUnit(
  unit: UnitFacts | null | undefined,
  filter: { shapes?: UnitShape[]; withBq?: boolean },
  title?: string,
): boolean {
  if (filter.shapes && filter.shapes.length > 0) {
    if (unit?.shape) {
      if (!filter.shapes.includes(unit.shape)) return false;
    } else {
      /* Unshaped: the listing's own title may still say it. */
      const said = title ? shapesInText(title) : [];
      if (!said.some((shape) => filter.shapes!.includes(shape))) return false;
    }
  }
  if (filter.withBq && unit?.hasBq !== true) return false;
  return true;
}

/** The shapes a home can be; shops, offices and plots have none. */
export function takesShape(kind: string): boolean {
  return kind === "apartment" || kind === "home" || kind === "villa" || kind === "rental";
}

/**
 * The shape the wizard offers first, from the bedrooms, for the lister to
 * confirm: none is a self-contain, one is a mini flat. Two and up could be a
 * flat or a house, and the wizard does not guess.
 */
export function inferShape(bedrooms: number): UnitShape | null {
  if (bedrooms <= 0) return "self_contain";
  if (bedrooms === 1) return "mini_flat";
  return null;
}

export type UnitLineCopy = {
  shapes: Record<UnitShape, string>;
  bed: string;
  allEnsuite: string;
  bothEnsuite: string;
  someEnsuite: string;
  withBq: string;
};

/**
 * The card's line: "2 bed flat, both en-suite, with BQ". Null without a shape,
 * so the card keeps its beds and baths. The single-room shapes carry no
 * bedroom count, because "1 bed self-contain" is the phrase the shape exists
 * to replace.
 */
export function unitLine(bedrooms: number, unit: UnitFacts | null | undefined, copy: UnitLineCopy): string | null {
  if (!unit?.shape) return null;
  const roomless = unit.shape === "self_contain" || unit.shape === "room_parlour" || unit.shape === "mini_flat" || unit.shape === "boys_quarters";
  const parts: string[] = [
    roomless || bedrooms <= 0
      ? copy.shapes[unit.shape]
      : `${copy.bed.replace("{n}", String(bedrooms))} ${copy.shapes[unit.shape].toLowerCase()}`,
  ];
  const ensuite = unit.ensuiteCount;
  if (ensuite !== undefined && ensuite > 0 && bedrooms > 1) {
    if (ensuite >= bedrooms) parts.push(bedrooms === 2 ? copy.bothEnsuite : copy.allEnsuite);
    else parts.push(copy.someEnsuite.replace("{n}", String(ensuite)));
  }
  if (unit.hasBq) parts.push(copy.withBq);
  return parts.join(", ");
}

/* ------------------------------------------------------------ the wizard */

export type UnitForm = {
  shape: UnitShape | "";
  /** "" unanswered; otherwise a whole number as typed. */
  ensuite: string;
  /** "" unanswered, "yes", "no". */
  bq: "" | "yes" | "no";
};

export const EMPTY_UNIT_FORM: UnitForm = { shape: "", ensuite: "", bq: "" };

export function unitFormOf(unit: UnitFacts | null | undefined): UnitForm {
  if (!unit) return { ...EMPTY_UNIT_FORM };
  return {
    shape: unit.shape ?? "",
    ensuite: unit.ensuiteCount === undefined ? "" : String(unit.ensuiteCount),
    bq: unit.hasBq === undefined ? "" : unit.hasBq ? "yes" : "no",
  };
}

export type UnitPayload = {
  unitShape: UnitShape | null;
  ensuiteCount: number | null;
  hasBq: boolean | null;
};

/** The form as columns' values. En-suite rooms are capped at the bedrooms. */
export function unitPayload(form: UnitForm, bedrooms: number): UnitPayload {
  const typed = form.ensuite.trim() === "" ? null : Number(form.ensuite);
  const ensuite =
    typed === null || !Number.isInteger(typed) || typed < 0 ? null : Math.min(typed, Math.max(0, bedrooms));
  return {
    unitShape: form.shape === "" ? null : form.shape,
    ensuiteCount: ensuite,
    hasBq: form.bq === "" ? null : form.bq === "yes",
  };
}

export function unitColumns(payload: Partial<UnitPayload>): UnitRow {
  const row: UnitRow = {};
  if (payload.unitShape !== undefined) row.unit_shape = payload.unitShape;
  if (payload.ensuiteCount !== undefined) row.ensuite_count = payload.ensuiteCount;
  if (payload.hasBq !== undefined) row.has_bq = payload.hasBq;
  return row;
}

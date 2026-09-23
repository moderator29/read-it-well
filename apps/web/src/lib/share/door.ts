import { formatMoneyGlance, type Dictionary, type Locale } from "@vallo/i18n";
import { moveInTotal, type MoveInColumns } from "../listings/pricing";
import { safeAreaName } from "../price-check/area-name";

/**
 * THE SHARE DOOR, AS PURE FUNCTIONS: what a row from `public.share_door` may
 * become on a card, and nothing else.
 *
 * ---------------------------------------------------------------------------
 * WHY A DOOR AT ALL.
 *
 * Under the 23 September ruling nothing inside the platform is visible signed
 * out, so `/listing/<id>` answers a stranger, and every link unfurler, with a
 * redirect to sign in. Every Share on Vallo therefore produced a "Sign in |
 * Vallo" card in WhatsApp, which is worse than a screenshot. A door is the one
 * public thing the ruling already allows (`sign-in` and `welcome` are doors):
 * a page whose only purpose is to lead somebody inside with a `next`. It shows
 * one card and one button, and it shows the SAME card to a person and to an
 * unfurler, because serving machines something humans are refused is cloaking.
 *
 * ---------------------------------------------------------------------------
 * THE ADDRESS RULE IS ENFORCED THREE TIMES, AND THIS IS THE SECOND.
 *
 *   1. `public.share_door` returns a fixed row type with no address, landmark,
 *      coordinate, location, estate, lister or contact column. The migration's
 *      probe inserts a listing with an address and fails if it comes back.
 *   2. `DoorRow` below names only the columns that function returns, and
 *      `doorCardFromRow` reads them by name. A row that somehow carried an
 *      `address` key is ignored, because nothing here reads it; the test
 *      `door.test.ts` hands it exactly such a row and searches the output.
 *   3. The area itself is free text a lister typed, so it is read through
 *      `doorPlace`, which refuses a string shaped like a street address (the
 *      Price Check rule) or naming an estate, and falls back to the city and
 *      then the state rather than printing it.
 *
 * ---------------------------------------------------------------------------
 * AN EXAMPLE LISTING GETS A DOOR AND NO FIGURES. The database already blanks
 * the title, place, photo and every figure on an example row (the syndication
 * rule in `lib/listings/syndication.ts`); `doorCardFromRow` refuses to print
 * any of them again even if they arrived, so a future change to the function
 * cannot quietly advertise a property that does not exist.
 */

/** Exactly the columns `public.share_door` returns. The list IS the rule. */
export type DoorRow = {
  state: string | null;
  listing_id: string | null;
  reference: string | null;
  is_demo: boolean | null;
  title: string | null;
  area: string | null;
  city: string | null;
  state_name: string | null;
  property_type: string | null;
  listing_intent: string | null;
  bedrooms: number | null;
  rent_amount_minor: number | string | null;
  rent_period: string | null;
  caution_deposit_minor: number | string | null;
  service_charge_minor: number | string | null;
  service_charge_period: string | null;
  agency_fee_minor: number | string | null;
  legal_fee_minor: number | string | null;
  agreement_fee_minor: number | string | null;
  total_move_in_cost_minor: number | string | null;
  sale_price_minor: number | string | null;
  rate_minor: number | string | null;
  rate_period: string | null;
  photo_path: string | null;
  price_share_id: string | null;
};

/** The headline figure and the line under it, already chosen and ordered. */
export type DoorFigures =
  /** A tenancy: the move-in total first, the rent second (the card rule). */
  | { kind: "move_in"; moveInMinor: number; rentMinor: number | null; rentPeriod: RentPeriod }
  | { kind: "sale"; priceMinor: number }
  | { kind: "night"; rateMinor: number }
  /** Nothing stated. The card says so rather than printing zero. */
  | { kind: "none" };

export type RentPeriod = "year" | "month" | "quarter";

export type DoorCard =
  | {
      kind: "listing";
      listingId: string;
      reference: string | null;
      title: string;
      /** "Yaba, Lagos". Area and state only; see `doorPlace`. */
      place: string | null;
      bedrooms: number | null;
      figures: DoorFigures;
      photoPath: string | null;
    }
  | { kind: "example"; listingId: string; reference: string | null }
  | { kind: "price_area"; shareId: string }
  | { kind: "gone" };

/** What reading a door can come back as. */
export type DoorRead =
  | { state: "open"; card: DoorCard }
  | { state: "missing" }
  | { state: "unreachable" };

/** A minted door token: ten characters from the reference alphabet, lower case. */
const TOKEN = /^[23456789abcdefghjkmnpqrstvwxyz]{10}$/;
/** A listing code typed at the door, `VL-7K4MQP` or `vl7k4mqp`. */
const CODE = /^VL-?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/**
 * Whether a path segment is worth asking the database about at all.
 *
 * Not a security check (the function refuses anything else too); it is what
 * keeps a crawler guessing at `/s/wp-admin` from costing a round trip.
 */
export function isDoorKey(raw: string): boolean {
  const trimmed = raw.trim();
  return TOKEN.test(trimmed) || CODE.test(trimmed.toUpperCase());
}

/** The door's own path, for a token the database minted. */
export function doorPath(token: string): string {
  return `/s/${token}`;
}

/**
 * An estate name is a location a stranger can walk to, which is the exact
 * thing rule 10 forbids on a share artefact. "Lekki Gardens Estate" is not an
 * area; it is a gate with a guard who can be asked which house.
 */
const ESTATE_WORD = /\b(estate|court|gardens|close|crescent|avenue|street|road|lane|drive|way)\b/i;

function clean(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The place a door may print: AREA AND STATE ONLY.
 *
 * The lister's area first, if it is a neighbourhood name rather than an
 * address or an estate; otherwise the city; otherwise the state alone. Never
 * anything finer than the area, and never a string that failed either test.
 */
export function doorPlace(
  area: string | null | undefined,
  city: string | null | undefined,
  stateName: string | null | undefined,
): string | null {
  const state = clean(stateName);
  const pick = (candidate: string | null | undefined): string | null => {
    const safe = safeAreaName(candidate);
    if (safe === null || ESTATE_WORD.test(safe)) return null;
    return safe;
  };
  const local = pick(area) ?? pick(city);
  if (local === null) return state;
  if (state === null || local.toLowerCase() === state.toLowerCase()) return local;
  return `${local}, ${state}`;
}

function minor(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asRentPeriod(value: string | null): RentPeriod {
  return value === "month" || value === "quarter" ? value : "year";
}

/**
 * The figures a card leads with, chosen by what the listing is.
 *
 * A TENANCY LEADS WITH THE MOVE-IN TOTAL, the PRODUCT.md card rule and the one
 * money decision nobody else in this market makes: the number a tenant has to
 * find at the gate, with the rent underneath. The total is the lister's stated
 * figure or the sum of the named parts (`moveInTotal`), never an invention.
 */
export function doorFigures(row: DoorRow): DoorFigures {
  if (row.listing_intent === "sale") {
    const price = minor(row.sale_price_minor);
    return price !== null && price > 0 ? { kind: "sale", priceMinor: price } : { kind: "none" };
  }
  const rent = minor(row.rent_amount_minor);
  const columns: MoveInColumns = {
    rent_amount_minor: rent,
    rent_period: row.rent_period,
    caution_deposit_minor: minor(row.caution_deposit_minor),
    service_charge_minor: minor(row.service_charge_minor),
    service_charge_period: row.service_charge_period,
    agency_fee_minor: minor(row.agency_fee_minor),
    legal_fee_minor: minor(row.legal_fee_minor),
    agreement_fee_minor: minor(row.agreement_fee_minor),
    total_move_in_cost_minor: minor(row.total_move_in_cost_minor),
  };
  const total = moveInTotal(columns);
  if (total.minor > 0) {
    return {
      kind: "move_in",
      moveInMinor: total.minor,
      rentMinor: rent !== null && rent > 0 ? rent : null,
      rentPeriod: asRentPeriod(row.rent_period),
    };
  }
  const rate = minor(row.rate_minor);
  if (rate !== null && rate > 0 && row.rate_period === "night") return { kind: "night", rateMinor: rate };
  return { kind: "none" };
}

/**
 * One row from `public.share_door`, as the card it may become.
 *
 * Reads every field BY NAME from `DoorRow`, which is the whole of the
 * projection; nothing is spread, so an extra key on the input (an `address`,
 * say, if the function were ever widened by mistake) has nowhere to go.
 */
export function doorCardFromRow(row: DoorRow | null | undefined): DoorCard | null {
  if (!row || typeof row !== "object") return null;
  if (row.state === "gone") return { kind: "gone" };
  if (row.state === "price_area") {
    return row.price_share_id ? { kind: "price_area", shareId: row.price_share_id } : null;
  }
  if (row.state !== "listing" || !row.listing_id) return null;

  const reference = clean(row.reference);
  if (row.is_demo !== false) {
    /* Anything but an explicit false is an example here. Fail towards
       printing less: an unknown flag must never produce a priced card. */
    return { kind: "example", listingId: row.listing_id, reference };
  }

  const title = clean(row.title);
  if (title === null) return null;
  return {
    kind: "listing",
    listingId: row.listing_id,
    reference,
    title,
    place: doorPlace(row.area, row.city, row.state_name),
    bedrooms: row.bedrooms !== null && row.bedrooms >= 0 ? row.bedrooms : null,
    figures: doorFigures(row),
    photoPath: clean(row.photo_path),
  };
}

/** Where the button goes: sign in, then the thing that was shared. */
export function doorSignInHref(card: DoorCard): string {
  if (card.kind === "listing" || card.kind === "example") {
    return `/sign-in?next=${encodeURIComponent(`/listing/${card.listingId}`)}`;
  }
  if (card.kind === "price_area") {
    return `/sign-in?next=${encodeURIComponent("/price")}`;
  }
  return "/sign-in";
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

export type DoorLines = {
  /** The big figure, or null when nothing was stated. */
  headline: string | null;
  /** The line under it: the rent for a tenancy. */
  second: string | null;
  /** "2 bedrooms" or "Studio". */
  bedrooms: string | null;
};

/**
 * The words on a listing card, in one place so the page and the image cannot
 * disagree. Money only through `formatMoneyGlance` (rule 8).
 */
export function doorLines(
  card: Extract<DoorCard, { kind: "listing" }>,
  copy: Dictionary["frontDoor"]["door"],
  locale: Locale,
): DoorLines {
  const money = (value: number) => formatMoneyGlance(value, locale);
  const f = card.figures;
  let headline: string | null = null;
  let second: string | null = null;
  if (f.kind === "move_in") {
    headline = fill(copy.moveIn, { amount: money(f.moveInMinor) });
    if (f.rentMinor !== null) {
      second = fill(copy.rent, { amount: money(f.rentMinor), period: copy.periods[f.rentPeriod] });
    }
  } else if (f.kind === "sale") {
    headline = fill(copy.salePrice, { amount: money(f.priceMinor) });
  } else if (f.kind === "night") {
    headline = fill(copy.rate, { amount: money(f.rateMinor) });
  }
  const bedrooms =
    card.bedrooms === null
      ? null
      : card.bedrooms === 0
        ? copy.bedrooms.studio
        : card.bedrooms === 1
          ? copy.bedrooms.one
          : fill(copy.bedrooms.other, { count: card.bedrooms });
  return { headline, second, bedrooms };
}

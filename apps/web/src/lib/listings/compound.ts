/**
 * THE COMPOUND: the five questions asked at every Lagos viewing (V-28).
 *
 * Where does the car go, how many flats share the gate, does the landlord live
 * here, how does the rubbish leave, and can a car get in at all. Each is one
 * nullable column on `listings` (migration `20260924150200`), and each is
 * optional in the wizard, because an unanswered question is a real state and
 * the product never turns it into a no.
 *
 * WHY THE READ IS SEPARATE FROM THE CATALOGUE SELECT. The main selects in
 * `supabase-repository.ts` fail as a whole if one column in them does not
 * exist, and the ledger records what that cost once: the whole catalogue off
 * the air because code reached production before its migration. So these five
 * are read by their own small query, and a database that has not had the
 * migration yet simply returns no compound facts rather than no listings.
 *
 * Pure parsing and wording live here and are tested; the reads live in the
 * repository and the wizard's query.
 */

export const PARKING_TYPES = ["inside", "street", "none"] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];
export const WASTE_DISPOSALS = ["psp", "estate", "none"] as const;
export type WasteDisposal = (typeof WASTE_DISPOSALS)[number];

export type Compound = {
  parkingType?: ParkingType;
  flatsInCompound?: number;
  landlordOnSite?: boolean;
  wasteDisposal?: WasteDisposal;
  carAccess?: boolean;
};

/** The five columns as Postgres spells them, each possibly absent. */
export type CompoundRow = {
  parking_type?: string | null;
  flats_in_compound?: number | null;
  landlord_on_site?: boolean | null;
  waste_disposal?: string | null;
  car_access?: boolean | null;
};

export const COMPOUND_COLUMNS =
  "parking_type, flats_in_compound, landlord_on_site, waste_disposal, car_access";

function isParkingType(value: unknown): value is ParkingType {
  return typeof value === "string" && (PARKING_TYPES as readonly string[]).includes(value);
}

function isWasteDisposal(value: unknown): value is WasteDisposal {
  return typeof value === "string" && (WASTE_DISPOSALS as readonly string[]).includes(value);
}

/**
 * A row's compound facts, or null when it answered none of them. A value
 * outside the vocabulary is dropped rather than shown: the check constraints
 * make that impossible in the database, and a reader must not print a word it
 * does not know how to say.
 */
export function readCompound(row: CompoundRow | null | undefined): Compound | null {
  if (!row) return null;
  const out: Compound = {};
  if (isParkingType(row.parking_type)) out.parkingType = row.parking_type;
  if (typeof row.flats_in_compound === "number" && row.flats_in_compound >= 1) {
    out.flatsInCompound = row.flats_in_compound;
  }
  if (typeof row.landlord_on_site === "boolean") out.landlordOnSite = row.landlord_on_site;
  if (isWasteDisposal(row.waste_disposal)) out.wasteDisposal = row.waste_disposal;
  if (typeof row.car_access === "boolean") out.carAccess = row.car_access;
  return Object.keys(out).length > 0 ? out : null;
}

export type CompoundCopy = {
  parkingInside: string;
  parkingStreet: string;
  parkingNone: string;
  flatsOne: string;
  flatsMany: string;
  landlordOnSite: string;
  landlordElsewhere: string;
  wastePsp: string;
  wasteEstate: string;
  wasteNone: string;
  carAccess: string;
  noCarAccess: string;
};

export type CompoundFact = {
  key: "parking" | "flats" | "landlord" | "waste" | "car";
  label: string;
};

/** The answered facts, in the order they are asked at the gate. */
export function compoundFacts(compound: Compound | null | undefined, copy: CompoundCopy): CompoundFact[] {
  if (!compound) return [];
  const facts: CompoundFact[] = [];
  if (compound.parkingType) {
    facts.push({
      key: "parking",
      label:
        compound.parkingType === "inside"
          ? copy.parkingInside
          : compound.parkingType === "street"
            ? copy.parkingStreet
            : copy.parkingNone,
    });
  }
  if (compound.flatsInCompound !== undefined) {
    facts.push({
      key: "flats",
      label:
        compound.flatsInCompound === 1
          ? copy.flatsOne
          : copy.flatsMany.replace("{n}", String(compound.flatsInCompound)),
    });
  }
  if (compound.landlordOnSite !== undefined) {
    facts.push({
      key: "landlord",
      label: compound.landlordOnSite ? copy.landlordOnSite : copy.landlordElsewhere,
    });
  }
  if (compound.wasteDisposal) {
    facts.push({
      key: "waste",
      label:
        compound.wasteDisposal === "psp"
          ? copy.wastePsp
          : compound.wasteDisposal === "estate"
            ? copy.wasteEstate
            : copy.wasteNone,
    });
  }
  if (compound.carAccess !== undefined) {
    facts.push({ key: "car", label: compound.carAccess ? copy.carAccess : copy.noCarAccess });
  }
  return facts;
}

/* ----------------------------------------------------------- the filters */

/**
 * The two compound filters the drawer offers, and both are STRICT: a listing
 * that did not answer never satisfies them, because nobody but the lister can
 * promise the landlord lives elsewhere.
 */
export function matchesCompound(
  compound: Compound | null | undefined,
  filter: { landlordAway?: boolean; parkingInside?: boolean },
): boolean {
  if (filter.landlordAway && compound?.landlordOnSite !== false) return false;
  if (filter.parkingInside && compound?.parkingType !== "inside") return false;
  return true;
}

/* ------------------------------------------------------------ the wizard */

/**
 * The wizard's shape for the five answers: every field a string, because
 * every control is a select or a text box, and `""` means not answered.
 */
export type CompoundForm = {
  parkingType: ParkingType | "";
  flatsInCompound: string;
  landlordOnSite: "" | "yes" | "no";
  wasteDisposal: WasteDisposal | "";
  carAccess: "" | "yes" | "no";
};

export const EMPTY_COMPOUND_FORM: CompoundForm = {
  parkingType: "",
  flatsInCompound: "",
  landlordOnSite: "",
  wasteDisposal: "",
  carAccess: "",
};

function yesNo(value: boolean | undefined): "" | "yes" | "no" {
  return value === undefined ? "" : value ? "yes" : "no";
}

/** A stored answer set, as the wizard shows it. */
export function compoundFormOf(compound: Compound | null | undefined): CompoundForm {
  if (!compound) return { ...EMPTY_COMPOUND_FORM };
  return {
    parkingType: compound.parkingType ?? "",
    flatsInCompound: compound.flatsInCompound === undefined ? "" : String(compound.flatsInCompound),
    landlordOnSite: yesNo(compound.landlordOnSite),
    wasteDisposal: compound.wasteDisposal ?? "",
    carAccess: yesNo(compound.carAccess),
  };
}

/**
 * What the wizard sends. NULL, NOT UNDEFINED, FOR AN UNANSWERED QUESTION: the
 * wizard holds all five answers, so an answer taken back must clear the
 * column, and "leave it as it was" (undefined) would keep the old one.
 */
export type CompoundPayload = {
  parkingType: ParkingType | null;
  flatsInCompound: number | null;
  landlordOnSite: boolean | null;
  wasteDisposal: WasteDisposal | null;
  carAccess: boolean | null;
};

export function compoundPayload(form: CompoundForm): CompoundPayload {
  const flats = /^\d{1,3}$/.test(form.flatsInCompound.trim()) ? Number(form.flatsInCompound.trim()) : null;
  return {
    parkingType: form.parkingType === "" ? null : form.parkingType,
    flatsInCompound: flats !== null && flats >= 1 && flats <= 500 ? flats : null,
    landlordOnSite: form.landlordOnSite === "" ? null : form.landlordOnSite === "yes",
    wasteDisposal: form.wasteDisposal === "" ? null : form.wasteDisposal,
    carAccess: form.carAccess === "" ? null : form.carAccess === "yes",
  };
}

/** The payload as the five columns, for the one update that writes them. */
export function compoundColumns(payload: Partial<CompoundPayload>): CompoundRow {
  const row: CompoundRow = {};
  if (payload.parkingType !== undefined) row.parking_type = payload.parkingType;
  if (payload.flatsInCompound !== undefined) row.flats_in_compound = payload.flatsInCompound;
  if (payload.landlordOnSite !== undefined) row.landlord_on_site = payload.landlordOnSite;
  if (payload.wasteDisposal !== undefined) row.waste_disposal = payload.wasteDisposal;
  if (payload.carAccess !== undefined) row.car_access = payload.carAccess;
  return row;
}

/**
 * True when a write failed only because the columns are not there yet (the
 * migration has not been applied): Postgres 42703, or PostgREST's PGRST204
 * "column not found in the schema cache". Such a draft saves everything else.
 */
export function isMissingColumnError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/**
 * SERVICED, DEFINED (V-68): what the service charge buys, whether it is a
 * fixed sum or balanced at year end, and what kind of gate the home is behind.
 *
 * "Serviced" is the most common and least meaningful word in a Lagos listing:
 * one landlord means 24-hour diesel, another a gateman and a sweep. On Vallo
 * the word is DERIVED, never typed. A listing is serviced only when its
 * service charge covers power (diesel), water and security, which is the
 * database's generated `is_serviced` column (migration `20260924150400`) and
 * `isServiced` below, the same rule written twice so the browser's drawer
 * count agrees with the read.
 *
 * Read by its own query, like the compound facts (`compound.ts` says why), so
 * a database without the migration shows no service facts rather than no
 * catalogue. Pure and tested.
 */

export const SERVICE_COVERS = [
  "diesel",
  "water",
  "security",
  "estate_dues",
  "waste",
  "cleaning",
  "lift",
] as const;
export type ServiceCover = (typeof SERVICE_COVERS)[number];

export const ESTATE_TYPES = ["gated_estate", "gated_compound", "open_street"] as const;
export type EstateType = (typeof ESTATE_TYPES)[number];

/** The three a charge must cover to earn the word. */
export const SERVICED_REQUIRES: readonly ServiceCover[] = ["diesel", "water", "security"];

export type ServiceFacts = {
  /** What the charge covers, in the fixed list's order. Absent: unanswered. */
  covers?: ServiceCover[];
  /** False: a fixed sum. True: estimated and balanced at year end. */
  reconciled?: boolean;
  estateType?: EstateType;
  /** Derived, never typed: power, water and security all covered. */
  serviced: boolean;
};

export type ServiceRow = {
  /** Read only: whether a charge exists at all decides "Serviced". */
  service_charge_minor?: number | null;
  service_charge_covers?: string[] | null;
  service_charge_reconciled?: boolean | null;
  estate_type?: string | null;
};

export const SERVICE_COLUMNS = "service_charge_covers, service_charge_reconciled, estate_type, service_charge_minor";

/**
 * Serviced: a service charge is stated AND it covers power, water and
 * security. The database's generated `is_serviced` is the same rule.
 */
export function isServiced(
  covers: readonly string[] | undefined | null,
  chargeMinor: number | null | undefined,
): boolean {
  if (!covers || !chargeMinor || chargeMinor <= 0) return false;
  return SERVICED_REQUIRES.every((need) => covers.includes(need));
}

function knownCovers(raw: readonly string[]): ServiceCover[] {
  return SERVICE_COVERS.filter((cover) => raw.includes(cover));
}

/** A row's answers, or null when it gave none. Unknown words are dropped. */
export function readService(row: ServiceRow | null | undefined): ServiceFacts | null {
  if (!row) return null;
  const out: ServiceFacts = { serviced: false };
  if (Array.isArray(row.service_charge_covers)) {
    out.covers = knownCovers(row.service_charge_covers);
    out.serviced = isServiced(out.covers, row.service_charge_minor);
  }
  if (typeof row.service_charge_reconciled === "boolean") out.reconciled = row.service_charge_reconciled;
  if (row.estate_type && (ESTATE_TYPES as readonly string[]).includes(row.estate_type)) {
    out.estateType = row.estate_type as EstateType;
  }
  const answered = out.covers !== undefined || out.reconciled !== undefined || out.estateType !== undefined;
  return answered ? out : null;
}

/** The two drawer filters, both strict about silence. */
export function matchesService(
  service: ServiceFacts | null | undefined,
  filter: { servicedOnly?: boolean; gatedEstate?: boolean },
): boolean {
  if (filter.servicedOnly && !service?.serviced) return false;
  if (filter.gatedEstate && service?.estateType !== "gated_estate") return false;
  return true;
}

/* ------------------------------------------------------------ the wizard */

export type ServiceForm = {
  covers: ServiceCover[];
  /** "" unanswered, "fixed", "reconciled". */
  reconciled: "" | "fixed" | "reconciled";
  estateType: EstateType | "";
  /** True once the lister touched the covers, so an empty list is an answer. */
  coversAnswered: boolean;
};

export const EMPTY_SERVICE_FORM: ServiceForm = {
  covers: [],
  reconciled: "",
  estateType: "",
  coversAnswered: false,
};

export function serviceFormOf(service: ServiceFacts | null | undefined): ServiceForm {
  if (!service) return { ...EMPTY_SERVICE_FORM };
  return {
    covers: service.covers ?? [],
    reconciled: service.reconciled === undefined ? "" : service.reconciled ? "reconciled" : "fixed",
    estateType: service.estateType ?? "",
    coversAnswered: service.covers !== undefined,
  };
}

export type ServicePayload = {
  serviceChargeCovers: ServiceCover[] | null;
  serviceChargeReconciled: boolean | null;
  estateType: EstateType | null;
};

export function servicePayload(form: ServiceForm): ServicePayload {
  return {
    serviceChargeCovers: form.coversAnswered ? knownCovers(form.covers) : null,
    serviceChargeReconciled: form.reconciled === "" ? null : form.reconciled === "reconciled",
    estateType: form.estateType === "" ? null : form.estateType,
  };
}

export function serviceColumns(payload: Partial<ServicePayload>): ServiceRow {
  const row: ServiceRow = {};
  if (payload.serviceChargeCovers !== undefined) row.service_charge_covers = payload.serviceChargeCovers;
  if (payload.serviceChargeReconciled !== undefined) row.service_charge_reconciled = payload.serviceChargeReconciled;
  if (payload.estateType !== undefined) row.estate_type = payload.estateType;
  return row;
}

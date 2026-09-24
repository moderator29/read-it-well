/**
 * THE REPLY PAGE'S MODEL: what `landlord_line_read` returned, made safe to
 * render. Pure, so every state the page can be in is testable without a page.
 *
 * The page has exactly these states, and each has its own designed screen:
 *
 *   open      the question, and its buttons
 *   used      already answered: say so, and when
 *   expired   the four weeks passed: nothing changed, we will ask again
 *   unknown   no such link: show nothing about any property
 *   closed    the landlord line is switched off: nothing changed
 *   failed    we could not read it: our fault, try again
 *
 * Nothing in the model can carry an address, because the read never returns
 * one: `place` and `area` are built by the database from facts only (a
 * neighbourhood from a closed list, else the city, else the state, and the
 * bedrooms and type), never from what the lister typed, and the lister is
 * their public display name.
 */

export type ReplyState = "open" | "used" | "expired" | "unknown" | "closed" | "failed";

export type RentFigures = {
  rentMinor: number | null;
  cautionMinor: number | null;
  serviceMinor: number | null;
  agencyMinor: number | null;
  legalMinor: number | null;
  agreementMinor: number | null;
  totalMinor: number;
  totalStated: boolean;
  currency: string;
  moveIn: string | null;
};

/** A question that exists: open, already answered, or past its four weeks. */
export type QuestionView = {
  state: "open" | "used" | "expired";
  purpose: "vacancy" | "rent";
  place: string;
  listerName: string | null;
  askedAt: string | null;
  answeredAt: string | null;
  answer: string | null;
  rent: RentFigures | null;
};

export type ReplyView = { state: "unknown" } | { state: "closed" } | { state: "failed" } | QuestionView;

function n(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function s(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readReply(raw: unknown): ReplyView {
  if (!raw || typeof raw !== "object") return { state: "failed" };
  const row = raw as Record<string, unknown>;
  const state = row.state;
  if (state === "unknown" || state === "closed") return { state };
  if (state !== "open" && state !== "used" && state !== "expired") return { state: "failed" };

  const purpose = row.purpose === "vacancy" || row.purpose === "rent" ? row.purpose : null;
  const place = s(row.place);
  if (!purpose || !place) return { state: "failed" };

  let rent: RentFigures | null = null;
  if (purpose === "rent") {
    const r = (row.rent ?? {}) as Record<string, unknown>;
    const total = n(r.total_minor);
    if (total === null) return { state: "failed" };
    rent = {
      rentMinor: n(r.rent_minor),
      cautionMinor: n(r.caution_minor),
      serviceMinor: n(r.service_minor),
      agencyMinor: n(r.agency_minor),
      legalMinor: n(r.legal_minor),
      agreementMinor: n(r.agreement_minor),
      totalMinor: total,
      totalStated: r.total_stated === true,
      currency: s(r.currency) ?? "NGN",
      moveIn: s(r.move_in),
    };
  }

  return {
    state,
    purpose,
    place,
    listerName: s(row.lister_name),
    askedAt: s(row.asked_at),
    answeredAt: s(row.answered_at),
    answer: s(row.answer),
    rent,
  };
}

export type RentRowKey = "rent" | "caution" | "service" | "agency" | "legal" | "agreement";

/** The six parts in the order the tenant saw them, dropping the ones never set. */
export function rentRows(rent: RentFigures): { key: RentRowKey; minor: number }[] {
  const parts: [RentRowKey, number | null][] = [
    ["rent", rent.rentMinor],
    ["caution", rent.cautionMinor],
    ["service", rent.serviceMinor],
    ["agency", rent.agencyMinor],
    ["legal", rent.legalMinor],
    ["agreement", rent.agreementMinor],
  ];
  return parts.filter((part): part is [RentRowKey, number] => part[1] !== null && part[1] > 0).map(([key, minor]) => ({ key, minor }));
}

/** What an answer the database accepted means for the thank-you screen. */
export type DoneKey = "available" | "let" | "notInstructed" | "confirmed" | "disputed" | "stopped";

export function doneKeyFor(answer: string): DoneKey | null {
  switch (answer) {
    case "available":
      return "available";
    case "let":
      return "let";
    case "not_instructed":
      return "notInstructed";
    case "confirmed":
      return "confirmed";
    case "disputed":
      return "disputed";
    case "stopped":
      return "stopped";
    default:
      return null;
  }
}

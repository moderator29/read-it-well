/**
 * THE INSPECTION PACK: WHAT A PHONE CARRIES TO THE GATE. V-35.
 *
 * A pack is built while the phone has signal (when the inspection sheet opens
 * on a CONFIRMED inspection, or when the delegate opens the gate link) and is
 * read at the gate with none. It holds exactly what the gate needs and
 * nothing a stranger holding the phone should find useful afterwards:
 *
 *   - the seed, which is useless after the pack expires (the database answers
 *     `expired` and the codes it made name a slot that has passed);
 *   - the listing's AREA AND STATE (never its free-text title, which a lister
 *     can fill with a street), the slot time, and the name of the person
 *     showing it (and of the lister, for a delegate);
 *   - the id of the account it was issued to, so a shared phone shows each
 *     person only their own packs;
 *   - NO ADDRESS. Rule 10 is about share artefacts and a pack is not shared,
 *     but a phone left in a taxi is a kind of sharing, so the pack follows the
 *     same rule.
 *   - no wallet figure, no message, no contact number.
 *
 * It deletes itself 24 hours after the slot, the same moment the database
 * stops releasing the seed (`public.inspection_handshake`).
 *
 * Everything here is pure: a database answer in, a pack out, and the checks a
 * read from IndexedDB needs before it is trusted. The storage itself is in
 * `pack-store.ts`, which is the only file that touches a browser API.
 */

export const PACK_VERSION = 2;

export type PackRole = "shower" | "checker";

export type InspectionPack = {
  version: typeof PACK_VERSION;
  inspectionId: string;
  /** The account the seed was released to. */
  userId: string;
  role: PackRole;
  /** Hex, 40 characters: the 160-bit seed. */
  seed: string;
  slotAt: string;
  expiresAt: string;
  /** "Yaba, LA": area and state only. */
  place: string | null;
  /** Who shows the code: the delegate if one is named, otherwise the lister. */
  shownByName: string | null;
  /** The lister, named beside a delegate so "Tunde is showing this for Chidi". */
  principalName: string | null;
  isDelegate: boolean;
  canNameDelegate: boolean;
  savedAt: string;
};

export type HandshakeAnswer =
  | { state: "ok"; pack: Omit<InspectionPack, "savedAt" | "version"> }
  | { state: "invite"; principalName: string | null; slotAt: string | null; place: string | null }
  | { state: "not_ready" | "expired" | "not_found" | "failed" };

function placeOf(area: unknown, state: unknown): string | null {
  const parts = [area, state].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEED = /^[0-9a-f]{40}$/;

function iso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Read `public.inspection_handshake`'s jsonb answer, trusting no field. */
export function readHandshake(inspectionId: string, data: unknown): HandshakeAnswer {
  if (!data || typeof data !== "object") return { state: "failed" };
  const answer = data as Record<string, unknown>;
  if (answer.status === "not_ready" || answer.status === "expired" || answer.status === "not_found") {
    return { state: answer.status };
  }
  if (answer.status === "invite") {
    return {
      state: "invite",
      principalName: text(answer.principal_name),
      slotAt: iso(answer.slot_at),
      place: placeOf(answer.area, answer.state),
    };
  }
  if (answer.status !== "ok") return { state: "failed" };
  const viewer = typeof answer.viewer === "string" && UUID.test(answer.viewer) ? answer.viewer : null;
  const role = answer.role === "shower" || answer.role === "checker" ? answer.role : null;
  const seed = typeof answer.seed === "string" && SEED.test(answer.seed) ? answer.seed : null;
  const slotAt = iso(answer.slot_at);
  const expiresAt = iso(answer.expires_at);
  if (!viewer || !role || !seed || !slotAt || !expiresAt || !UUID.test(inspectionId)) return { state: "failed" };
  return {
    state: "ok",
    pack: {
      inspectionId,
      userId: viewer,
      role,
      place: placeOf(answer.area, answer.state),
      seed,
      slotAt,
      expiresAt,
      shownByName: text(answer.shown_by_name),
      principalName: text(answer.principal_name),
      isDelegate: answer.is_delegate === true,
      canNameDelegate: answer.can_name_delegate === true,
    },
  };
}

export function buildPack(answer: Extract<HandshakeAnswer, { state: "ok" }>["pack"], now: number): InspectionPack {
  return { version: PACK_VERSION, ...answer, savedAt: new Date(now).toISOString() };
}

export function isExpired(pack: Pick<InspectionPack, "expiresAt">, now: number): boolean {
  const at = Date.parse(pack.expiresAt);
  return !Number.isFinite(at) || at <= now;
}

/** A value read back from IndexedDB, checked before it is believed. */
export function asPack(value: unknown): InspectionPack | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.version !== PACK_VERSION) return null;
  if (typeof v.inspectionId !== "string" || !UUID.test(v.inspectionId)) return null;
  if (typeof v.userId !== "string" || !UUID.test(v.userId)) return null;
  if (v.role !== "shower" && v.role !== "checker") return null;
  if (typeof v.seed !== "string" || !SEED.test(v.seed)) return null;
  const slotAt = iso(v.slotAt);
  const expiresAt = iso(v.expiresAt);
  const savedAt = iso(v.savedAt);
  if (!slotAt || !expiresAt || !savedAt) return null;
  return {
    version: PACK_VERSION,
    inspectionId: v.inspectionId,
    userId: v.userId,
    role: v.role,
    seed: v.seed,
    slotAt,
    expiresAt,
    savedAt,
    place: text(v.place),
    shownByName: text(v.shownByName),
    principalName: text(v.principalName),
    isDelegate: v.isDelegate === true,
    canNameDelegate: v.canNameDelegate === true,
  };
}

/**
 * The packs worth showing, soonest slot first, expired ones gone, and only
 * the ones issued to `owner` (the last account that saved a pack on this
 * phone), so a shared phone never shows one person another's gate code.
 */
export function livePacks(values: readonly unknown[], now: number, owner: string | null): InspectionPack[] {
  if (!owner) return [];
  return values
    .map(asPack)
    .filter((pack): pack is InspectionPack => pack !== null && pack.userId === owner && !isExpired(pack, now))
    .sort((a, b) => Date.parse(a.slotAt) - Date.parse(b.slotAt));
}

/* ----------------------------------------------------------- the check-ins */

export type CheckinResult = "shown" | "match" | "mismatch" | "skipped";

export type QueuedCheckin = {
  inspectionId: string;
  result: CheckinResult;
  observedAt: string;
};

export function asCheckin(value: unknown): QueuedCheckin | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.inspectionId !== "string" || !UUID.test(v.inspectionId)) return null;
  if (v.result !== "shown" && v.result !== "match" && v.result !== "mismatch" && v.result !== "skipped") {
    return null;
  }
  const observedAt = iso(v.observedAt);
  if (!observedAt) return null;
  return { inspectionId: v.inspectionId, result: v.result, observedAt };
}

/** The key a queued check-in is stored under, so a double tap is one row. */
export function checkinKey(checkin: QueuedCheckin): string {
  return `${checkin.inspectionId}:${checkin.result}:${checkin.observedAt}`;
}

import "server-only";

import { resolveSession } from "../actions/session";
import type { EscrowPurpose, EscrowState, Party } from "./copy";

/**
 * READING HELD PAYMENTS, FROM BOTH SIDES.
 *
 * The same rows, two questions:
 *
 *   "what have I set aside"      the payer's list
 *   "what is set aside for me"   the payee's list
 *
 * Both go through `public.escrows` under the CALLER'S OWN RLS, where
 * `escrows_select_party` already limits the answer to rows the caller is a
 * party to. Nothing here narrows on the party ids to enforce anything: the
 * policy does that, and a filter in TypeScript that looked like it was doing
 * the enforcing would be the most dangerous line in the file.
 *
 * NEITHER READ EVER THROWS UPWARDS. An unreadable list and an empty one look
 * identical on a screen and mean opposite things, so the caller is told which
 * it has and the surface says so in words. That is the rule the wallet already
 * applies to its balance.
 *
 * MONEY COMES BACK AS INTEGER KOBO and is never formatted here. Formatting is
 * `copy.ts`'s job and it goes through `formatMoney`, so a raw minor unit
 * cannot reach a reader by way of a query that decided to be helpful.
 */

/** One agreement, as a surface needs it. */
export type HeldPayment = {
  id: string;
  state: EscrowState;
  purpose: EscrowPurpose;
  /** Integer kobo. */
  amountMinor: number;
  /** Integer kobo, and zero at today's rates. */
  commissionMinor: number;
  /** Which side the CALLER is on. Decides every control and every sentence. */
  viewer: Party;
  counterpartyId: string;
  listingId: string | null;
  autoReleaseAt: string | null;
  heldAt: string | null;
  releaseRequestedAt: string | null;
  disputedAt: string | null;
  resolvedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  initiatedAt: string;
  payerConfirmedAt: string | null;
  payeeConfirmedAt: string | null;
  disputeReason: string | null;
  resolutionNote: string | null;
};

/** One piece of evidence. A file or a fact, never an opinion. */
export type HeldPaymentEvidence = {
  id: string;
  kind: "file" | "fact";
  authorId: string;
  /** True when the caller filed it. Decides "you" or the other person. */
  mine: boolean;
  fact: string | null;
  happenedOn: string | null;
  amountMinor: number | null;
  fileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  caption: string | null;
  createdAt: string;
};

export type HeldPaymentList = {
  payments: HeldPayment[];
  /** Those still waiting on somebody. */
  openCount: number;
  readFailed: boolean;
};

export type HeldPaymentDetail = {
  payment: HeldPayment | null;
  evidence: HeldPaymentEvidence[];
  readFailed: boolean;
};

const EMPTY_LIST: HeldPaymentList = { payments: [], openCount: 0, readFailed: false };

const COLUMNS =
  "id,state,purpose,amount_minor,commission_minor,payer_id,payee_id,listing_id," +
  "auto_release_at,held_at,release_requested_at,disputed_at,resolved_at,released_at," +
  "refunded_at,initiated_at,payer_confirmed_at,payee_confirmed_at,dispute_reason,resolution_note";

type Row = Record<string, unknown>;

/** The one shim, for the one table the generated types have not caught up to. */
type UntypedTables = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        order(
          column: string,
          options: { ascending: boolean },
        ): PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

function str(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function num(row: Row, key: string): number {
  const value = row[key];
  return typeof value === "number" ? value : 0;
}

function toPayment(row: Row, callerId: string): HeldPayment | null {
  const id = str(row, "id");
  const state = str(row, "state") as EscrowState | null;
  const purpose = str(row, "purpose") as EscrowPurpose | null;
  const payerId = str(row, "payer_id");
  const payeeId = str(row, "payee_id");
  if (!id || !state || !purpose || !payerId || !payeeId) return null;

  /*
   * A person can be on either side, and on a marketplace where an agent is
   * also a renter they will eventually be on both, in different rows. The
   * viewer is decided per row and never per session.
   */
  const viewer: Party = payerId === callerId ? "payer" : "payee";

  return {
    id,
    state,
    purpose,
    amountMinor: num(row, "amount_minor"),
    commissionMinor: num(row, "commission_minor"),
    viewer,
    counterpartyId: viewer === "payer" ? payeeId : payerId,
    listingId: str(row, "listing_id"),
    autoReleaseAt: str(row, "auto_release_at"),
    heldAt: str(row, "held_at"),
    releaseRequestedAt: str(row, "release_requested_at"),
    disputedAt: str(row, "disputed_at"),
    resolvedAt: str(row, "resolved_at"),
    releasedAt: str(row, "released_at"),
    refundedAt: str(row, "refunded_at"),
    initiatedAt: str(row, "initiated_at") ?? new Date(0).toISOString(),
    payerConfirmedAt: str(row, "payer_confirmed_at"),
    payeeConfirmedAt: str(row, "payee_confirmed_at"),
    disputeReason: str(row, "dispute_reason"),
    resolutionNote: str(row, "resolution_note"),
  };
}

const OPEN_STATES: readonly EscrowState[] = [
  "INITIATED",
  "FUNDED",
  "HELD",
  "RELEASE_REQUESTED",
  "DISPUTED",
];

/** Every held payment the caller is a party to, newest first. */
export async function readHeldPayments(): Promise<HeldPaymentList> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return EMPTY_LIST;

  try {
    const { data, error } = await session.supabase
      .from("escrows")
      .select(COLUMNS)
      .order("initiated_at", { ascending: false })
      .limit(100);

    if (error) return { payments: [], openCount: 0, readFailed: true };

    const payments = ((data ?? []) as unknown as Row[])
      .map((row) => toPayment(row, session.user.id))
      .filter((p): p is HeldPayment => p !== null);

    return {
      payments,
      openCount: payments.filter((p) => OPEN_STATES.includes(p.state)).length,
      readFailed: false,
    };
  } catch {
    return { payments: [], openCount: 0, readFailed: true };
  }
}

/** One held payment and everything filed against it. */
export async function readHeldPayment(id: string): Promise<HeldPaymentDetail> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return { payment: null, evidence: [], readFailed: false };
  }

  try {
    const [row, filed] = await Promise.all([
      session.supabase.from("escrows").select(COLUMNS).eq("id", id).maybeSingle(),
      /*
       * THE GENERATED TYPES DO NOT KNOW ABOUT `escrow_evidence` YET.
       *
       * `lib/supabase/database.types.ts` is generated from the schema and is
       * owned by another session today, which has it open. Regenerating it
       * here would collide with their work for the sake of one table, so this
       * one read goes through a narrow shim that types exactly what it asks
       * for and nothing else. The columns below are checked against the live
       * table, and the row mapper treats every field as unknown anyway.
       *
       * The shim is deliberately ugly so that it is removed rather than
       * copied: when the types are next regenerated this whole cast goes.
       */
      (session.supabase as unknown as UntypedTables)
        .from("escrow_evidence")
        .select(
          "id,kind,author_id,fact,happened_on,amount_minor,file_name,storage_path,mime_type,size_bytes,caption,created_at",
        )
        .eq("escrow_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (row.error) return { payment: null, evidence: [], readFailed: true };

    const payment = row.data ? toPayment(row.data as unknown as Row, session.user.id) : null;
    if (!payment) return { payment: null, evidence: [], readFailed: false };

    /*
     * THE EVIDENCE READ FAILING IS NOT THE SAME AS THERE BEING NONE, and on a
     * dispute that difference decides whether somebody thinks the other side
     * has filed nothing. A failed evidence read fails the whole detail.
     */
    if (filed.error) return { payment, evidence: [], readFailed: true };

    const evidence = ((filed.data ?? []) as unknown as Row[]).map((e): HeldPaymentEvidence => {
      const authorId = str(e, "author_id") ?? "";
      return {
        id: str(e, "id") ?? "",
        kind: (str(e, "kind") as "file" | "fact") ?? "fact",
        authorId,
        mine: authorId === session.user.id,
        fact: str(e, "fact"),
        happenedOn: str(e, "happened_on"),
        amountMinor: typeof e["amount_minor"] === "number" ? (e["amount_minor"] as number) : null,
        fileName: str(e, "file_name"),
        storagePath: str(e, "storage_path"),
        mimeType: str(e, "mime_type"),
        sizeBytes: typeof e["size_bytes"] === "number" ? (e["size_bytes"] as number) : null,
        caption: str(e, "caption"),
        createdAt: str(e, "created_at") ?? new Date(0).toISOString(),
      };
    });

    return { payment, evidence, readFailed: false };
  } catch {
    return { payment: null, evidence: [], readFailed: true };
  }
}

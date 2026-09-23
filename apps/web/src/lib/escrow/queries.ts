import "server-only";

import { resolveSession } from "../actions/session";
import { EVIDENCE_BUCKET, type EscrowPurpose, type EscrowState, type Party } from "./copy";

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
  /**
   * A short-lived link to the file itself, or null when there is no file and
   * when one could not be signed.
   *
   * BOTH PARTIES SEE THE WHOLE FILE, and until this existed neither could see
   * any of it: the row carried a storage path and nothing turned it into
   * something a person could open. The bucket is private and the link is
   * signed under the CALLER'S OWN SESSION, so the storage policy decides who
   * gets one. A filter in TypeScript would look like it was doing that job.
   *
   * NULL IS NOT THE SAME AS ABSENT and the surface says so: a file whose link
   * could not be signed is drawn with its name and a line saying it could not
   * be opened just now, never omitted. Quietly dropping a row from an evidence
   * list is telling one party the other filed nothing.
   */
  href: string | null;
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

/** How long a link to a filed document stays good for. */
const EVIDENCE_LINK_SECONDS = 3600;

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
        href: null,
      };
    });

    await signEvidence(session.supabase, evidence);

    return { payment, evidence, readFailed: false };
  } catch {
    return { payment: null, evidence: [], readFailed: true };
  }
}

/**
 * Turn every filed document's storage path into a link its two parties can open.
 *
 * ONE ROUND TRIP FOR THE WHOLE FILE rather than one per row, which matters on
 * a dispute where a dozen photographs have been filed.
 *
 * IT MUTATES RATHER THAN RETURNING because the order of an evidence list is
 * the order it was filed in, and rebuilding the array to attach a link is how
 * that order quietly becomes the order storage answered in.
 *
 * A FAILURE HERE DOES NOT FAIL THE READ. An unsigned link leaves `href` null
 * and the surface says the file could not be opened; failing the whole detail
 * would hide the facts as well, and the facts are the half that does not
 * depend on storage being awake.
 */
type SignsUrls = {
  storage: {
    from(bucket: string): {
      createSignedUrls(
        paths: string[],
        expiresIn: number,
      ): PromiseLike<{
        data: { path: string | null; signedUrl: string | null; error: string | null }[] | null;
        error: unknown;
      }>;
    };
  };
};

async function signEvidence(
  supabase: SignsUrls,
  evidence: HeldPaymentEvidence[],
): Promise<void> {
  const paths = evidence
    .filter((e) => e.kind === "file" && e.storagePath)
    .map((e) => e.storagePath as string);
  if (paths.length === 0) return;

  try {
    const { data, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrls(paths, EVIDENCE_LINK_SECONDS);
    if (error) return;

    const byPath = new Map<string, string>();
    for (const signed of data ?? []) {
      if (signed.path && signed.signedUrl && !signed.error) {
        byPath.set(signed.path, signed.signedUrl);
      }
    }
    for (const item of evidence) {
      if (item.storagePath) item.href = byPath.get(item.storagePath) ?? null;
    }
  } catch {
    /* Every href stays null and the surface says the file could not be opened. */
  }
}

/** The second shim, for the column the generated types have not caught up to. */
type EscrowsByConversation = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        in(
          column: string,
          values: string[],
        ): {
          order(
            column: string,
            options: { ascending: boolean },
          ): {
            limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }>;
          };
        };
      };
    };
  };
};

/**
 * The agreement this conversation is carrying, if it is carrying one.
 *
 * The thread asks this; the thread does not decide it. `conversation_id` is a
 * column on the agreement, written by the proposal door, so a client cannot
 * claim that a thread owns an agreement it does not. The read runs under the
 * caller's own RLS, so a person who is not a party gets nothing whatever the
 * conversation says.
 *
 * ONLY THE OPEN ONE. A settled agreement stays on `/escrow` where its record
 * belongs; a thread showing last month's finished payment above the composer
 * is a thread showing something nobody has to act on.
 */
export async function readHeldPaymentForConversation(
  conversationId: string,
): Promise<{ payment: HeldPayment | null; readFailed: boolean }> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { payment: null, readFailed: false };

  try {
    /*
     * `escrows.conversation_id` was added on 23 September and the generated
     * types are another session's file today, so this one read goes through
     * the same narrow shim the evidence read uses. The column is real: it is
     * asserted inside its own migration and proved by
     * `scripts/probes/escrow_proposal.sql`.
     */
    const { data, error } = await (session.supabase as unknown as EscrowsByConversation)
      .from("escrows")
      .select(COLUMNS)
      .eq("conversation_id", conversationId)
      .in("state", ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED", "DISPUTED"])
      .order("initiated_at", { ascending: false })
      .limit(1);

    if (error) return { payment: null, readFailed: true };

    const row = ((data ?? []) as unknown as Row[])[0];
    return { payment: row ? toPayment(row, session.user.id) : null, readFailed: false };
  } catch {
    return { payment: null, readFailed: true };
  }
}

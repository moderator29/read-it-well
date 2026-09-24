import "server-only";

/**
 * OPS-12: a signed-in member downloads what Vallo holds about them, as JSON.
 *
 * The privacy notice promises "a copy of the personal data we hold about you"
 * and "your data in a portable format" (NDPA 2023, sections 34 and 38). This is
 * that copy, self-serve.
 *
 * WHOSE ROWS. Every read goes through the member's OWN session client, so RLS
 * applies, AND every read is filtered on the table's owner column to the
 * member's id. The filter is what keeps the file to the member's own rows even
 * for somebody whose role lets RLS show more (an admin exporting their own data
 * gets their own data, not the platform's). Child tables that carry no owner
 * column (wallet entries, assistant messages) are read through the member's
 * own parent rows.
 *
 * WHAT IT DOES NOT HOLD. Files in storage are listed by path on the rows that
 * name them, not embedded. Tables the member's role cannot read at all
 * (security records such as device fingerprints and identity links, which are
 * service-role only) are named in `notIncluded` with the reason, so the file
 * says what it leaves out rather than implying it is everything. A support
 * request (docs/SUBJECT_ACCESS.md) covers those.
 *
 * A table that fails to read is recorded as unavailable in the file; one
 * refusal does not cost the member the rest of their data.
 */

/**
 * Tables with a column naming the member, read with `.eq(column, userId)`.
 * `key` names the table in the file when one table is read twice (as payer
 * and as payee, as guest and as host).
 */
export const OWNED_TABLES: readonly { table: string; column: string; key?: string }[] = [
  { table: "social_profiles", column: "user_id" },
  { table: "user_roles", column: "user_id" },
  { table: "terms_acceptances", column: "user_id" },
  { table: "account_deletion_requests", column: "user_id" },
  { table: "agents", column: "user_id" },
  { table: "agent_applications", column: "user_id" },
  { table: "agent_documents", column: "uploader_id" },
  { table: "businesses", column: "owner_id" },
  { table: "business_transfers", column: "from_user_id", key: "business_transfers_offered" },
  { table: "business_transfers", column: "to_user_id", key: "business_transfers_received" },
  { table: "wallets", column: "user_id" },
  { table: "wallet_pots", column: "user_id" },
  { table: "bank_accounts", column: "user_id" },
  { table: "payment_methods", column: "user_id" },
  { table: "bookings", column: "guest_id" },
  { table: "booking_state_events", column: "actor_id" },
  { table: "booking_refunds", column: "guest_id" },
  { table: "reservations", column: "guest_id" },
  { table: "rent_payments", column: "tenant_id" },
  { table: "escrows", column: "payer_id", key: "escrows_as_payer" },
  { table: "escrows", column: "payee_id", key: "escrows_as_payee" },
  { table: "inspection_requests", column: "requester_id" },
  { table: "inspection_confirmations", column: "user_id" },
  { table: "inspection_reports", column: "author_id" },
  { table: "escrow_evidence", column: "author_id" },
  { table: "conversations", column: "guest_id" },
  { table: "conversations", column: "agent_id", key: "conversations_as_host" },
  { table: "messages", column: "sender_id" },
  { table: "support_tickets", column: "user_id" },
  { table: "support_ticket_messages", column: "sender_id" },
  { table: "ai_conversations", column: "user_id" },
  { table: "bot_invocations", column: "user_id" },
  { table: "notifications", column: "user_id" },
  { table: "push_tokens", column: "user_id" },
  { table: "saved_items", column: "user_id" },
  { table: "saved_places", column: "user_id" },
  { table: "saved_searches", column: "user_id" },
  { table: "price_check_events", column: "user_id" },
  { table: "price_check_watches", column: "user_id" },
  { table: "posts", column: "author_id" },
  { table: "post_reactions", column: "user_id" },
  { table: "post_reposts", column: "user_id" },
  { table: "stories", column: "author_id" },
  { table: "story_comments", column: "author_id" },
  { table: "story_reactions", column: "user_id" },
  { table: "story_comment_reactions", column: "user_id" },
  { table: "reviews", column: "author_id" },
  { table: "reports", column: "reporter_id" },
  { table: "follows", column: "follower_id" },
  { table: "blocks", column: "user_id" },
  { table: "mutes", column: "user_id" },
  { table: "areas", column: "created_by" },
  { table: "area_members", column: "user_id" },
  { table: "area_moderator_applications", column: "user_id" },
  { table: "events", column: "host_id" },
  { table: "event_attendees", column: "user_id" },
  { table: "user_badges", column: "user_id" },
];

/**
 * Tables reached through the member's own parent rows (no owner column of
 * their own), read with `.in(column, <ids of the parent's rows>)`, in order:
 * a parent is always read before its children.
 */
export const CHILD_TABLES: readonly { table: string; column: string; parent: string }[] = [
  { table: "wallet_entries", column: "wallet_id", parent: "wallets" },
  { table: "ai_messages", column: "conversation_id", parent: "ai_conversations" },
  { table: "transactions", column: "booking_id", parent: "bookings" },
  { table: "listings", column: "agent_id", parent: "agents" },
  { table: "listing_photos", column: "listing_id", parent: "listings" },
  { table: "accommodations", column: "business_id", parent: "businesses" },
  { table: "accommodation_photos", column: "accommodation_id", parent: "accommodations" },
  { table: "business_documents", column: "business_id", parent: "businesses" },
  { table: "business_photos", column: "business_id", parent: "businesses" },
];

/**
 * Columns that name a member of staff (or a firm principal) who acted on the
 * member's rows: another person's identity, and which admin decided is not
 * the member's data. Removed from every row. The decision itself stays, and
 * so do `review_notes`, `decision_note` and `resolution_note`: those are the
 * reasons the member is already shown in the app (application status, the
 * listing and business review banners), so they are data about the member.
 */
export const STAFF_KEYS: ReadonlySet<string> = new Set([
  "reviewer_id",
  "reviewed_by",
  "resolved_by",
  "decided_by",
  "hidden_by",
  "verified_by",
  "supply_verified_by",
  "granted_by",
  "revoked_by",
  "admitted_by",
  "suspended_by",
  "lifted_by",
]);

/** `*_by` columns that name a party to the row (the member or their counterpart), kept on purpose. */
export const PARTY_KEYS: ReadonlySet<string> = new Set([
  "created_by",
  "uploaded_by",
  "opened_by",
  "disputed_by",
  "release_requested_by",
]);

/** Held about the member, not in this file. Named, not hidden. */
export const NOT_INCLUDED: readonly { what: string; why: string }[] = [
  {
    what: "known_devices, account_identities",
    why: "Security records (a device fingerprint digest and the canonical form of your email) that only our systems read. Ask support for them.",
  },
  {
    what: "price_check_shares",
    why: "The Price Check cards you shared hold area figures, not data about you, and are read only through their link. Ask support for the list.",
  },
  { what: "email_outbox", why: "Copies of emails queued to you, kept for delivery and then purged. Ask support for them." },
  { what: "Files", why: "Uploaded photographs and documents are listed by their storage path on the rows above, not embedded." },
  {
    what: "Messages you received, support's replies",
    why: "The file holds the messages you sent. The other side's words are theirs; the conversations they belong to are listed so you can read them in the app.",
  },
  {
    what: "Staff identities",
    why: "Which member of staff reviewed a document or resolved a request is removed from the rows. The decision and the reason you were given stay.",
  },
  {
    what: "Firm listings, room types, rates and opening hours",
    why: "Listings held by a firm you belong to, and the configuration of your venues, are the business's records, not personal data about you. Ask support if you need them.",
  },
];

const PAGE = 1000;
const MAX_ROWS_PER_TABLE = 20_000;

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { code?: string; message?: string } | null };

/** The slice of a Supabase client this reads through: `from(t).select("*").eq(c, v).range(a, b)`. */
export type ExportClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { range: (from: number, to: number) => PromiseLike<Result> };
      in: (column: string, values: string[]) => { range: (from: number, to: number) => PromiseLike<Result> };
    };
  };
};

export type TableExport = { rows: Row[]; truncated?: true } | { unavailable: string };

export type DataExport = {
  format: "vallo.data-export.v1";
  generatedAt: string;
  account: { id: string; email: string | null; createdAt: string | null };
  profile: TableExport;
  tables: Record<string, TableExport>;
  notIncluded: typeof NOT_INCLUDED;
};

async function readAll(
  query: (from: number, to: number) => PromiseLike<Result>,
): Promise<TableExport> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS_PER_TABLE; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) return { unavailable: error.code ?? "error" };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) return { rows };
  }
  return { rows, truncated: true };
}

function withoutStaff(t: TableExport): TableExport {
  if (!("rows" in t)) return t;
  const rows = t.rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => !STAFF_KEYS.has(k))));
  return t.truncated ? { rows, truncated: true } : { rows };
}

/** Reads run this many at a time: quick enough for a download, gentle on the pool. */
const PARALLEL = 8;

export async function buildDataExport(
  client: ExportClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  now: Date = new Date(),
): Promise<DataExport> {
  const byOwner = (table: string, column: string, value: string) =>
    readAll((a, b) => client.from(table).select("*").eq(column, value).range(a, b)).then(withoutStaff);
  const byParents = (table: string, column: string, parents: string[]) =>
    parents.length === 0
      ? Promise.resolve<TableExport>({ rows: [] })
      : readAll((a, b) => client.from(table).select("*").in(column, parents).range(a, b)).then(withoutStaff);

  const tables: Record<string, TableExport> = {};
  for (let i = 0; i < OWNED_TABLES.length; i += PARALLEL) {
    const group = OWNED_TABLES.slice(i, i + PARALLEL);
    const read = await Promise.all(group.map(({ table, column }) => byOwner(table, column, user.id)));
    group.forEach(({ table, key }, j) => {
      tables[key ?? table] = read[j] as TableExport;
    });
  }

  const ids = (t: TableExport | undefined) =>
    t && "rows" in t ? t.rows.map((r) => r["id"]).filter((v): v is string => typeof v === "string") : [];
  for (const { table, column, parent } of CHILD_TABLES) {
    tables[table] = await byParents(table, column, ids(tables[parent]));
  }

  return {
    format: "vallo.data-export.v1",
    generatedAt: now.toISOString(),
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at ?? null },
    profile: await byOwner("profiles", "id", user.id),
    tables,
    notIncluded: NOT_INCLUDED,
  };
}

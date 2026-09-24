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

/** Tables with a column naming the member, read with `.eq(column, userId)`. */
export const OWNED_TABLES: readonly { table: string; column: string }[] = [
  { table: "social_profiles", column: "user_id" },
  { table: "user_roles", column: "user_id" },
  { table: "terms_acceptances", column: "user_id" },
  { table: "account_deletion_requests", column: "user_id" },
  { table: "agents", column: "user_id" },
  { table: "agent_applications", column: "user_id" },
  { table: "agent_documents", column: "uploader_id" },
  { table: "businesses", column: "owner_id" },
  { table: "wallets", column: "user_id" },
  { table: "wallet_pots", column: "user_id" },
  { table: "bank_accounts", column: "user_id" },
  { table: "payment_methods", column: "user_id" },
  { table: "bookings", column: "guest_id" },
  { table: "booking_refunds", column: "guest_id" },
  { table: "reservations", column: "guest_id" },
  { table: "rent_payments", column: "tenant_id" },
  { table: "inspection_requests", column: "requester_id" },
  { table: "inspection_confirmations", column: "user_id" },
  { table: "inspection_reports", column: "author_id" },
  { table: "escrow_evidence", column: "author_id" },
  { table: "conversations", column: "guest_id" },
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
  { table: "area_members", column: "user_id" },
  { table: "area_moderator_applications", column: "user_id" },
  { table: "event_attendees", column: "user_id" },
  { table: "user_badges", column: "user_id" },
];

/** Held about the member, not readable with their own session. Named, not hidden. */
export const NOT_INCLUDED: readonly { what: string; why: string }[] = [
  {
    what: "known_devices, account_identities",
    why: "Security records (a device fingerprint digest and the canonical form of your email) that only our systems read. Ask support for them.",
  },
  { what: "email_outbox", why: "Copies of emails queued to you, kept for delivery and then purged. Ask support for them." },
  { what: "Files", why: "Uploaded photographs and documents are listed by their storage path on the rows above, not embedded." },
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

export async function buildDataExport(
  client: ExportClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  now: Date = new Date(),
): Promise<DataExport> {
  const byOwner = (table: string, column: string, value: string) =>
    readAll((a, b) => client.from(table).select("*").eq(column, value).range(a, b));
  const byParents = (table: string, column: string, parents: string[]) =>
    parents.length === 0
      ? Promise.resolve<TableExport>({ rows: [] })
      : readAll((a, b) => client.from(table).select("*").in(column, parents).range(a, b));

  const tables: Record<string, TableExport> = {};
  for (const { table, column } of OWNED_TABLES) {
    tables[table] = await byOwner(table, column, user.id);
  }

  const ids = (t: TableExport | undefined) =>
    t && "rows" in t ? t.rows.map((r) => r["id"]).filter((v): v is string => typeof v === "string") : [];
  tables["wallet_entries"] = await byParents("wallet_entries", "wallet_id", ids(tables["wallets"]));
  tables["ai_messages"] = await byParents("ai_messages", "conversation_id", ids(tables["ai_conversations"]));

  return {
    format: "vallo.data-export.v1",
    generatedAt: now.toISOString(),
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at ?? null },
    profile: await byOwner("profiles", "id", user.id),
    tables,
    notIncluded: NOT_INCLUDED,
  };
}

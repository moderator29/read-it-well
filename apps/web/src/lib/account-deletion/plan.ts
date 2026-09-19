import { STORAGE_BUCKETS, type StorageBucket } from "./constants";

/**
 * THE LEDGER: every table the purge touches, and which side of the line it
 * falls on.
 *
 * This file is the single written statement of what a deletion does. The
 * privacy document, the copy on the deletion screen and
 * `supabase/migrations/20260919160100_b5_the_purge_runs_in_one_transaction.sql`
 * are all written from it, and `plan.test.ts` reads the migration and asserts
 * that every table named here is actually named there. A promise in a legal
 * document that no code enforces is the failure this file exists to prevent,
 * and F-17 is precisely that failure: the privacy policy already promised a
 * deletion the product could not perform.
 *
 * WHY ANYTHING SURVIVES AT ALL. Vallo is SCUML registered. Nigerian
 * anti-money-laundering obligations require transaction records to be
 * retained, so destroying the financial spine would be unlawful rather than
 * thorough. What survives is stripped of every field that names a person and
 * keyed to an opaque uuid that no longer resolves to anybody.
 */

export type DestroyedTable = {
  table: string;
  /** Plain words, for the privacy document and the report. */
  note: string;
};

/** Removed outright, or emptied where removing it would take a stranger's words. */
export const DESTROYED_TABLES: readonly DestroyedTable[] = [
  { table: "posts", note: "their posts and replies, emptied instead of deleted where somebody else had replied under them" },
  { table: "post_media", note: "the pictures on those posts" },
  { table: "post_reactions", note: "what they liked" },
  { table: "post_reposts", note: "what they reposted" },
  { table: "stories", note: "their stories" },
  { table: "story_comments", note: "their comments, emptied instead of deleted where somebody else had replied under them" },
  { table: "story_reactions", note: "what they liked on a story" },
  { table: "story_comment_reactions", note: "what they liked on a comment" },
  { table: "saved_items", note: "saved properties" },
  { table: "saved_places", note: "saved stays and restaurants" },
  { table: "saved_searches", note: "saved searches and their alerts" },
  { table: "follows", note: "who they followed and who followed them" },
  { table: "blocks", note: "blocks in both directions" },
  { table: "mutes", note: "mutes" },
  { table: "notifications", note: "every notification" },
  { table: "ai_conversations", note: "their conversations with the assistant" },
  { table: "bot_invocations", note: "what they asked the assistant in a thread" },
  { table: "area_members", note: "area membership" },
  { table: "area_moderator_applications", note: "moderator applications" },
  { table: "event_attendees", note: "events they said they were coming to" },
  { table: "support_tickets", note: "support tickets they raised, and the replies on them" },
  { table: "user_badges", note: "badges" },
  { table: "user_roles", note: "roles" },
  { table: "payment_methods", note: "saved cards" },
  { table: "bank_accounts", note: "saved bank accounts" },
  { table: "payout_accounts", note: "payout accounts" },
  { table: "agent_documents", note: "identity and agency documents, rows and objects" },
  { table: "business_documents", note: "host and business documents, rows and objects" },
  { table: "listing_photos", note: "photographs they uploaded" },
  { table: "listing_videos", note: "films they uploaded" },
  { table: "message_attachments", note: "pictures they sent in a thread" },
];

export type RetainedTable = {
  table: string;
  /** What is removed from the row, in plain words. */
  stripped: string;
  /** Why it may not simply be deleted. */
  because: string;
};

/**
 * Kept, pseudonymised. The subject becomes an opaque uuid with no name, no
 * address and no telephone number attached to it anywhere.
 */
export const RETAINED_TABLES: readonly RetainedTable[] = [
  {
    table: "bookings",
    stripped: "guest name, telephone number and address",
    because: "a booking is a financial record and the foreign key onto it is on delete restrict",
  },
  {
    table: "reservations",
    stripped: "the note left for the restaurant",
    because: "the restaurant's own record of a table it held",
  },
  {
    table: "wallets",
    stripped: "nothing: the row is an amount and a uuid",
    because: "a wallet is a ledger and the foreign key onto it is on delete restrict",
  },
  {
    table: "wallet_entries",
    stripped: "any address, name or account number left in the metadata",
    because: "the movements themselves are the record the law requires",
  },
  {
    table: "transactions",
    stripped: "nothing: the row names a booking, not a person",
    because: "the processor's side of the same record",
  },
  {
    table: "ledger_entries",
    stripped: "nothing: the row names a booking, not a person",
    because: "how a payment was split",
  },
  {
    table: "platform_revenue",
    stripped: "nothing: the row names a reference, not a person",
    because: "what the platform earned",
  },
  {
    table: "escrows",
    stripped: "nothing: both parties are uuids",
    because: "money held between two people, and the foreign keys are on delete restrict",
  },
  {
    table: "rent_payments",
    stripped: "nothing: both parties are uuids",
    because: "a tenancy payment, and the foreign keys are on delete restrict",
  },
  {
    table: "booking_refunds",
    stripped: "nothing: the row is amounts and a reason code",
    because: "what came back and why",
  },
  {
    table: "booking_state_events",
    stripped: "nothing: the actor is a uuid",
    because: "the trail of how a booking reached its state",
  },
  {
    table: "inspection_requests",
    stripped: "the note they wrote",
    because: "the other side's record of a viewing that was arranged",
  },
  {
    table: "inspection_confirmations",
    stripped: "nothing: the row is a uuid and a timestamp",
    because: "the confirmation an escrow release was decided on",
  },
  {
    table: "reviews",
    stripped: "the author label, which becomes Deleted account",
    because: "a review belongs to the property as much as to its author",
  },
  {
    table: "messages",
    stripped: "nothing: the sender becomes an anonymous reference",
    because: "the other person's thread must stay readable, and sender_id is NOT NULL",
  },
  {
    table: "agent_applications",
    stripped: "name, telephone number, address, identity document type and number, bank details",
    because: "the record that a verification check happened",
  },
  {
    table: "agents",
    stripped: "the agency display name",
    because: "listings hang off it and bookings hang off those",
  },
  {
    table: "businesses",
    stripped: "the representative's name and number, CAC number, registered name and tax identifier",
    because: "the business keeps trading under its own name, and it may not reach this point still on the market: owning one that a stranger can transact against is a precondition, cleared by transferring it to somebody who accepted it or by closing it",
  },
  {
    table: "events",
    stripped: "nothing: the host becomes an anonymous reference, exactly as a message sender does",
    because: "a meetup that already happened is history, and the evening belongs to everybody who was there; the host name every surface draws comes from profiles, which this purge scrubs to Deleted account",
  },
  {
    table: "profiles",
    stripped: "first name, surname, nickname, telephone number, photograph, place, occupation, interests and every preference",
    because: "the row is the anonymous reference every retained record points at",
  },
  {
    table: "social_profiles",
    stripped: "handle, biography, pronouns, link, cover, banner and photograph",
    because: "the row carries counts other people's timelines are drawn from",
  },
];

export type ClosedTable = {
  table: string;
  /** What is resolved, in plain words. */
  resolved: string;
  /** Who is told, because a commitment closed in silence is the failure. */
  notice: string;
};

/**
 * RESOLVED RATHER THAN DESTROYED OR KEPT, which is the third thing a purge can
 * do to a row and the one the first deletion build did not have.
 *
 * The founder's principle: past records anonymise and stay, because they are
 * history, but FUTURE COMMITMENTS MUST BE RESOLVED BEFORE THE ACCOUNT CAN GO.
 * A row in this list is neither destroyed nor kept as it was: it is brought to
 * a close, and somebody is told.
 *
 * `supabase/migrations/20260919210100_p1_a_future_event_is_cancelled_with_notice.sql`
 * is what performs it, in its own transaction, immediately before the purge,
 * and `plan.test.ts` reads that migration and asserts every table named here
 * is actually named there.
 *
 * WHY A FUTURE EVENT IS NOT ALSO A BLOCKER, which was the author's call to
 * argue: an event carries no money by the deliberate design of its own
 * migration, it has exactly one host so there is nobody to hand it to, and its
 * cancellation is complete and automatic because the trigger that writes
 * `cancelled_at` is the same one that tells every attendee. Blocking would
 * make somebody wait out their last meetup before they could exercise a data
 * protection right, and the only act available to them would be the one the
 * purge can perform for them. A cancellation with notice IS the resolution.
 * A business blocks and an event does not, and the difference is that a
 * stranger can hand a business money.
 */
export const CLOSED_TABLES: readonly ClosedTable[] = [
  {
    table: "events",
    resolved: "every event of theirs that has not happened yet is cancelled; past events are left exactly as they are",
    notice: "everybody going and everybody waitlisted, by name of the event and the reason",
  },
  {
    table: "reservations",
    resolved: "every table still to come at a restaurant of theirs is cancelled",
    notice: "the guest who booked it",
  },
  {
    table: "accommodations",
    resolved: "anything of theirs somehow still published is taken off the market",
    notice: "nobody: this should always be zero, and a count above zero is an alert for the desk rather than a message to a person",
  },
  {
    table: "business_transfers",
    resolved: "an offer of a business made TO them lapses, because it can never be accepted now; an offer they made to somebody else is left open, because it is the one door that can still put a living owner behind a business",
    notice: "the owner who made the offer",
  },
];

/** Every bucket the purge sweeps. Same list the constants export, named here so the ledger is complete. */
export const PURGED_BUCKETS: readonly StorageBucket[] = STORAGE_BUCKETS;

/**
 * The member's new query: what they can choose and what counts as complete.
 *
 * Client-safe and pure. The form draws from it, the server action validates
 * against it, and the tests pin it, so the three never disagree about which
 * topics exist or which records a topic can be linked to.
 *
 * The stored topic is always a code from `SUPPORT_TOPICS`, the list the admin
 * queue grades and labels by. The titles here are the short words for the
 * in-app picker; the contact form keeps its own sentence-length labels.
 */

import { SUPPORT_TOPICS, type SupportTopic } from "../trust/support-topics";

export type QueryKind = "question" | "problem";

export const QUERY_KINDS: Record<QueryKind, { title: string; lede: string }> = {
  question: {
    title: "Ask a question",
    lede: "Something you want to know before or after you act.",
  },
  problem: {
    title: "Report a problem",
    lede: "Something went wrong and a person needs to look at it.",
  },
};

export type TopicChoice = {
  code: SupportTopic;
  /** Records worth offering to link for this topic, most likely first. Empty offers none. */
  records: RelatedKind[];
};

/**
 * In the order a member scans for them. Safety is last in the list but drawn
 * apart, because a member who needs it should not have to read past eight
 * ordinary topics to find it. Each one's title and hint are the reader's
 * (`experienceInbox.support.form.topicChoices`).
 */
export const TOPIC_CHOICES: readonly TopicChoice[] = [
  { code: "account", records: [] },
  { code: "verification", records: [] },
  { code: "listing", records: ["listing"] },
  { code: "payment", records: ["payment", "booking", "agreement"] },
  { code: "inspection", records: ["inspection"] },
  { code: "agreement", records: ["agreement"] },
  { code: "booking", records: ["booking"] },
  { code: "safety", records: ["booking", "listing", "inspection", "agreement"] },
  { code: "other", records: [] },
];

export function topicChoice(code: string | null | undefined): TopicChoice | undefined {
  return TOPIC_CHOICES.find((topic) => topic.code === code);
}

export type RelatedKind = "booking" | "agreement" | "listing" | "payment" | "inspection";

export const RELATED_KINDS: readonly RelatedKind[] = ["booking", "agreement", "listing", "payment", "inspection"];

export const RELATED_KIND_TITLE: Record<RelatedKind, string> = {
  booking: "Bookings",
  agreement: "Agreements",
  listing: "Your listings",
  payment: "Payments",
  inspection: "Inspections",
};

/** One record of the kind, for "Booking: Lekki flat, 3 to 5 Oct". */
export const RELATED_KIND_NOUN: Record<RelatedKind, string> = {
  booking: "Booking",
  agreement: "Agreement",
  listing: "Listing",
  payment: "Payment",
  inspection: "Inspection",
};

/** One of the member's own records, as the picker lists it and the ticket stores it. */
export type RelatedRecord = {
  kind: RelatedKind;
  id: string;
  /** What the record is, in a few words: "Stay at Lekki Phase 1, 3 to 5 Oct". */
  label: string;
  /** A second line: a status, an amount, a reference. */
  sub?: string;
};

/** The records a topic offers, in the topic's order, or everything when the topic names none. */
export function recordsForTopic(topic: string | null | undefined, records: readonly RelatedRecord[]): RelatedRecord[] {
  const choice = topicChoice(topic);
  if (!choice || choice.records.length === 0) return [];
  const rank = new Map(choice.records.map((kind, index) => [kind, index]));
  return records
    .filter((record) => rank.has(record.kind))
    .sort((a, b) => (rank.get(a.kind) ?? 0) - (rank.get(b.kind) ?? 0));
}

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 4000;

export type QueryDraft = {
  kind: QueryKind;
  topic: SupportTopic | null;
  related: { kind: RelatedKind; id: string; label: string } | null;
  body: string;
};

export const EMPTY_DRAFT: QueryDraft = { kind: "question", topic: null, related: null, body: "" };

export type DraftErrors = Partial<Record<"topic" | "body", string>>;

/** What is missing before the query can be sent, in words for the field. */
export function draftErrors(draft: QueryDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.topic || !(SUPPORT_TOPICS as readonly string[]).includes(draft.topic)) {
    errors.topic = "Choose what it is about.";
  }
  const body = draft.body.trim();
  if (body.length < DESCRIPTION_MIN) errors.body = "Tell us a little more, at least a sentence.";
  else if (body.length > DESCRIPTION_MAX) errors.body = "Keep it under 4,000 characters.";
  return errors;
}

/**
 * A draft read back from this device, trusted for nothing.
 *
 * The form keeps what the member typed in local storage so a reload, a lost
 * connection or a closed tab never costs them the description. What comes
 * back is whatever that storage holds, so every field is checked again.
 */
export function parseDraft(raw: string | null): QueryDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const v = value as Record<string, unknown>;
    const kind: QueryKind = v.kind === "problem" ? "problem" : "question";
    const topic =
      typeof v.topic === "string" && (SUPPORT_TOPICS as readonly string[]).includes(v.topic)
        ? (v.topic as SupportTopic)
        : null;
    const body = typeof v.body === "string" ? v.body.slice(0, DESCRIPTION_MAX) : "";
    let related: QueryDraft["related"] = null;
    const r = v.related as Record<string, unknown> | null | undefined;
    if (
      r &&
      typeof r === "object" &&
      typeof r.id === "string" &&
      typeof r.label === "string" &&
      (RELATED_KINDS as readonly string[]).includes(r.kind as string)
    ) {
      related = { kind: r.kind as RelatedKind, id: r.id, label: r.label.slice(0, 200) };
    }
    return { kind, topic, related, body };
  } catch {
    return null;
  }
}

/**
 * The transcript a "Talk to a person" hand-over carries into the ticket.
 *
 * Every turn, oldest first, labelled by who said it, so the person picking the
 * ticket up reads the whole exchange rather than the last line. Capped at the
 * ticket message limit by dropping the oldest turns first and saying so: the
 * most recent turns are the ones that explain why the member asked for a person.
 */
export function chatTranscript(
  turns: readonly { role: "user" | "assistant"; text: string }[],
  max = DESCRIPTION_MAX,
): string {
  const lines = turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => `${turn.role === "user" ? "Member" : "AI helper"}: ${turn.text.trim()}`);
  if (lines.length === 0) return "Asked for a person from the support chat before writing anything.";
  const head = "Conversation with the AI helper before this ticket:";
  const cut = "(Earlier messages left out for length.)";
  let kept = lines;
  const size = (list: string[], trimmed: boolean) =>
    [head, ...(trimmed ? [cut] : []), ...list].join("\n").length;
  while (kept.length > 1 && size(kept, kept.length < lines.length) > max) kept = kept.slice(1);
  const text = [head, ...(kept.length < lines.length ? [cut] : []), ...kept].join("\n");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

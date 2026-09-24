import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n";

/**
 * THE LINE ABOUT THE OTHER PERSON IN A THREAD (V-23). Pure.
 *
 * `public.thread_counterpart_facts` answers, for a party to a conversation,
 * the dated facts Vallo holds about the other party. This turns them into the
 * short phrases the header prints, in a fixed order, and a null (or a false,
 * or a zero) prints NOTHING: no "not verified", no "no phone", no "0
 * viewings". The claims rule is the whole design.
 */

export type CounterpartFacts = {
  identitySeenAt: string | null;
  identityNimc: boolean;
  memberSince: string | null;
  phoneConfirmed: boolean;
  viewingsArranged: number;
};

export type PersonFact = { key: "identity" | "since" | "phone" | "viewings"; text: string };

function valid(iso: string | null): iso is string {
  return typeof iso === "string" && Number.isFinite(Date.parse(iso));
}

export function personFacts(
  facts: CounterpartFacts | null,
  copy: Dictionary["trustVisible"]["person"],
  locale: Locale,
): PersonFact[] {
  if (!facts) return [];
  const out: PersonFact[] = [];
  if (valid(facts.identitySeenAt)) {
    const date = formatDate(new Date(facts.identitySeenAt), locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
    out.push({ key: "identity", text: (facts.identityNimc ? copy.identityNimc : copy.identitySeen).replace("{date}", date) });
  }
  if (valid(facts.memberSince)) {
    const month = formatDate(new Date(facts.memberSince), locale, {
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    });
    out.push({ key: "since", text: copy.memberSince.replace("{month}", month) });
  }
  if (facts.phoneConfirmed) out.push({ key: "phone", text: copy.phoneConfirmed });
  const n = Math.trunc(facts.viewingsArranged);
  if (n === 1) out.push({ key: "viewings", text: copy.viewingsOne });
  else if (n > 1) out.push({ key: "viewings", text: copy.viewingsMany.replace("{count}", formatNumber(n, locale)) });
  return out;
}

/** The RPC's row, narrowed, or null when it answered nothing usable. */
export function counterpartFactsFrom(row: unknown): CounterpartFacts | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    identitySeenAt: typeof r.identity_seen_at === "string" ? r.identity_seen_at : null,
    identityNimc: r.identity_nimc === true,
    memberSince: typeof r.member_since === "string" ? r.member_since : null,
    phoneConfirmed: r.phone_confirmed === true,
    viewingsArranged: typeof r.viewings_arranged === "number" ? r.viewings_arranged : 0,
  };
}

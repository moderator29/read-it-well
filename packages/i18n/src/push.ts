import type { Locale } from "./core";
import { PUSH_SUMMARY, PUSH_TEXT_RULES, type PushTextRule } from "./locales/drafts/push-text";

/**
 * A11: PUSH TEXT IN THE RECIPIENT'S LANGUAGE, RENDERED AT SEND TIME.
 *
 * The database writes each notification once, in English, and that row stays
 * the record (the in-app list, support, the audit). The push drain passes the
 * English title and body through here with the recipient's
 * `profiles.settings.locale` and sends what comes back. Pure: no client, no
 * environment.
 *
 * All or nothing. A rule applies only when the title matches exactly AND the
 * body matches its anchored pattern (or is empty for a rule with no body);
 * otherwise the English title and body go out together. So a lock screen is
 * never half one language, and any English copy change in the database simply
 * falls back to English until the catalogue follows it.
 *
 * The Hausa, Yoruba and Igbo strings are MACHINE DRAFTS awaiting native
 * review (locales/drafts/push-text.ts, PUSH_TEXT_REVIEW).
 */

export type PushText = { title: string; body: string | null };

function fillCaptures(template: string, captures: readonly string[]): string {
  return template.replace(/\{b(\d+)\}/g, (match, index: string) => {
    const value = captures[Number(index) - 1];
    return value === undefined ? match : value;
  });
}

/** The rule that fits this English title and body, or null. */
export function pushRuleFor(text: PushText): { rule: PushTextRule; captures: string[] } | null {
  const body = text.body ?? "";
  for (const rule of PUSH_TEXT_RULES) {
    if (rule.title !== text.title) continue;
    if (rule.body === null) {
      if (body.trim().length === 0) return { rule, captures: [] };
      continue;
    }
    const match = rule.body.exec(body);
    if (match) return { rule, captures: match.slice(1).map((value) => value ?? "") };
  }
  return null;
}

/** The title and body in `locale`, or the English ones unchanged. */
export function localizePush(text: PushText, locale: Locale): PushText {
  if (locale === "en") return text;
  const found = pushRuleFor(text);
  if (!found) return text;
  const copy = found.rule.copy[locale];
  if (!copy) return text;
  return {
    title: copy.title,
    body: found.rule.body === null ? text.body : fillCaptures(copy.body, found.captures),
  };
}

/** The folded-backlog summary ("3 things happened while you were away") in `locale`. */
export function pushSummary(count: number, locale: Locale): string {
  const template = PUSH_SUMMARY[locale] ?? PUSH_SUMMARY.en ?? "{count}";
  return template.replace("{count}", String(count));
}

export { PUSH_TEXT_RULES, PUSH_TEXT_REVIEW } from "./locales/drafts/push-text";

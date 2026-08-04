import type { Metadata } from "next";
import { getDictionary, type Dictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getMessageFlags, type FlagView, type PartyRole } from "@/lib/admin/queries";
import { FlagDecision } from "../_components/AdminActions";
import { fill, type AdminCommon } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.flags.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

type FlagCopy = Dictionary["admin"]["flags"];

/**
 * The flag queue: the only place the safety scanner is visible.
 *
 * The trigger in the database files a flag on every message carrying a ten
 * digit run or payment talk, and nothing in the app ever tells the sender. Here
 * a reviewer sees the matched fragment, the run-up to it in the conversation,
 * and takes one of two real decisions: clear it, or raise a risk alert that
 * keeps the case open on another queue.
 */
function Fragment({ text }: { text: string }) {
  return (
    <code
      className="nf-numeric rounded-[var(--nf-radius-xs)] px-1.5 py-0.5 text-[0.8125rem] font-semibold"
      style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
    >
      {text}
    </code>
  );
}

/**
 * "The scan matched X in a message from the guest", with the fragment rendered
 * inline as code. The sentence is one dictionary entry rather than two halves,
 * so a language that puts the fragment somewhere else keeps its word order:
 * the copy is split on the placeholder, not on English grammar.
 */
function MatchLine({
  copy,
  matched,
  role,
}: {
  copy: FlagCopy;
  matched: string;
  role: string;
}) {
  // Split on the placeholder itself, never on a space: the halves either side
  // of the fragment are whatever the sentence puts there in this language.
  const [before = "", after = ""] = copy.matched.split("{fragment}");
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-[var(--nf-content-secondary)]">
      <UiIcon name="search" size={16} className="shrink-0" />
      {fill(before, { role }).trim()}
      <Fragment text={matched} />
      {fill(after, { role }).trim()}
    </p>
  );
}

function FlagCard({
  flag,
  copy,
  common,
  ui,
  locale,
}: {
  flag: FlagView;
  copy: FlagCopy;
  common: AdminCommon;
  ui: AdminUi;
  locale: string;
}) {
  const roleLabel: Record<PartyRole, string> = copy.role;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ui.StatusChip status={flag.status} />
        <ui.StatusChip label={copy.reason[flag.reason]} tone="info" />
        <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
          {ui.when(flag.createdAt)}
        </span>
      </div>

      <MatchLine
        copy={copy}
        matched={flag.matched}
        role={roleLabel[flag.senderRole].toLocaleLowerCase(locale)}
      />

      <div className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-raised)] p-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
          {copy.context}
        </p>
        <ul className="mt-2 space-y-2">
          {flag.context.length === 0 && (
            <li className="text-[0.8125rem] text-[var(--nf-content-secondary)]">{flag.body}</li>
          )}
          {flag.context.map((line) => (
            <li
              key={line.id}
              className="rounded-[var(--nf-radius-sm)] p-2"
              style={
                line.flagged
                  ? {
                      background: "var(--nf-state-warning-surface)",
                      border: "1px solid color-mix(in oklab, var(--nf-state-warning) 40%, transparent)",
                    }
                  : { background: "color-mix(in oklab, var(--nf-content-primary) 5%, transparent)" }
              }
            >
              <span className="flex items-center gap-2">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
                  {roleLabel[line.role]}
                </span>
                <span className="text-[0.6875rem] text-[var(--nf-content-muted)]">
                  {ui.when(line.createdAt)}
                </span>
                {line.flagged && (
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-state-warning)]">
                    {copy.flagged}
                  </span>
                )}
              </span>
              <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed text-[var(--nf-content-primary)]">
                {line.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {flag.status === "open" ? (
        <FlagDecision flagId={flag.id} copy={copy} common={common} />
      ) : (
        <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
          {copy.reviewed} {common.inAuditLog}
        </p>
      )}
    </li>
  );
}

export default async function AdminFlagsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.flags;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const flags = await getMessageFlags();

  if (flags.state !== "ok") {
    return (
      <div className="mx-auto max-w-3xl">
        <ui.QueueHeader title={copy.title} lede={copy.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const open = flags.data.filter((flag) => flag.status === "open");
  const reviewed = flags.data.filter((flag) => flag.status !== "open");

  return (
    <div className="mx-auto max-w-3xl">
      <ui.QueueHeader title={copy.title} lede={copy.lede} count={open.length} />

      {open.length === 0 ? (
        <ui.QueueEmpty title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <ul className="space-y-3">
          {open.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              copy={copy}
              common={common}
              ui={ui}
              locale={locale}
            />
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <section className="mt-8">
          <h2 className="nf-h3 mb-3 text-[1rem]">{common.recentlyReviewed}</h2>
          <ul className="space-y-3">
            {reviewed.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                copy={copy}
                common={common}
                ui={ui}
                locale={locale}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

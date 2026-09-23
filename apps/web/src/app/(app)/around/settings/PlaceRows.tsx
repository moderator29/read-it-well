import Link from "next/link";
import { formatNumber, type Locale } from "@vallo/i18n";
import type { AreaProposal, AreaSummary } from "@/lib/social/areas-queries";
import { AREA_COPY, AREA_KIND_LABEL } from "@/lib/social/areas-schema";
import { JoinButton } from "../JoinButton";

/**
 * The rows of `/around/settings`: a suggestion still waiting, one we
 * answered, and a place with its join control. Lifted out of the page so the
 * orphans sweep's fixture harness draws the real rows; the page still reads
 * every list and decides what shows.
 */
export function ProposalsWaiting({ proposals }: { proposals: AreaProposal[] }) {
  if (proposals.length === 0) return null;
  const openProposals = proposals;
  return (
      <section className="mb-xl">
      <h2 className="mb-sm text-[length:var(--nf-text-overline)] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
        Waiting on us
      </h2>
      <ul className="flex flex-col gap-xs">
        {openProposals.map((proposal) => (
          <li
            key={proposal.id}
            className="nf-card flex items-center gap-sm p-md"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                {proposal.name}
              </p>
              <p className="mt-3xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                {proposal.city} &middot; you suggested this
              </p>
            </div>
            <span className="shrink-0 rounded-[var(--nf-radius-control)] border border-[var(--nf-border-default)] px-sm py-2xs text-[length:var(--nf-text-overline)] font-semibold text-[var(--nf-content-muted)]">
              With us
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-sm text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
        {AREA_COPY.proposePending}
      </p>
    </section>
  );
}

export function ProposalsAnswered({ proposals }: { proposals: AreaProposal[] }) {
  if (proposals.length === 0) return null;
  const answered = proposals;
  return (
      <section className="mb-xl">
        <h2 className="mb-sm text-[length:var(--nf-text-overline)] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          We came back to you
        </h2>
        <ul className="flex flex-col gap-xs">
          {answered.map((proposal) => (
            <li key={proposal.id} className="nf-card p-md">
              <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                {proposal.name}
              </p>
              <p className="mt-2xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
                {proposal.decisionNote ??
                  "We could not open this one. You can suggest another at any time."}
              </p>
            </li>
          ))}
        </ul>
      </section>
  );
}

export function AreaRow({
  area,
  joined,
  signedIn,
  locale,
}: {
  area: AreaSummary;
  joined: boolean;
  signedIn: boolean;
  /* The count below was formatted with a hardcoded "en-NG". All four locales
     this platform ships group with commas and use Latin digits, so the string
     is identical today; see KNOWN_GAPS. It is threaded here because the page
     already resolves the locale one call away, and because the row is the
     component that renders the figure, which is where the tag has to be. */
  locale: Locale;
}) {
  return (
    <li className="nf-card flex items-start gap-sm p-md">
      {/*
        Nothing in this row truncates, and that is deliberate rather than
        untidy. A place name is a proper noun, and "Magodo Phase 2 Es..." is not
        a place anybody can recognise. The line under it carries a count and the
        word that gives the count its meaning, which is the one thing the house
        rules say never to cut. The blurb is capped at 200 characters by the
        schema, so showing it whole is three lines at 390px, and three honest
        lines beat one line ending in a full stop somebody else did not write.
        The row wraps instead.
      */}
      <Link href={`/around/${area.slug}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-xs gap-y-2xs">
          <p className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
            {area.name}
          </p>
          {area.status === "PAUSED" ? (
            <span className="shrink-0 rounded-[var(--nf-radius-control)] border border-[var(--nf-border-default)] px-xs py-3xs text-[length:var(--nf-text-overline)] font-semibold uppercase tracking-wider text-[var(--nf-content-muted)]">
              Paused
            </span>
          ) : null}
        </div>
        <p className="mt-3xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_KIND_LABEL[area.kind]} &middot; {area.city} &middot;{" "}
          <span className="nf-numeric">{formatNumber(area.memberCount, locale)}</span>{" "}
          {area.memberCount === 1 ? "member" : "members"}
        </p>
        {area.blurb ? (
          <p className="mt-2xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-secondary)]">
            {area.blurb}
          </p>
        ) : null}
      </Link>
      {area.status === "ACTIVE" ? (
        <JoinButton areaId={area.id} joined={joined} signedIn={signedIn} size="sm" />
      ) : null}
    </li>
  );
}


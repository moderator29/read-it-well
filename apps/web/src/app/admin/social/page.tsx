import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
import { getSocialQueue } from "@/lib/social/admin-queries";
import { AreaDecision, ModeratorDecision, PauseToggle } from "./SocialDecisions";

export const metadata: Metadata = {
  title: "Around",
  // Belt and braces alongside robots.ts: a misconfigured crawl file must not be
  // the only thing standing between a search engine and an operations console.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Around, from the console.
 *
 * Two queues that carry owner rulings, and one list that carries the
 * consequences of them:
 *
 *   Places people asked for. Anyone may suggest one, and only a decision here
 *   makes it public. The insert policy on `areas` pins a new row to PROPOSED,
 *   so this really is the only door.
 *
 *   People who asked to look after a place. Only a decision here grants
 *   MODERATOR, and the copy on the control states what that role can and cannot
 *   do, because an operator granting it should not have to remember.
 *
 * Both queues are oldest first, deliberately. A queue sorted newest first is a
 * queue where the oldest item rots quietly while the counter looks healthy.
 *
 * English literals throughout, like the rest of `/admin`. That is the standing
 * decision recorded in R-107: the console is an internal surface for a small
 * team and translating it would be work with no reader.
 */
export default async function AdminSocialPage() {
  const access = await requireAdmin();
  if (access.state !== "admin") {
    return (
      <div className="nf-card p-6">
        <h1 className="text-lg font-semibold text-[var(--nf-content-primary)]">Around</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          {adminRefusal(access)}
        </p>
      </div>
    );
  }

  const queue = await getSocialQueue();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold text-[var(--nf-content-primary)]">Around</h1>
        <p className="mt-1 text-sm text-[var(--nf-content-muted)]">
          Places people asked for, and people who asked to look after one.
        </p>
      </header>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--nf-content-primary)]">
          Places waiting
          <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
            {queue.proposed.length}
          </span>
        </h2>

        {queue.proposed.length === 0 ? (
          <p className="nf-card p-4 text-sm text-[var(--nf-content-muted)]">
            Nothing waiting. When somebody suggests a place it lands here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.proposed.map((area) => (
              <li key={area.id} className="nf-card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-base font-semibold text-[var(--nf-content-primary)]">
                    {area.name}
                  </h3>
                  <span className="text-xs uppercase tracking-wider text-[var(--nf-content-muted)]">
                    {area.kind}
                  </span>
                  <span className="text-xs text-[var(--nf-content-muted)]">
                    {area.city}, {area.stateCode}
                  </span>
                </div>

                {area.blurb ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
                    {area.blurb}
                  </p>
                ) : null}

                <p className="mt-2 text-xs text-[var(--nf-content-muted)]">
                  Address will be{" "}
                  <span className="nf-numeric">/around/{area.slug}</span>
                  {area.proposerHandle ? (
                    <>
                      {" "}
                      &middot; suggested by{" "}
                      <Link
                        href={`/u/${area.proposerHandle}`}
                        className="text-[var(--nf-brand-secondary)]"
                      >
                        @{area.proposerHandle}
                      </Link>
                    </>
                  ) : null}
                </p>

                <AreaDecision areaId={area.id} name={area.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--nf-content-primary)]">
          People who want to look after a place
          <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
            {queue.applications.length}
          </span>
        </h2>

        {queue.applications.length === 0 ? (
          <p className="nf-card p-4 text-sm text-[var(--nf-content-muted)]">
            No applications open.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.applications.map((application) => (
              <li key={application.id} className="nf-card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-base font-semibold text-[var(--nf-content-primary)]">
                    {application.displayLabel ??
                      (application.handle ? `@${application.handle}` : "A member")}
                  </h3>
                  <span className="text-xs text-[var(--nf-content-muted)]">
                    wants to look after {application.areaName}
                  </span>
                </div>

                <blockquote className="mt-3 border-l-2 border-[var(--nf-border-brand)] pl-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
                  {application.reason}
                </blockquote>

                {application.handle ? (
                  <p className="mt-2 text-xs text-[var(--nf-content-muted)]">
                    <Link
                      href={`/u/${application.handle}`}
                      className="text-[var(--nf-brand-secondary)]"
                    >
                      @{application.handle}
                    </Link>{" "}
                    &middot;{" "}
                    <Link
                      href={`/around/${application.areaSlug}`}
                      className="text-[var(--nf-brand-secondary)]"
                    >
                      the place
                    </Link>
                  </p>
                ) : null}

                <ModeratorDecision
                  applicationId={application.id}
                  areaName={application.areaName}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--nf-content-primary)]">
          Open places
          <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
            {queue.open.length}
          </span>
        </h2>

        {queue.open.length === 0 ? (
          <p className="nf-card p-4 text-sm text-[var(--nf-content-muted)]">
            No places are open yet. Approving one above opens it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.open.map((area) => (
              <li
                key={area.id}
                className="nf-card flex flex-wrap items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/around/${area.slug}`}
                      className="truncate text-sm font-semibold text-[var(--nf-content-primary)]"
                    >
                      {area.name}
                    </Link>
                    {area.status === "PAUSED" ? (
                      <span className="rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--nf-content-muted)]">
                        Paused
                      </span>
                    ) : null}
                  </div>
                  <p className="nf-numeric mt-0.5 text-xs text-[var(--nf-content-muted)]">
                    {area.city} &middot; {area.memberCount} members &middot;{" "}
                    {area.moderatorCount} looking after it
                  </p>
                  {area.moderatorCount === 0 ? (
                    <p className="mt-1 text-xs text-[var(--nf-state-warning)]">
                      Nobody is watching this place.
                    </p>
                  ) : null}
                </div>
                <PauseToggle
                  areaId={area.id}
                  paused={area.status === "PAUSED"}
                  name={area.name}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

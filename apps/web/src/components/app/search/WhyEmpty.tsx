import { requireAdmin } from "@/lib/admin/guard";
import { partnerHealth } from "@/lib/inventory";
import type { ListingSearchFilter } from "@/lib/listings/types";

/**
 * Why the shelf is empty, on the shelf, for the person who can fix it.
 *
 * Getting the partner feeds live took four rounds of the same conversation:
 * the owner sees an empty screen, reports "nothing is pulling", and the only
 * way to learn WHY is to know that `/api/admin/inventory` exists and to open it
 * by hand in another tab. Every one of those rounds cost a day, and every one
 * of them ended in a one line answer that the page itself could have given.
 *
 * The problem is that an empty shelf has at least six causes and every one of
 * them draws the same screen: no key, a key the upstream refuses, an API not
 * enabled on the project, a kill switch off in `feature_flags`, a query that
 * asks the wrong question, and a city that genuinely has nothing in it. The
 * last one is the only one a visitor should ever see, and it is the least
 * likely while the platform is young.
 *
 * So this runs the same live check the admin route runs and prints it under the
 * empty state. Admins only, and it says so, because it names upstream status
 * codes and provider internals and none of that is a visitor's business.
 *
 * It renders NOTHING at all in every other case: not signed in, not an admin,
 * or a shelf that has results. A diagnostic that shows up when there is nothing
 * wrong is noise, and noise is what stops people reading diagnostics.
 *
 * The cost is real and bounded: one live request per configured feed, and only
 * for an admin, and only on a screen that already came back empty.
 */
export async function WhyEmpty({ filter }: { filter: ListingSearchFilter }) {
  const access = await requireAdmin();
  if (access.state !== "admin") return null;

  const providers = await partnerHealth(filter);
  if (providers.length === 0) return null;

  const total = providers.reduce((sum, entry) => sum + entry.listings, 0);

  return (
    <div
      className="mx-auto mt-6 max-w-xl rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] p-4 text-left"
      data-testid="why-empty"
    >
      <p className="text-[0.8125rem] font-semibold text-[var(--nf-content-primary)]">
        Only you can see this, because you are staff
      </p>
      <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        Live check of every partner feed for this exact search. First party
        listings are separate: if agents have listed nothing, no feed fills that.
      </p>

      <ul className="mt-3 space-y-2">
        {providers.map((entry, index) => (
          <li
            key={`${entry.provider}-${entry.flag}-${index}`}
            className="text-[0.75rem] leading-relaxed"
          >
            <span className="font-semibold text-[var(--nf-content-primary)]">
              {entry.provider}
            </span>{" "}
            <span className="text-[var(--nf-content-muted)]">({entry.flag})</span>{" "}
            <span
              className={
                entry.outcome === "ok"
                  ? "text-[var(--nf-state-success)]"
                  : "text-[var(--nf-state-error)]"
              }
            >
              {entry.outcome}
            </span>
            <span className="text-[var(--nf-content-secondary)]">
              {" "}
              {entry.listings} back
            </span>
            {/* The upstream's own words. This is the line that names the fix:
                Google says which of five different 403s it is. */}
            {"reason" in entry && entry.reason ? (
              <span className="block text-[var(--nf-content-muted)]">{entry.reason}</span>
            ) : null}
            {entry.notes.map((note) => (
              <span key={note} className="block text-[var(--nf-content-muted)]">
                {note}
              </span>
            ))}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[0.75rem] text-[var(--nf-content-muted)]">
        {total > 0
          ? `The feeds returned ${total} between them, so anything missing above was dropped after the fetch: check the category and the filters.`
          : "Every feed returned nothing. The reasons above are the whole story."}
      </p>
    </div>
  );
}

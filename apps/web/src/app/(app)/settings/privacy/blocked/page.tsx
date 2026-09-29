import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { loadMyBlocks } from "@/lib/safety/blocks-queries";
import { BlockedEmpty, BlockedList, type BlockedRow } from "./BlockedList";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).settings.blocked.screenTitle,
    robots: { index: false, follow: false },
  };
}

/* A block list read from a cache could show somebody as unblocked who is not. */
export const dynamic = "force-dynamic";

const LAGOS_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Settings, Privacy & Security, Blocked accounts. DB2.
 *
 * The people the caller blocked (never who blocked them), newest first, each
 * with Unblock. Reached from the Blocked accounts row on /settings/privacy.
 */
export default async function BlockedAccountsPage() {
  const t = getDictionary(await getLocale());
  const copy = t.settings.blocked;
  const list = await loadMyBlocks();

  return (
    <div className="mx-auto max-w-lg" data-testid="blocked-settings">
      <PageHeader title={copy.screenTitle} fallback="/settings/privacy" />
      {list.state === "signed-out" ? (
        <div className="nf-panel nf-panel--card block p-card text-center">
          <p className="nf-body-sm text-content-2">{copy.signedOut}</p>
          <Link href="/sign-in" className="nf-btn nf-btn--primary mt-block w-full sm:w-auto">
            {t.common.signIn}
          </Link>
        </div>
      ) : list.state === "unreadable" ? (
        <p role="alert" className="nf-panel nf-panel--card block p-card nf-body-sm text-content">
          {copy.unreadable}
        </p>
      ) : (
        <div className="space-y-block">
          <p className="nf-body-sm text-content-2">{copy.intro}</p>
          {list.people.length === 0 ? (
            <BlockedEmpty title={copy.emptyTitle} body={copy.emptyBody} />
          ) : (
            <>
            {list.total > list.people.length && (
              <p role="status" className="nf-body-sm text-content-2" data-testid="blocked-showing-some">
                {copy.showingSome
                  .replace("{shown}", String(list.people.length))
                  .replace("{count}", String(list.total))}
              </p>
            )}
            <BlockedList
              rows={list.people.map(
                (p): BlockedRow => ({
                  userId: p.userId,
                  name: p.name ?? copy.someone,
                  when: copy.blockedOn.replace("{when}", LAGOS_DATE.format(new Date(p.blockedAt))),
                }),
              )}
              copy={{
                unblock: copy.unblock,
                unblocking: copy.unblocking,
                unblockConfirm: copy.unblockConfirm,
                unblockFailed: copy.unblockFailed,
              }}
            />
            </>
          )}
        </div>
      )}
    </div>
  );
}

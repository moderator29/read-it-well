import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BlockedEmpty, BlockedList } from "@/app/(app)/settings/privacy/blocked/BlockedList";

/**
 * `/preview/db2/blocked`: Settings, Privacy & Security, Blocked accounts, with
 * fixture rows (`?v=empty` for the empty state). The real components and the
 * real copy; only the list is invented, because this sandbox has no session.
 * Behind the preview gate in `../../layout.tsx`. Unblock here calls the real
 * action, which answers signed-out.
 */
export default async function BlockedPreview({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const copy = getDictionary("en").settings.blocked;
  const rows = [
    { userId: "00000000-0000-4000-8000-0000000000b1", name: "Adebayo Ogunleye", when: copy.blockedOn.replace("{when}", "27 Sept 2026") },
    { userId: "00000000-0000-4000-8000-0000000000b2", name: "Chiamaka Nwosu-Eze Properties and Lettings", when: copy.blockedOn.replace("{when}", "3 Sept 2026") },
    { userId: "00000000-0000-4000-8000-0000000000b3", name: copy.someone, when: copy.blockedOn.replace("{when}", "12 Aug 2026") },
  ];
  return (
    <div className="mx-auto max-w-lg p-card" data-testid="blocked-settings">
      <PageHeader title={copy.screenTitle} fallback="/settings/privacy" />
      <div className="space-y-block">
        <p className="nf-body-sm text-content-2">{copy.intro}</p>
        {v === "empty" ? (
          <BlockedEmpty title={copy.emptyTitle} body={copy.emptyBody} />
        ) : (
          <BlockedList
            rows={rows}
            copy={{
              unblock: copy.unblock,
              unblocking: copy.unblocking,
              unblockConfirm: copy.unblockConfirm,
              unblockFailed: copy.unblockFailed,
            }}
          />
        )}
      </div>
    </div>
  );
}

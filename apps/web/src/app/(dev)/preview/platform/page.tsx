import { StillAvailableCard } from "@/components/agent/StillAvailableCard";
import { ReviewActionBar } from "@/app/admin/listings/[id]/ReviewActionBar";
import { PasskeyIdleSetting } from "@/app/(app)/settings/passcode/PasskeyIdleSetting";
import { ROSTER_WARNING_TEXT, rosterWarning } from "@/lib/admin/key-roster-rules";

/**
 * The Admin/Platform lane's new pieces (30 September 2026), with fixtures:
 * the agent's "Still available?" card (C5), the listing review's reason chips
 * (C8), the passcode's Face ID or fingerprint setting (C14) and the key
 * roster's warnings (C14). Every name is a fixture; the actions refuse in a
 * sandbox with no session.
 */
export const dynamic = "force-dynamic";

const ROSTER = [
  { name: "Example super admin", kind: "super_admin" as const, keys: 1 },
  { name: "Example support agent", kind: "staff" as const, keys: 1 },
  { name: "Example reviewer", kind: "staff" as const, keys: 2 },
];

export default function PlatformPreview() {
  return (
    <main id="main" className="nf-shell grid gap-section py-section">
      <h1 className="nf-h2">Admin and platform pieces</h1>
      <section className="mx-auto w-full max-w-[36rem]">
        <StillAvailableCard
          items={[
            { id: "00000000-0000-4000-8000-0000000000a1", title: "Example: 2 bedroom flat, Lekki Phase 1", days: 21 },
            { id: "00000000-0000-4000-8000-0000000000a2", title: "Example: Studio, Yaba", days: null },
          ]}
        />
      </section>
      <section className="nf-console mx-auto w-full max-w-[48rem]">
        <h2 className="nf-h3 mb-xs">Listing review: reason chips</h2>
        <ReviewActionBar listingId="00000000-0000-4000-8000-0000000000b1" status="SUBMITTED" nextHref={null} queueHref="/admin/listings" />
      </section>
      <section className="mx-auto w-full max-w-[36rem]">
        <h2 className="nf-h3 mb-xs">Passcode: with a key</h2>
        <PasskeyIdleSetting hasPasskey />
        <h2 className="nf-h3 mb-xs mt-block">Passcode: without a key</h2>
        <PasskeyIdleSetting hasPasskey={false} />
      </section>
      <section className="nf-console mx-auto w-full max-w-[48rem]">
        <h2 className="nf-h3 mb-xs">Console keys</h2>
        <ul className="nf-admin-queue">
          {ROSTER.map((r) => {
            const keys = Array.from({ length: r.keys }, () => ({ label: "iPhone", createdAt: "2026-09-20T10:00:00Z", lastUsedAt: "2026-09-29T10:00:00Z" }));
            const warning = rosterWarning(r.kind, keys);
            return (
              <li key={r.name} className="nf-admin-queue-row">
                <p className="font-semibold">
                  {r.name} <span className="nf-caption">· {r.keys === 1 ? "1 key" : `${r.keys} keys`}</span>
                </p>
                {warning ? <p className="nf-caption">{ROSTER_WARNING_TEXT[warning]}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

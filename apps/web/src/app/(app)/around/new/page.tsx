import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { listStates } from "@/lib/social/areas-queries";
import { MODERATOR_CAN, MODERATOR_CANNOT } from "@/lib/social/areas-schema";
import { ProposeAreaForm } from "./ProposeAreaForm";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const metadata: Metadata = { title: "Suggest a place" };

/**
 * Suggest a place.
 *
 * The owner's ruling, built as its own route rather than a modal, because it is
 * a real submission that a person reads and answers, not a quick toggle. It is
 * also where the moderator rules are stated in public, since somebody suggesting
 * a place is exactly the person most likely to want to look after it, and the
 * limits of that role should be known before they ask rather than after.
 */
export default async function ProposeAreaPage() {
  if (!(await isSocialEnabled())) return <SocialPaused title="Suggest a place" fallback="/home" />;

  const [session, states] = await Promise.all([resolveSession(), listStates()]);
  const signedIn = session.state === "signed-in";

  return (
    <div className="mx-auto w-full max-w-2xl pb-16 pt-4">
      {/* Back to the directory, which is where this form is reached from and
          where the suggestion appears once it is made. */}
      <PageHeader
        title="Suggest a place"
        fallback="/around/manage"
      />

      <p className="mb-6 text-sm leading-relaxed text-[var(--nf-content-muted)]">
        Tell us about somewhere that should be on Around. A person reads every
        one of these.
      </p>

      <ProposeAreaForm states={states} signedIn={signedIn} />

      <section className="nf-card mt-8 p-5">
        <h2 className="text-sm font-semibold text-[var(--nf-content-primary)]">
          If you want to look after a place
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          Once a place is open you can join it and apply to look after it. It is
          worth knowing what that does and does not mean before you ask.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nf-state-success)]">
              You can
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {MODERATOR_CAN.map((line) => (
                <li
                  key={line}
                  className="text-sm leading-snug text-[var(--nf-content-secondary)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--nf-content-muted)]">
              You cannot
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {MODERATOR_CANNOT.map((line) => (
                <li
                  key={line}
                  className="text-sm leading-snug text-[var(--nf-content-secondary)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

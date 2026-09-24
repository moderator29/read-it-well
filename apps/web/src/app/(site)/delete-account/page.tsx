import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { SiteHead } from "@/components/site/SiteHead";
import { SUPPORT_HREF, SUPPORT_LABEL } from "@/lib/support-email";
import { GRACE_WINDOW_DAYS } from "@/lib/account-deletion/constants";
import { DESTROYED_TABLES, RETAINED_TABLES } from "@/lib/account-deletion/plan";
import { RestoreForm } from "./RestoreForm";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "How to delete your Vallo account, what is destroyed, what is kept for the period Nigerian law requires, how long it takes, and how to stop a deletion you have already started.",
};

/**
 * The public account deletion page.
 *
 * WHY IT EXISTS AS A WEB PAGE AT ALL. Google Play requires a publicly
 * reachable URL that explains how to request account deletion, reachable
 * without installing anything and without signing in, and it has to say what
 * is deleted and what is retained. Apple requires the deletion itself to be
 * initiable inside the app, which it is, in Settings then Account. This page
 * is the Play half and it is also the honest half: somebody who has lost their
 * phone can read exactly what will happen before they start.
 *
 * IT IS NOT A SECOND DELETION PATH. Starting a deletion needs a signed-in
 * session and a re-authentication, so the page points at the one control that
 * does it rather than duplicating it here with a weaker proof. What this page
 * DOES carry is the restore form, because that is the one step a person cannot
 * perform signed in: the account is banned for the length of the grace window.
 *
 * EVERY LIST BELOW IS GENERATED FROM `lib/account-deletion/plan.ts`, which is
 * the same file the purge migration is written from and which
 * `plan.test.ts` checks against it. A public promise that no code enforces is
 * exactly the failure F-17 records.
 */
export default function DeleteAccountPage() {
  return (
    <>
      <SiteHead
        plate="tower-entrance-dusk"
        icon="doc-shield"
        chip="Your data"
        title="Delete your account"
        lede={`You can delete your Vallo account yourself, from inside the app or on this website. Nothing is destroyed for ${GRACE_WINDOW_DAYS} days, so a change of mind costs you nothing.`}
      />

      <div className="nf-shell pb-section">
        <div className="mx-auto max-w-3xl">
          {/* ------------------------------------------------------ how to */}
          <section className="nf-panel nf-panel--card block mt-block p-lg">
            <h2 className="nf-h3">How to start it</h2>
            <ol className="mt-sm space-y-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              <li>
                <span className="font-semibold text-[var(--nf-content-primary)]">
                  1. Sign in.
                </span>{" "}
                On the app, or in any browser on this website. You do not need the app installed.
              </li>
              <li>
                <span className="font-semibold text-[var(--nf-content-primary)]">
                  2. Open Settings, then Account.
                </span>{" "}
                Delete account is the last control in that group.
              </li>
              <li>
                <span className="font-semibold text-[var(--nf-content-primary)]">
                  3. Clear anything still open.
                </span>{" "}
                Your wallet has to be empty (spend it or send it to another Vallo member;
                withdrawal to a bank is not available yet, so if you cannot do either,{" "}
                <a href={SUPPORT_HREF} className="font-semibold underline">
                  {SUPPORT_LABEL}
                </a>{" "}
                and we will settle it with you), your bookings and table reservations finished or
                cancelled, any withdrawal settled, and any listing of yours unpublished or handed
                to another agent. The screen names whichever of those applies to you and links
                straight to the control that clears it.
              </li>
              <li>
                <span className="font-semibold text-[var(--nf-content-primary)]">
                  4. Confirm it is you, then type the phrase.
                </span>{" "}
                Your password, or a code we email you if you signed up with Google or Apple.
              </li>
            </ol>
            <div className="mt-md flex flex-wrap gap-sm">
              <ButtonLink href="/settings/account" variant="primary">
                Open Settings
              </ButtonLink>
              <ButtonLink href="/sign-in" variant="secondary">
                Sign in first
              </ButtonLink>
            </div>
          </section>

          {/* --------------------------------------------------- the window */}
          <section className="nf-panel nf-panel--card block mt-block p-lg">
            <h2 className="nf-h3">What happens next, and when</h2>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              The moment you confirm, your account is signed out everywhere and deactivated. You
              cannot sign in and nobody can reach your profile. Nothing has been destroyed yet.
            </p>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              We email you straight away with the date and a restore code. {GRACE_WINDOW_DAYS} days
              later a scheduled job runs the deletion, and we email you again when it has finished.
              After that it cannot be undone.
            </p>
          </section>

          {/* ------------------------------------------------- what is gone */}
          <section className="nf-panel nf-panel--card block mt-block p-lg">
            <h2 className="nf-h3">What is destroyed</h2>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              Your profile, your photograph and cover picture, your posts, comments, stories and
              drafts, your saved items, interests and searches, your devices and notifications,
              your saved cards and bank accounts, and every file you have uploaded, including any
              host documents. The files are removed from storage, not just the records that point
              at them. An approved agent&rsquo;s identification (identity and agency documents, ID
              number, name, address and payout details) is the exception: the money laundering
              rules require it to be kept for five years after the account closes, readable only
              by our staff, and then it is destroyed. An applicant who was not approved keeps
              nothing.
            </p>
            <ul className="mt-sm grid gap-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)] sm:grid-cols-2">
              {DESTROYED_TABLES.map((entry) => (
                <li key={entry.table} className="flex gap-xs">
                  <span
                    aria-hidden="true"
                    className="mt-xs h-1 w-1 shrink-0 rounded-full bg-[var(--nf-state-error)]"
                  />
                  {entry.note}
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------- what is kept */}
          <section className="nf-panel nf-panel--card block mt-block p-lg">
            <h2 className="nf-h3">What is kept, and why</h2>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              Vallo is registered with the Special Control Unit against Money Laundering, and
              Nigerian anti-money-laundering rules require a platform that moves money to retain
              its transaction records. So bookings, reservations, wallet entries, payments, payout
              records, inspection requests and reviews are kept, with your name, email address and
              telephone number removed from every one of them. What is left is an amount, a date
              and a reference that no longer points at a person.
            </p>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              Messages you have sent stay in the other person&rsquo;s conversation with an anonymous
              sender, so their side of the thread is still readable. Nobody can see who wrote them.
            </p>
            <ul className="mt-sm space-y-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
              {RETAINED_TABLES.filter((entry) => entry.stripped !== "nothing: the row is an amount and a uuid").map(
                (entry) => (
                  <li key={entry.table} className="flex gap-xs">
                    <span
                      aria-hidden="true"
                      className="mt-xs h-1 w-1 shrink-0 rounded-full bg-[var(--nf-content-muted)]"
                    />
                    <span>
                      <span className="font-semibold text-[var(--nf-content-secondary)]">
                        {entry.table}
                      </span>
                      : {entry.stripped} removed, because {entry.because}.
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
              How long those records are kept for is set out in the{" "}
              <Link
                href="/privacy"
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
              >
                privacy policy
              </Link>
              , section 7.
            </p>
          </section>

          {/* ---------------------------------------------------- the way back */}
          <section className="nf-panel nf-panel--card block mt-block p-lg" id="restore">
            <h2 className="nf-h3">Stop a deletion you have started</h2>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              Your account is deactivated while the {GRACE_WINDOW_DAYS} days run, so you cannot
              sign in to change your mind. Use the code from the email we sent instead. It puts
              everything back exactly as it was, and it is the only thing it can do.
            </p>
            <RestoreForm />
          </section>

          {/* ------------------------------------------------------ nowhere else */}
          <section className="nf-panel nf-panel--card block mt-block p-lg">
            <h2 className="nf-h3">If you cannot get in at all</h2>
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              If you have lost access to the email address on the account and cannot sign in, write
              to us at{" "}
              <a
                href={SUPPORT_HREF}
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
              >
                {SUPPORT_LABEL}
              </a>{" "}
              and we will verify who you are before we do anything. This is the exception, not the
              route: the control in Settings works for everybody who can sign in, and it does not
              need us.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

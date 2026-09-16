import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/design-system/brand/Logo";
import { resolveSession } from "@/lib/actions/session";

/**
 * 404.
 *
 * Says what happened and offers the next step, per the no dead ends rule.
 *
 * THE FLOATING OBJECT FIELD STOOD HERE AND IS GONE. Four brand objects
 * drifted at fixed percentage positions behind the column, and at phone
 * heights the bottom pair, parked at 18 and 24 per cent from the bottom, sat
 * directly under the action buttons: the page a stranger meets when something
 * has already gone wrong greeted them with artwork colliding with the way
 * out. The hero shed the same field for the same reason and its removal note
 * is in app/page.tsx history; a 404 needs the exit to be the most obvious
 * thing on it, and decoration that can touch the exit is not decoration.
 *
 * **"Back to home" means the home the reader actually has.** It pointed at
 * `/`, the landing page, which for a signed-in person is not home at all: it
 * is the page that explains the product to somebody who has never seen it, and
 * being dropped there mid-session reads as having been signed out. The owner
 * hit exactly this and said so. This renders on the server, so it can simply
 * ask, and a signed-in reader is offered `/home` instead.
 *
 * It used to be marked as deliberately static, which is what made the wrong
 * link look correct: a static page cannot know who is reading it. The cost of
 * asking is one session read on a page nobody is meant to reach often, and the
 * screen still renders in full if that read comes back with nothing.
 */
export default async function NotFound() {
  const session = await resolveSession();
  const home = session.state === "signed-in" ? "/home" : "/";
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      <div className="relative z-10">
        <Link href="/" aria-label="Vallo home" className="nf-tap inline-flex">
          <LogoMark size={64} />
        </Link>

        <p className="nf-numeric nf-display nf-gradient-text mt-6 text-[clamp(5rem,18vw,9rem)]">
          404
        </p>

        <h1 className="nf-h2 mt-2">This page has checked out</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[var(--nf-content-secondary)]">
          The link may be out of date, or the page may have moved. Every place
          on Vallo is still where it should be.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <ButtonLink
            href="/search"
            variant="secondary"
            full
            className="justify-start rounded-[var(--nf-radius-control)] text-left"
          >
            <UiIcon name="search" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            {/* This said "hotels, food, experiences", which is the travel app
                this product stopped being. The words are the product's own. */}
            <span className="text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Search rentals, homes, shortlets, land...
            </span>
          </ButtonLink>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <ButtonLink href={home} variant="primary" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/search" variant="secondary" size="lg" leadingIcon="sparkle">
            Explore instead
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

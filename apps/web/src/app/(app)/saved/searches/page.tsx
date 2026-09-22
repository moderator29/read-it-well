import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { Unreachable } from "@/components/app/Unreachable";
import { Reveal } from "@/components/site/Reveal";
import { SavedSearchBoard } from "@/components/app/saved-searches/SavedSearchBoard";
import { getLocale } from "@/lib/locale";
import { listSavedSearches } from "@/lib/saved/searches-queries";

export const metadata: Metadata = { title: "Saved searches" };

/**
 * Saved searches.
 *
 * The hunts this account keeps, read under its own policy in this request, so
 * what is drawn is what the database holds and a reload proves it.
 *
 * ---------------------------------------------------------------------------
 * THE EMPTY STATE IS THE MAIN STATE, AND IT IS WRITTEN AS ONE.
 *
 * A new account has no saved searches BY DEFINITION, so this screen's first
 * and most-seen face is the one with nothing on it. It does not apologise, it
 * does not describe a feature in the abstract, and it does not say "tap the
 * bookmark" about a control the reader cannot see from here. It says what a
 * saved search is FOR, in one sentence, and sends them to the one place the
 * control exists.
 *
 * ---------------------------------------------------------------------------
 * FOUR STATES, ALL DESIGNED. A read that failed is NOT drawn as an empty
 * shortlist: telling somebody their saved work is gone when the query simply
 * did not come back is the worst thing this screen could do, so a failed read
 * gets the unreachable screen, which says the fault is ours and nothing was
 * lost. Signed out gets its own screen rather than a redirect, because the
 * product shell may or may not have caught them first.
 */
export default async function SavedSearchesPage() {
  const locale = await getLocale();
  const state = await listSavedSearches();

  return (
    <div className="mx-auto max-w-2xl">
      {/* The same brand object anchor /saved opens on, because a person
          crossing between the two shelves should not cross a seam. See the
          note in LiveNotifications for why it wraps the header alone. A2. */}
      <div className="relative">
        <PageScene art="search-ring" />
        <PageHeader title="Saved searches" fallback="/saved" />
      </div>

      {state.state === "unconfigured" || state.state === "unavailable" ? (
        <Reveal>
          <Unreachable
            noun="saved searches"
            icon="search-ring"
            action={{ label: "Try again", href: "/saved/searches" }}
            data-testid="saved-searches-unreachable"
          />
        </Reveal>
      ) : state.state === "signed-out" ? (
        <Reveal>
          <EmptyState
            icon="search-ring"
            title="Sign in to keep a search"
            body="A saved search belongs to an account, so it can follow you between your phone and your laptop and so nobody else can see what you are looking for."
            action={
              <EmptyActions
                primary={{ label: "Sign in", href: "/sign-in" }}
                secondary={{
                  label: "Browse without an account",
                  href: "/search",
                }}
              />
            }
            data-testid="saved-searches-signed-out"
          />
        </Reveal>
      ) : state.searches.length === 0 ? (
        <Reveal>
          <EmptyState
            icon="search-ring"
            title="Keep a search and we will watch it"
            body="Filter the results down to the place you actually want, then save that search. It waits here under the name you give it, and we tell you when something new fits it."
            action={
              <EmptyActions
                primary={{ label: "Start a search", href: "/search" }}
              />
            }
            secondary={
              <Link
                href="/saved"
                className="nf-link-quiet nf-body text-[var(--nf-content-link)]"
              >
                Your saved places
              </Link>
            }
            data-testid="saved-searches-empty"
          />
        </Reveal>
      ) : (
        <Reveal>
          <SavedSearchBoard initial={state.searches} locale={locale} />
        </Reveal>
      )}
    </div>
  );
}

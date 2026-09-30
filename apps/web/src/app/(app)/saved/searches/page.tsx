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
import { getDictionary } from "@vallo/i18n";
import { readMyBriefs } from "@/lib/briefs/queries";
import { briefDraftFrom } from "@/lib/briefs/brief";
import { BriefComposer } from "@/components/app/briefs/BriefComposer";
import { MyBriefs } from "@/components/app/briefs/MyBriefs";
import { resolveSession } from "@/lib/actions/session";
import { loadListingsByIds } from "@/lib/listings/supabase-repository";

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
export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const state = await listSavedSearches();
  const t = getDictionary(locale);

  /* V-95: the renter's briefs, the answers' titles, and a draft when they
     came from a search that found nothing (`?brief=1` plus its filters). */
  const raw = await searchParams;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params[key] = value;
  const signedIn = state.state === "signed-in";
  const briefs = signedIn ? await readMyBriefs() : null;
  const answerIds = [...new Set((briefs ?? []).flatMap((b) => b.answers.map((a) => a.listingId)))];
  const session = signedIn && answerIds.length > 0 ? await resolveSession() : null;
  const found =
    session && session.state === "signed-in" ? await loadListingsByIds(session.supabase, answerIds).catch(() => new Map()) : new Map();
  const titles: Record<string, string> = {};
  for (const [id, listing] of found) titles[id] = (listing as { title: string }).title;

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
                className="nf-tap nf-link-quiet nf-body text-[var(--nf-content-link)]"
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

      {signedIn && (
        <section id="briefs" className="mt-lg flex flex-col gap-row" aria-labelledby="briefs-title">
          <h2 id="briefs-title" className="nf-h4 text-[var(--nf-content-primary)]">
            {t.frontDoor.briefs.title}
          </h2>
          <p className="nf-body-sm text-[var(--nf-content-secondary)]">{t.frontDoor.briefs.lede}</p>
          <BriefComposer
            copy={t.frontDoor.briefs}
            saved={state.state === "signed-in" ? state.searches.map((s) => ({ id: s.id, label: s.label, params: s.params })) : []}
            initial={params.brief === "1" ? briefDraftFrom(params) : null}
          />
          <MyBriefs briefs={briefs} titles={titles} copy={t.frontDoor.briefs} locale={locale} />
        </section>
      )}
    </div>
  );
}

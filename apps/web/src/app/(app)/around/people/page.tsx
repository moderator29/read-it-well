import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { FollowRow } from "@/components/social/follow/WhoToFollow";
import { EmptyPanel } from "@/components/social/profile/EmptyPanel";
import { SocialPaused } from "@/components/social/SocialPaused";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { isSocialEnabled } from "@/lib/social/flag";
import { listMyAreas } from "@/lib/social/areas-queries";
import {
  isFollowKind,
  readFollowSuggestions,
  type FollowKind,
} from "@/lib/social/follow-suggestions";

export const metadata: Metadata = {
  title: "Find people to follow",
};

const PAGE = 20;

/** The filter chips, in the order a member looking for a place thinks. */
const KINDS: { kind: FollowKind | null; label: string }[] = [
  { kind: null, label: "All" },
  { kind: "agent", label: "Agents" },
  { kind: "landlord", label: "Landlords" },
  { kind: "hotel", label: "Hotels" },
  { kind: "restaurant", label: "Restaurants" },
  { kind: "agency", label: "Agencies" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * THE SOCIAL SEARCH (the founder, 7 October): a full page to find people and
 * businesses to follow, City or Global, filtered by kind.
 *
 * Every control is a link or a GET form, so the page is its own address
 * (shareable, Back steps through the filters, works before JavaScript), and
 * the list is the same `FollowRow` the feed's block draws. City is the one
 * the member is reading or joined, never a guess; with none, the City half
 * says so and the list is everyone on Vallo.
 */
export default async function FindPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; scope?: string | string[]; city?: string | string[]; kind?: string | string[]; page?: string | string[] }>;
}) {
  if (!(await isSocialEnabled())) return <SocialPaused />;
  const params = await searchParams;
  const mine = await listMyAreas();

  const query = (first(params.q) ?? "").trim().slice(0, 40);
  const askedCity = (first(params.city) ?? "").trim().slice(0, 60);
  const homeCity = mine.find((area) => area.status === "ACTIVE")?.city ?? null;
  const global = first(params.scope) === "global";
  const city = global ? null : askedCity || homeCity;
  const rawKind = first(params.kind);
  const kind = isFollowKind(rawKind) ? rawKind : null;
  const page = Math.max(0, Math.min(20, Number.parseInt(first(params.page) ?? "0", 10) || 0));

  const read = await readFollowSuggestions({ city, kind, query, limit: PAGE, offset: page * PAGE });

  const href = (next: { scope?: "global" | "city"; kind?: FollowKind | null; page?: number }) => {
    const out = new URLSearchParams();
    if (query) out.set("q", query);
    const scope = next.scope ?? (global ? "global" : "city");
    if (scope === "global") out.set("scope", "global");
    else if (askedCity) out.set("city", askedCity);
    const k = next.kind === undefined ? kind : next.kind;
    if (k) out.set("kind", k);
    if (next.page) out.set("page", String(next.page));
    const s = out.toString();
    return `/around/people${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader title="Find people" fallback="/around" />

      <form action="/around/people" method="get" className="nf-people-search" role="search">
        <UiIcon name="search" size={16} />
        <input
          type="search"
          name="q"
          defaultValue={query}
          maxLength={40}
          placeholder="Agents, landlords, hotels, restaurants"
          aria-label="Search people and businesses by name"
          className="nf-people-search__field"
        />
        {global ? <input type="hidden" name="scope" value="global" /> : null}
        {!global && askedCity ? <input type="hidden" name="city" value={askedCity} /> : null}
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
      </form>

      {/* City or everywhere: a two-way switch drawn as links. */}
      <nav className="nf-people-scope" aria-label="Where">
        <Link
          href={href({ scope: "city", page: 0 })}
          aria-current={!global ? "page" : undefined}
          className="nf-people-scope__half"
        >
          {city ? city : "Your city"}
        </Link>
        <Link
          href={href({ scope: "global", page: 0 })}
          aria-current={global ? "page" : undefined}
          className="nf-people-scope__half"
        >
          Everywhere
        </Link>
      </nav>

      <nav className="nf-people-kinds" aria-label="Kind of account">
        {KINDS.map((option) => (
          <Link
            key={option.label}
            href={href({ kind: option.kind, page: 0 })}
            aria-current={option.kind === kind ? "page" : undefined}
            className="nf-people-kind"
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {!global && !city ? (
        <p className="nf-people-note">
          Join a place on Vallo and this shows who is working there. Until then, here is everyone.
        </p>
      ) : null}

      {read.state === "unavailable" ? (
        <EmptyPanel
          icon="people-ring"
          title="Finding people is not open yet"
          body="This list is read from published listings and businesses, and that read is not switched on here yet. Nothing is shown rather than a guess."
          action={{ href: "/around", label: "Back to the feed" }}
        />
      ) : read.people.length === 0 ? (
        <EmptyPanel
          icon="people-ring"
          title={query ? `Nobody called "${query}" yet` : "Nobody here yet"}
          body={
            city
              ? `No ${kind ? KINDS.find((k) => k.kind === kind)?.label.toLowerCase() : "agents, landlords, hotels or restaurants"} have published work in ${city} yet. Everywhere may have more.`
              : "Nobody with published work matches this yet."
          }
          action={city ? { href: href({ scope: "global", page: 0 }), label: "Look everywhere" } : { href: "/around", label: "Back to the feed" }}
        />
      ) : (
        <>
          <ul className="nf-follow__list nf-people-list">
            {read.people.map((person) => (
              <FollowRow key={person.userId} person={person} signedIn={read.signedIn} />
            ))}
          </ul>
          {read.more ? (
            <Link href={href({ page: page + 1 })} className="nf-follow__more">
              Show more
              <UiIcon name="chevron-right" size={12} />
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

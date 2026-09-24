import type { Metadata } from "next";
import { getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { listStates } from "@/lib/places/queries";
import { shareById } from "@/lib/price-check/queries";
import { shareLines } from "@/lib/price-check/share-card";
import { shareCardCopy } from "@/components/app/price/share-copy";
import { doorLines, stayLines, type DoorCard } from "@/lib/share/door";
import { doorPhotoUrl, noteDoorOpen, readDoor, stayDoorPhotoUrl } from "@/lib/share/queries";
import { EXAMPLE_LABEL } from "@/lib/listings/syndication";
import { DoorAreaView, DoorExampleView, DoorListingView, DoorStateView } from "./DoorViews";
import { RememberDoor } from "./RememberDoor";

/**
 * `/s/[token]`: THE SHARE DOOR (V-07).
 *
 * ---------------------------------------------------------------------------
 * ONE CARD, ONE BUTTON, AND THE SAME TO EVERYBODY.
 *
 * This page is public (`s` is in `PUBLIC_SEGMENTS` in `proxy.ts`, with the
 * doors), and it is public for exactly one reason: so that a listing shared on
 * WhatsApp unfurls as the listing rather than as "Sign in | Vallo". It shows a
 * card, never the listing: the first photograph small, the title, the AREA,
 * the move-in total as the headline and the rent under it, the listing code,
 * and "Sign in to open it on Vallo", which carries `next=/listing/<id>`
 * through the whole auth flow.
 *
 * The metadata, this page and `opengraph-image.tsx` all read the same row
 * through the same `readDoor`, so a person and a link unfurler are served the
 * same content. No user agent is consulted anywhere in this route; serving a
 * crawler something a human is refused is cloaking and the ruling forbids it.
 *
 * NO ADDRESS, BY CONSTRUCTION. `public.share_door` returns no address,
 * landmark, coordinate, estate or contact column; `doorCardFromRow` reads only
 * the columns it names; and the area is filtered through `doorPlace`. See
 * `lib/share/door.ts` for the three walls and `door.test.ts` for the fixture
 * that proves them.
 *
 * NO SHARER. Nothing on this page, in its metadata or in its image says who
 * shared it. A card forwarded five times must not carry the first sender's
 * name to strangers.
 *
 * ---------------------------------------------------------------------------
 * EVERY STATE IS WRITTEN: open, example, gone (unpublished since it was
 * shared), missing (never minted, mistyped or revoked), and unreachable (we
 * could not ask), each with the one thing a stranger can do next.
 */

type Params = { params: Promise<{ token: string }> };

/* The door must never be cached as one stranger's answer for another, and it
   reads the database on every request so a revoked door closes at once. */
export const dynamic = "force-dynamic";

async function stateNameFor(code: string): Promise<string> {
  const states = await listStates();
  return states.find((row) => row.code === code)?.name ?? code;
}

/** The words a card is summarised by, for the tab and for the unfurler. */
async function summary(
  card: DoorCard,
  t: Dictionary,
  locale: Locale,
): Promise<{ title: string; description: string } | null> {
  const copy = t.frontDoor.door;
  if (card.kind === "listing") {
    const lines = doorLines(card, copy, locale);
    const parts = [card.place, lines.headline, lines.second].filter(Boolean);
    return { title: lines.title, description: parts.join(". ") };
  }
  if (card.kind === "stay") {
    const lines = stayLines(card, copy);
    return { title: lines.title, description: [card.place, lines.headline].filter(Boolean).join(". ") };
  }
  if (card.kind === "example") {
    if (card.stay) return { title: copy.stay.example, description: copy.stay.exampleBody };
    return { title: EXAMPLE_LABEL, description: copy.exampleBody };
  }
  if (card.kind === "price_area") {
    const share = await shareById(card.shareId);
    if (share === null) return null;
    const lines = shareLines(share, shareCardCopy(t), locale, await stateNameFor(share.stateCode));
    return { title: lines.headline, description: `${lines.range}. ${lines.basis}` };
  }
  return null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const [locale, read] = await Promise.all([getLocale(), readDoor(token)]);
  const t = getDictionary(locale);
  /* A door is a card to be forwarded, not a page to be found: it is never
     indexed, and robots.txt does NOT disallow it, because several unfurlers
     honour robots.txt and a disallowed door would unfurl as nothing. */
  const robots = { index: false, follow: false };
  if (read.state !== "open") return { title: t.frontDoor.door.pageTitle, robots };
  const words = await summary(read.card, t, locale);
  if (words === null) return { title: t.frontDoor.door.pageTitle, robots };
  return {
    title: words.title,
    description: words.description,
    robots,
    openGraph: { type: "website", title: words.title, description: words.description },
    twitter: { card: "summary_large_image", title: words.title, description: words.description },
  };
}

export default async function DoorPage({ params }: Params) {
  const { token } = await params;
  const [locale, read] = await Promise.all([getLocale(), readDoor(token)]);
  const t = getDictionary(locale);
  const copy = t.frontDoor.door;

  if (read.state === "unreachable") return <DoorStateView state="unreachable" copy={copy} />;
  if (read.state === "missing") return <DoorStateView state="missing" copy={copy} />;
  const card = read.card;
  if (card.kind === "gone") return <DoorStateView state="gone" copy={copy} stay={card.stay === true} />;

  /* Counted once per page render, never by the image or the metadata, so an
     unfurler fetching the image three times is not three opens. */
  await noteDoorOpen(token);

  if (card.kind === "price_area") {
    const share = await shareById(card.shareId);
    if (share === null) return <DoorStateView state="missing" copy={copy} />;
    const lines = shareLines(share, shareCardCopy(t), locale, await stateNameFor(share.stateCode));
    return <DoorAreaView card={card} lines={lines} copy={copy} />;
  }

  if (card.kind === "example") return <DoorExampleView card={card} copy={copy} />;

  /* A stay (V-07 carry-over): the same card with no figure and no code, and
     the button carries `next=/stay/<id>`. No first touch is remembered: the
     V-71 credit is for a lister's listing, and a stay has no such thread. */
  if (card.kind === "stay") {
    return (
      <DoorListingView card={card} lines={stayLines(card, copy)} photo={stayDoorPhotoUrl(card.photoPath)} copy={copy} />
    );
  }

  return (
    <>
      {/* V-71: first touch, for the lister whose link this is. */}
      <RememberDoor token={token} />
      <DoorListingView
        card={card}
        lines={doorLines(card, copy, locale)}
        photo={doorPhotoUrl(card.photoPath)}
        copy={copy}
      />
    </>
  );
}

import { getDictionary } from "@vallo/i18n";
import { ThreadView, type ThreadBubble } from "@/app/(app)/messages/[id]/ThreadView";
import { PassportThreadRows } from "@/components/passport/PassportThreadRows";
import { PassportBook } from "@/components/passport/PassportBook";
import { PassportSettings } from "@/components/passport/PassportSettings";
import { ProfileHeader } from "@/components/social/profile/ProfileHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { factsFrom, settingsFrom, type PassportFacts } from "@/lib/passport/model";
import { shareBody } from "@/components/app/messages/share";
import { buildPassportView } from "@/lib/passport/view";
import { roleLine, roleWords } from "@/lib/profile/role-line";
import { PERSON } from "../_fixtures/people";

/**
 * THE VALLO PASSPORT, FROM FIXTURES. Real components, invented people.
 *
 *   ?v=book          the document: a landlord who also runs a hotel, every line
 *   ?v=book-min      a renter, only the join date, level and role
 *   ?v=book-hidden   the same landlord with five lines switched off
 *   ?v=settings      the owner's page: preview and the switches (all on)
 *   ?v=settings-off  with the whole passport off and some lines hidden
 *   ?v=profile       a stranger's profile with the "View passport" button
 *   ?v=chat          a thread with a passport card from each side
 *   ?v=sheet         the options sheet with "Show my passport" (on)
 *   ?v=sheet-off     the same with the passport off
 *   ?v=unavailable   what a blocked, off or unknown passport looks like
 *
 * Nothing here reads a database; every name and figure is invented.
 */
export const dynamic = "force-dynamic";

const ID = "7c1e9a52-3b84-4d6f-9a21-5e0d8f4b6c13";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

const ROW = {
  subject_id: ID,
  handle: "amaka_homes",
  display_name: "Amaka Nwosu",
  photo: "/brand/photos/bedroom-01.jpg",
  roles: ["landlord", "hotel"],
  joined_at: "2026-08-07T08:00:00Z",
  verification: "gold",
  rentals: 14,
  stays: 62,
  review_count: 41,
  review_average: 4.8,
  reply_band: "hour",
  pidgin_ok: true,
};

const RENTER_ROW = {
  subject_id: OTHER_ID,
  handle: "tunde_a",
  display_name: "Tunde Adebayo",
  photo: null,
  roles: ["renter"],
  joined_at: "2026-10-13T09:30:00Z",
  verification: "none",
  rentals: 0,
  stays: 0,
  review_count: 0,
  review_average: null,
  reply_band: null,
  pidgin_ok: false,
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PreviewPassport({ searchParams }: { searchParams: Promise<{ v?: string | string[] }> }) {
  const v = first((await searchParams).v) ?? "book";
  const t = getDictionary("en");
  const copy = t.passportV2;
  const roleCopy = t.socialProfile.roleLine;
  const landlord = factsFrom(ROW) as PassportFacts;
  const renter = factsFrom(RENTER_ROW) as PassportFacts;
  const view = (facts: PassportFacts) => buildPassportView(facts, copy, roleCopy, "en");

  if (v === "book-min") {
    return (
      <main className="mx-auto max-w-2xl px-gutter py-lg">
        <PassportBook view={view(renter)} copy={copy} />
      </main>
    );
  }

  if (v === "book-hidden") {
    const hidden = factsFrom({ ...ROW, photo: null, joined_at: null, review_count: null, review_average: null, reply_band: null, rentals: null });
    return (
      <main className="mx-auto max-w-2xl px-gutter py-lg">
        <PassportBook view={view(hidden as PassportFacts)} copy={copy} />
      </main>
    );
  }

  if (v === "settings" || v === "settings-off") {
    const off = v === "settings-off";
    return (
      <main className="mx-auto max-w-2xl px-gutter py-lg">
        <PageHeader title={copy.title} subtitle={copy.subtitle} fallback="/settings" />
        <p className="nf-body mb-block text-[var(--nf-content-secondary)]">{copy.lede}</p>
        <PassportSettings
          facts={landlord}
          initial={settingsFrom(off ? { enabled: false, hidden_lines: ["photo", "reviews", "response"] } : null)}
          copy={copy}
          roleCopy={roleCopy}
          locale="en"
        />
      </main>
    );
  }

  if (v === "profile") {
    return (
      <main className="min-w-0 flex-1 pb-4xl">
        <ProfileHeader
          profile={{
            userId: ID,
            handle: "amaka_homes",
            displayLabel: "Amaka Nwosu",
            avatarUrl: "",
            isAgent: true,
            supplyRole: "owner" as const,
            badgeTier: "gold" as const,
            bio: PERSON.bio,
            bioStatus: "LIVE",
            pronouns: "",
            link: "",
            contactPolicy: "OPEN",
            pidginOk: true,
            homeAreaId: null,
            coverPath: null,
            coverUrl: "",
            followerCount: 1240,
            followingCount: 82,
            postCount: 36,
            claimedAt: "2026-08-07T08:00:00.000Z",
          }}
          isOwner={false}
          homeArea={null}
          moderatorOf={[]}
          locale="en"
          t={t}
          occupation={null}
          standing={[]}
          place={null}
          trust={null}
          joinedLabel="August 2026"
          roleLine={roleLine(roleWords({ listers: ["owner"], businesses: ["hotel"] }), roleCopy)}
          record={
            <div className="mt-sm">
              <ButtonLink href={`/passport/${ID}`} size="sm" variant="secondary" leadingIcon="id-card" data-testid="profile-view-passport">
                {copy.viewPassport}
              </ButtonLink>
            </div>
          }
        />
      </main>
    );
  }

  if (v === "chat") {
    const mineCard = {
      kind: "passport" as const,
      id: OTHER_ID,
      view: view(renter),
      copy: { title: copy.title, open: copy.cardOpen, joined: copy.cardJoined },
    };
    const theirCard = {
      kind: "passport" as const,
      id: ID,
      view: view(landlord),
      copy: { title: copy.title, open: copy.cardOpen, joined: copy.cardJoined },
    };
    const messages: ThreadBubble[] = [
      { id: "p1", mine: false, body: "Hello Tunde. Happy to answer anything about the flat.", timeLabel: "10:20", imageUrl: null },
      { id: "p2", mine: true, body: "Thank you. Here is my passport so you know who you are talking to.", timeLabel: "10:22", imageUrl: null, read: true },
      { id: "p3", mine: true, body: shareBody({ kind: "passport", id: OTHER_ID }), timeLabel: "10:22", imageUrl: null, read: true, card: mineCard },
      { id: "p4", mine: false, body: "Nice to meet you. Mine is below.", timeLabel: "10:25", imageUrl: null },
      { id: "p5", mine: false, body: shareBody({ kind: "passport", id: ID }), timeLabel: "10:25", imageUrl: null, card: theirCard },
    ];
    return (
      <div className="flex h-dvh flex-col">
        <ThreadView
          sheetCopy={{ unsafe: t.trustVisible.unsafe }}
          live={false}
          conversationId="00000000-0000-4000-8000-0000000000c1"
          meId={OTHER_ID}
          counterpartName="Amaka Nwosu"
          counterpartTier="gold"
          listing={null}
          inspected={false}
          messages={messages}
          role="guest"
          threadCopy={t.threads}
          locale="en"
        />
      </div>
    );
  }

  if (v === "sheet" || v === "sheet-off") {
    const words = {
      show: copy.showInChat,
      hint: copy.showInChatHint,
      offTitle: copy.showInChatOff,
      offHint: copy.showInChatOffHint,
      sent: copy.shownInChat,
      failed: copy.sendFailed,
      viewTheirs: copy.viewTheirs,
      viewTheirsHint: copy.viewTheirsHint,
    };
    return (
      <div className="flex h-dvh flex-col">
        {/* The rows as the options sheet draws them. The sheet's own frame mounts after hydration, which the dev server
            does not do reliably here, so the rows are drawn on a plain panel at the sheet's width. */}
        <div className="mx-auto w-full max-w-md p-md">
          <p className="nf-caption mb-md text-[var(--nf-content-muted)]">Conversation with Amaka Nwosu</p>
          <PassportThreadRows
            conversationId="00000000-0000-4000-8000-0000000000c1"
            passport={{ on: v === "sheet", words }}
            meId={OTHER_ID}
            counterpartId={ID}
            counterpartName="Amaka Nwosu"
          />
        </div>
      </div>
    );
  }

  if (v === "unavailable") {
    return (
      <main className="mx-auto max-w-2xl px-gutter py-lg">
        <PageHeader title={copy.title} fallback="/around" />
        <EmptyState icon="user-verified" art="id-check" title={copy.unavailableTitle} body={copy.unavailableBody} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-gutter py-lg">
      <PageHeader title={copy.viewTitle.replace("{name}", "Amaka Nwosu")} subtitle={copy.viewLede} fallback="/around" />
      <PassportBook view={view(landlord)} copy={copy} />
    </main>
  );
}

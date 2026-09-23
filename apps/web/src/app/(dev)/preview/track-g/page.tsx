import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Section, Stack } from "@/components/app/Screen";
import { ListingAgentCard } from "@/components/app/listing/ListingAgentCard";
import { LISTING_ROLES } from "@/lib/supply/roles";

/**
 * TRACK G ON A SCREEN: THE REAL CARD, EVERY ROLE, WITH AND WITHOUT A NAME.
 *
 * WHY THIS HARNESS EXISTS AND WHAT IT IS AND IS NOT EVIDENCE OF.
 *
 * The honest proof of Track G is the real `/listing/[id]` rendered against the
 * live database. **That cannot be run from this container.** The sandbox's
 * egress proxy refuses `CONNECT uccixoonmbhrnyczyigt.supabase.co:443` with 403,
 * so the dev server's Supabase client cannot reach the project at all, every
 * listing read returns null, and `/listing/[id]` answers the not-found body at
 * HTTP 200. That is measured and not assumed, and it is recorded in
 * `docs/design/TRACK_G_STATE.md` rather than papered over.
 *
 * So the evidence is split, and each half says what it is:
 *
 *   THE DATABASE HALF is proved on the LIVE project, as the roles that
 *   actually read it, through `apply_migration` with `set role` inside a
 *   transaction that rolls back, with controls in the same transaction. See
 *   `scripts/probes/track_g_catalogue_grants.sql` and
 *   `scripts/probes/track_g_name_door.sql`.
 *
 *   THE READ HALF is proved by `lib/listings/lister-role-read.test.ts`, which
 *   builds a real row and reads the domain object back.
 *
 *   THIS PAGE IS THE THIRD HALF AND ONLY THE THIRD: what the reader SEES, from
 *   the real component with real copy, for the three roles the database can
 *   hold. Fixture props, stated as fixture props. It is not evidence that the
 *   read carries a name, and nothing here may be quoted as if it were.
 *
 * Two rows per role, because the interesting cases are the pair: WITH a name
 * and WITHOUT one. Without a name is not hypothetical, it is what every agent
 * and firm listing looked like until today.
 */
export default async function TrackGPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const messageHref = "/messages";

  /* A firm name and a person's name, both plainly invented, so no screenshot
     of this page can be mistaken for a capture of somebody real. */
  const NAMES: Record<string, string> = {
    owner: "Not used: the owner sentence names nobody",
    agent: "Chidi Okeke",
    firm: "Acme Properties Ltd",
  };

  return (
    <div className="mx-auto max-w-3xl p-page">
      <Stack>
        {LISTING_ROLES.map((role) => (
          <Section key={role} title={`listing_role = ${role}`} divided>
            <div className="flex flex-col gap-block" data-testid={`track-g-${role}`}>
              <div data-testid={`track-g-${role}-named`}>
                <ListingAgentCard
                  verified={false}
                  t={t}
                  messageHref={messageHref}
                  name={role === "owner" ? null : NAMES[role]}
                  listingRole={role}
                />
              </div>
              {/* THE STATE THE WHOLE PRODUCT WAS IN UNTIL TODAY: the role is
                  known and no name reaches the card. The agent and firm
                  sentences draw nothing, by design, because a template with
                  its placeholder showing is worse than silence. */}
              <div data-testid={`track-g-${role}-nameless`}>
                <ListingAgentCard
                  verified={false}
                  t={t}
                  messageHref={messageHref}
                  name={null}
                  listingRole={role}
                />
              </div>
            </div>
          </Section>
        ))}
        {/* And the pre Track G state: no role at all, which is the seed
            catalogue and the external shapes. It must draw what it always
            drew. */}
        <Section title="listing_role absent" divided>
          <div data-testid="track-g-absent">
            <ListingAgentCard verified={false} t={t} messageHref={messageHref} />
          </div>
        </Section>
      </Stack>
    </div>
  );
}

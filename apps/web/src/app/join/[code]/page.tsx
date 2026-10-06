import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/design-system/brand/Logo";
import { inviteDoor } from "@/lib/referral/server";
import { normaliseInviteCode } from "@/lib/referral/code";
import { Icon3D } from "@/components/ui/Icon3D";
import { SITE_CARD } from "@/lib/site/site-card";

export const dynamic = "force-dynamic";

async function doorFor(raw: string) {
  const code = normaliseInviteCode(raw);
  const door = code ? await inviteDoor(code) : null;
  return { code, door };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const copy = getDictionary(await getLocale()).publicDoors.invite;
  const { door } = await doorFor((await params).code);
  const title = door?.found && door.firstName ? copy.doorTitle.replace("{name}", door.firstName) : copy.doorTitleNoName;
  return { title, description: copy.doorBody, robots: { index: false, follow: false }, openGraph: { type: "website", siteName: "Vallo", title, description: copy.doorBody, images: [SITE_CARD] } };
}

/**
 * A5. `/join/<code>`: the invite door. It says who invited you (the first
 * word of their display name, nothing more), promises no reward, and leads
 * to sign-up with the code kept (`./start`). An unknown code still lets the
 * person join.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const copy = getDictionary(await getLocale()).publicDoors.invite;
  const { code, door } = await doorFor((await params).code);
  const known = Boolean(code && door?.found);
  /* A lookup the limiter refused (door null) names nobody but still keeps a
     well-formed code for sign-up; only a code the database answered "no" to
     is dropped. */
  const keep = code !== null && door?.found !== false;
  const title = known && door?.firstName ? copy.doorTitle.replace("{name}", door.firstName) : copy.doorTitleNoName;

  return (
    <main id="main" className="nf-shell nf-join">
      <div className="nf-door-page">
        <Logo size={40} wordSize={18} />
        {/* The screen's one Island (join.css): the gift, who sent it, the
            two doors. The mark stays outside it, still, as on the share door. */}
        <section className="nf-island nf-join__island" aria-labelledby="join-title">
          {/* The founder's 3D gift (30 September): somebody sent an invite. */}
          <span className="nf-join__gift grid size-[5.5rem] place-items-center" aria-hidden="true" data-art="gift">
            <Icon3D name="gift" size={88} priority />
          </span>
          <h1 id="join-title" className="nf-door-page__title">
            {title}
          </h1>
          <p className="nf-door-page__lede">{copy.doorBody}</p>
          {!keep && <p className="nf-caption text-[var(--nf-content-muted)]">{copy.doorUnknown}</p>}
          <div className="nf-door-page__actions">
            <ButtonLink href={keep && code ? `/join/${code}/start` : "/sign-up"} variant="primary" size="lg" full trailingIcon="arrow-right">
              {copy.doorStart}
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary" size="lg" full>
              {copy.doorSignIn}
            </ButtonLink>
          </div>
        </section>
        <p className="nf-caption text-[var(--nf-content-muted)]">{copy.noReward}</p>
      </div>
    </main>
  );
}

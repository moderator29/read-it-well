import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/design-system/brand/Logo";
import { inviteDoor } from "@/lib/referral/server";
import { normaliseInviteCode } from "@/lib/referral/code";

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
  return { title, description: copy.doorBody, robots: { index: false, follow: false }, openGraph: { title, description: copy.doorBody } };
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
  const title = known && door?.firstName ? copy.doorTitle.replace("{name}", door.firstName) : copy.doorTitleNoName;

  return (
    <main id="main" className="nf-shell">
      <div className="nf-door-page">
        <Logo size={40} wordSize={18} />
        <h1 className="nf-door-page__title">{title}</h1>
        <p className="nf-door-page__lede">{copy.doorBody}</p>
        {!known && <p className="nf-caption text-[var(--nf-content-muted)]">{copy.doorUnknown}</p>}
        <div className="nf-door-page__actions">
          <ButtonLink href={known && code ? `/join/${code}/start` : "/sign-up"} variant="primary" size="lg" full trailingIcon="arrow-right">
            {copy.doorStart}
          </ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary" size="lg" full>
            {copy.doorSignIn}
          </ButtonLink>
        </div>
        <p className="nf-caption text-[var(--nf-content-muted)]">{copy.noReward}</p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { PassportBook } from "@/components/passport/PassportBook";
import { withNext } from "@/lib/auth/next-link";
import { readPassportOf } from "@/lib/passport/passport-read";
import { buildPassportView } from "@/lib/passport/view";

export async function generateMetadata(): Promise<Metadata> {
  /* A passport is for signed-in members: never indexed, never unfurled. */
  return { title: getDictionary(await getLocale()).passportV2.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * A MEMBER'S PASSPORT, FOR OTHER SIGNED-IN MEMBERS.
 *
 * `/passport/<handle or account id>`. Opened from a profile's "View passport"
 * and from the card in a chat. It draws exactly what the database function
 * `passport_read` returns, which is only the lines the owner left on.
 *
 * Every refusal is one screen. Signed out is told to sign in (and sent back
 * here after). Everything else, whether the passport is off, the two of them
 * have blocked each other, or nobody has that address, is the same "not
 * available", so the page never says which. Your own address goes to your own
 * passport in settings, where the switches are.
 */
export default async function MemberPassportPage({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.passportV2;
  const found = await readPassportOf(who);

  if (found.state === "self") redirect("/settings/passport");

  if (found.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.title} fallback="/around" />
        <EmptyState
          icon="user-verified"
          art="id-check"
          title={copy.membersOnlyTitle}
          body={copy.membersOnlyBody}
          action={
            <ButtonLink href={withNext("/sign-in", `/passport/${encodeURIComponent(who)}`)} variant="primary" size="lg">
              {copy.signIn}
            </ButtonLink>
          }
          data-testid="passport-members-only"
        />
      </div>
    );
  }

  if (found.state === "unavailable") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.title} fallback="/around" />
        <EmptyState
          icon="user-verified"
          art="id-check"
          title={copy.unavailableTitle}
          body={copy.unavailableBody}
          data-testid="passport-unavailable"
        />
      </div>
    );
  }

  const view = buildPassportView(found.facts, copy, t.socialProfile.roleLine, locale);
  return (
    <div className="mx-auto max-w-2xl pb-4xl" data-testid="member-passport">
      <PageHeader title={copy.viewTitle.replace("{name}", view.name)} subtitle={copy.viewLede} fallback="/around" />
      <PassportBook view={view} copy={copy} />
    </div>
  );
}

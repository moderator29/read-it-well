import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { readMyHostDraft } from "@/lib/host/queries";
import { doorFrom } from "@/lib/host/doors";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { HostWizard, type PolicyOption } from "@/components/host/HostWizard";

export const metadata: Metadata = {
  title: "Become a host",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /host/apply: the Host wizard.
 *
 * A thin server shell: the signed-in person's own draft (or an empty one),
 * the cancellation policies a rate can name, and the wizard. Signed out, the
 * way in carries the intent home so the person lands back here.
 *
 * `?door=` IS THE ANSWER TO THE FIRST QUESTION, given on the previous screen.
 * `/host/start` draws the three stays doors of `GOVERNING-09`, and a door
 * carries the host type and the business kind the wizard would otherwise ask
 * for. It is read here and never trusted: `doorFrom` returns null for anything
 * that is not one of the three, and the wizard's own first step is still there
 * behind the Back control for anybody whose door turned out to be wrong.
 */
export default async function HostApplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  const params = await searchParams;
  const askedDoor = params.door;
  const doorId = Array.isArray(askedDoor) ? askedDoor[0] : askedDoor;
  const door = doorFrom(doorId);

  if (session.state !== "signed-in") {
    /* The door travels through sign in, so a person who picked "we are a
       hotel", signed in and came back does not have to pick it again. */
    const next = returnHref(door ? `/host/apply?door=${door.id}` : "/host/apply", "", "list");
    return (
      <HostShell logoLabel={t.a11y.logoHome}>
        <EmptyState
          icon="hotel"
          title="Sign in to become a host"
          body="Your application is saved to your account as you go, so it needs one. You will come straight back here."
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  const [draftRead, policiesRead] = await Promise.all([
    readMyHostDraft(),
    session.supabase
      .from("cancellation_policies")
      /* `is_free_until_hours` is what `GOVERNING-10` screen three's "Free
         cancellation" switch and its "Cancel up to" row are made of. Null
         means never free. */
      .select("id, name, summary, is_free_until_hours")
      .order("name")
      .limit(20),
  ]);
  const policies: PolicyOption[] = (policiesRead.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
    isFreeUntilHours: row.is_free_until_hours,
  }));

  /* An application whose contact and registration details could not be read
     is not drawn as a form: an empty form would save blanks over them. */
  if (draftRead.state === "unavailable") {
    return (
      <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
        <EmptyState
          icon="hotel"
          title="We could not open your application"
          body="Nothing has been changed. Your details are safe; we just could not load them this time. Try again in a moment."
          action={
            <ButtonLink href={door ? `/host/apply?door=${door.id}` : "/host/apply"} variant="primary" size="lg">
              Try again
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host" chromeBack={false}>
      <HostWizard
        initial={draftRead.draft}
        userId={session.user.id}
        policies={policies}
        locale={locale}
        door={door}
      />
    </HostShell>
  );
}

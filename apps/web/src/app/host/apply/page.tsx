import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { getMyHostDraft } from "@/lib/host/queries";
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
 */
export default async function HostApplyPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host/apply", "", "list");
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

  const [draft, policiesRead] = await Promise.all([
    getMyHostDraft(),
    session.supabase.from("cancellation_policies").select("id, name, summary").order("name").limit(20),
  ]);
  const policies: PolicyOption[] = (policiesRead.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    summary: row.summary,
  }));

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostWizard initial={draft} userId={session.user.id} policies={policies} locale={locale} />
    </HostShell>
  );
}

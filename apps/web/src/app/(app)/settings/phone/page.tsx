import type { Metadata } from "next";
import { formatDate, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { panelClass } from "@/components/ui/Panel";
import { resolveSession } from "@/lib/actions/session";
import { phoneConfirmationOn } from "@/lib/phone-otp/flag";
import { PhoneConfirmForm } from "./PhoneConfirmForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).trustVisible.phone.title };
}

/**
 * SETTINGS, PHONE (V-50): confirm one mobile number for this account.
 *
 * The page the three moments point to. Its states: signed out (sign in),
 * the flag off (nothing is needed, said plainly, and no form that cannot
 * send), a failed read (said, nothing changed), already confirmed (the last
 * four digits and the date, with a way to change it), and the form. Loading
 * is the settings route's own skeleton.
 */
export default async function PhoneSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.trustVisible.phone;
  const session = await resolveSession();

  const header = <PageHeader title={copy.title} subtitle={copy.subtitle} fallback="/settings" />;

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState
          icon="user-verified"
          title={copy.signedOutTitle}
          body={copy.signedOutBody}
          action={
            <ButtonLink href="/sign-in?next=%2Fsettings%2Fphone" variant="primary" size="lg">
              {copy.signIn}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (!(await phoneConfirmationOn())) {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <EmptyState icon="user-verified" title={copy.closedTitle} body={copy.closedBody} data-testid="phone-closed" />
      </div>
    );
  }

  const { data, error } = await (session.supabase as unknown as {
    from(t: string): {
      select(c: string): {
        eq(c: string, v: string): {
          maybeSingle(): Promise<{ data: { phone: string; confirmed_at: string } | null; error: unknown }>;
        };
      };
    };
  })
    .from("confirmed_phones")
    .select("phone, confirmed_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      <div className="space-y-block">
        <p className={TYPE.body}>{copy.why}</p>
        {error ? (
          <p role="status" className={TYPE.body}>
            {copy.readFailed}
          </p>
        ) : (
          <>
            {data && (
              <div className={panelClass({ className: "p-card" })} data-testid="phone-confirmed">
                <p className="nf-body text-[var(--nf-content-primary)]">
                  {copy.confirmed
                    .replace("{last}", data.phone.slice(-4))
                    .replace("{date}", formatDate(new Date(data.confirmed_at), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }))}
                </p>
              </div>
            )}
            {data && <h2 className="nf-group-label">{copy.change}</h2>}
            <PhoneConfirmForm copy={copy} />
          </>
        )}
      </div>
    </div>
  );
}

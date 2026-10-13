import type { Metadata } from "next";
import { requireSignedInPage } from "@/lib/actions/signed-in-page";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentRegisterForm } from "@/components/supply/AgentRegisterForm";
import { forRegister } from "@/components/supply/supply-copy";
import { OpenApplicationNotice } from "@/components/supply/OpenApplicationNotice";
import { readMyApplication } from "@/lib/agent/application-status";
import { isOpenApplication } from "@/lib/agent/open-application";
import { myOtherSideHeld } from "@/lib/agent/role-lock-read";

export const metadata: Metadata = {
  title: "Register as an agent",
  robots: { index: false, follow: false },
};

/**
 * THE AGENT'S DOOR, `GOVERNING-04`, four screens.
 *
 * Vallo does not remove the agent. This is the route that says so: an agent
 * registers as an agent, is checked harder than an owner because they are
 * handling somebody else's property, and publishes what they charge before a
 * tenant has spent anything finding out.
 *
 * A static segment beside `[role]`, the same as the owner's, so the
 * professional application behind `/profile/setup/professional` is untouched
 * and still serves the older flow.
 *
 * The locale comes down with the page because the fee screen formats both a
 * percentage and a naira figure, and neither may be built out of strings.
 */
export default async function AgentRegistrationPage() {
  await requireSignedInPage("/profile/setup/agent");
  const [locale, mine, otherSide]: [
    Locale,
    Awaited<ReturnType<typeof readMyApplication>>,
    Awaited<ReturnType<typeof myOtherSideHeld>>,
  ] = await Promise.all([getLocale(), readMyApplication(), myOtherSideHeld("agent")]);
  const t = getDictionary(locale);

  /* One account, one side: an owner's account does not become an agent's. */
  if (otherSide) {
    const r = t.supply.register;
    return (
      <OpenApplicationNotice
        heading={r.agent.title}
        reference=""
        copy={{ title: r.otherSideTitle, body: r.ownerNotAgent, action: r.backToProfile }}
        href="/profile"
      />
    );
  }

  /* An application still open is followed, not filed again. */
  if (mine.state === "found" && isOpenApplication(mine.application.status)) {
    const r = t.supply.register;
    return (
      <OpenApplicationNotice
        heading={r.agent.title}
        reference={mine.application.reference}
        copy={{ title: r.openTitle, body: r.openBody, action: r.trackIt }}
      />
    );
  }
  /* No back arrow on the page: the form draws the screen's one way back on
     its title row. It steps back through the form, and from the first screen
     it leaves to this route's declared parent, `/profile/setup`
     (`RegisterShell`). */
  return <AgentRegisterForm t={forRegister(t)} locale={locale} />;
}

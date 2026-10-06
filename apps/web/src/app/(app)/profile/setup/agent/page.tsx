import type { Metadata } from "next";
import { requireSignedInPage } from "@/lib/actions/signed-in-page";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentRegisterForm } from "@/components/supply/AgentRegisterForm";
import { forRegister } from "@/components/supply/supply-copy";

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
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  /* No back arrow on the page: the form draws the screen's one way back on
     its title row. It steps back through the form, and from the first screen
     it leaves to this route's declared parent, `/profile/setup`
     (`RegisterShell`). */
  return <AgentRegisterForm t={forRegister(t)} locale={locale} />;
}

import type { Metadata } from "next";
import { BackButton } from "@/components/site/BackButton";
import { parentOf } from "@/lib/nav/resolve";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentRegisterForm } from "@/components/supply/AgentRegisterForm";

/* Back to the declared parent (`route-parents.ts`), Session A's R14: this
   route declared one and drew no control, so Android back closed the app. */
const BACK = parentOf("/profile/setup/agent");

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
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <>
      <div className="pb-sm">
        <BackButton fallback={BACK.kind === "parent" ? BACK.href : "/profile"} />
      </div>
      <AgentRegisterForm t={t} locale={locale} />
    </>
  );
}

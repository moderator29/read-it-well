import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = {
  title: "Become an Agent",
  description:
    "List your properties on NaijaFinds, reach verified guests, manage bookings and get paid securely.",
};

/**
 * Become an Agent entry, matching reference 02: the community pitch and the six
 * numbered application steps, with a single Start Application call to action.
 */
export default async function BecomeAgentPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const j = t.agent.join;
  const steps = t.agent.apply.steps;

  const stepList: { n: number; icon: IconName; label: string }[] = [
    { n: 1, icon: "profile", label: steps.personal },
    { n: 2, icon: "verified", label: steps.identity },
    { n: 3, icon: "apartment", label: steps.business },
    { n: 4, icon: "booking", label: steps.documents },
    { n: 5, icon: "wallet", label: steps.payout },
    { n: 6, icon: "star", label: steps.review },
  ];

  const benefits: { icon: IconName; text: string }[] = [
    { icon: "verified", text: j.benefitReach },
    { icon: "apartment", text: j.benefitTools },
    { icon: "wallet", text: j.benefitEarn },
  ];

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="nf-shell py-14">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span
              className="mx-auto grid h-20 w-20 place-items-center rounded-[var(--nf-radius-2xl)]"
              style={{ background: "var(--nf-gradient-agent)" }}
            >
              <Icon name="apartment" size={54} />
            </span>
            <h1 className="nf-h1 mx-auto mt-6 max-w-[18ch]">{j.title}</h1>
            <p className="mx-auto mt-3 max-w-[52ch] text-[var(--nf-content-secondary)]">{j.body}</p>
          </div>

          {/* Benefits */}
          <ul className="mt-9 grid gap-3 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.text} className="nf-card flex items-center gap-3 p-4">
                <Icon name={b.icon} size={38} />
                <span className="text-[0.8125rem] font-medium">{b.text}</span>
              </li>
            ))}
          </ul>

          {/* Steps */}
          <div className="nf-card mt-4 p-2">
            <ol>
              {stepList.map((s, i) => (
                <li
                  key={s.n}
                  className={[
                    "flex items-center gap-4 px-4 py-3.5",
                    i > 0 ? "border-t border-[var(--nf-border-subtle)]" : "",
                  ].join(" ")}
                >
                  <span
                    className="nf-numeric grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-white"
                    style={{ background: "var(--nf-gradient-agent)" }}
                  >
                    {s.n}
                  </span>
                  <Icon name={s.icon} size={30} />
                  <span className="flex-1 font-medium">{s.label}</span>
                  <UiIcon name="arrow-right" size={16} className="text-[var(--nf-content-muted)]" />
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-7 flex justify-center">
            <Link href="/agents/apply" className="nf-btn nf-btn--primary nf-btn--lg">
              {j.start}
              <UiIcon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter t={t} />
    </>
  );
}

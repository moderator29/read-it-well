import type { Metadata } from "next";
import { SiteHead } from "@/components/site/SiteHead";
import Link from "next/link";
import { SupportChat } from "@/components/app/account/SupportChat";
import { HelpSearch } from "./HelpSearch";
import { ButtonLink } from "@/components/ui/Button";
import { aiConsentForViewer } from "@/lib/ai/consent-server";
import { FAQS, TRUST_LINKS } from "@/lib/support/help-articles";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Answers about both sides of Vallo: the switch between Property and Stays, booking a stay, holding a table, payments after inspection, refunds, listing, verification and languages.",
};

/**
 * Help centre.
 *
 * A searchable FAQ, grouped by topic. The answers are the real rules of the
 * platform written in plain language, not marketing copy, and anything the
 * page cannot answer routes to the contact page. The articles and the trust
 * links live in `lib/support/help-articles.ts`, which the in-app support home
 * reads as well.
 */

export default async function HelpPage() {
  return (
    <>
      <SiteHead
        plate="living-room-dusk"
        icon="support-chat"
        chip="Help centre"
        title="How can we help?"
        lede="Straight answers about both sides of Vallo: what the platform is for, the switch, booking a stay, holding a table, payments, refunds, listing and verification. Search below, or browse by topic."
      />
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ------------------------------------------------ trust surfaces */}
        <nav
          aria-label="Safety and policy"
          className="nf-rise mt-block grid gap-row sm:grid-cols-3"
          style={{ animationDelay: "60ms" }}
        >
          {TRUST_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nf-panel nf-panel--card block nf-card--interactive p-card-sm">
              <IconPlate size="sm">
                <UiIcon name={lineGlyphFor(link.icon)} size={20} />
              </IconPlate>
              <span className="mt-inline block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                {link.title}
              </span>
              <span className="mt-inline-tight block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {link.body}
              </span>
            </Link>
          ))}
        </nav>

        {/* --------------------------------------------- searchable list */}
        <div className="nf-rise mt-block" style={{ animationDelay: "100ms" }}>
          <HelpSearch faqs={FAQS} />
        </div>

        {/* ------------------------------------------- ask the agent */}
        <div className="nf-rise mt-block" style={{ animationDelay: "160ms" }}>
          <SupportChat aiConsented={await aiConsentForViewer()} />
        </div>

        {/* ------------------------------------------------ still stuck */}
        <div className="nf-panel nf-panel--card mt-section-tight flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-group">
            <IconPlate size="md" className="shrink-0">
              <UiIcon name="chat-bubble" size={20} />
            </IconPlate>
            <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
              Still stuck? A person replies within one business day.
            </p>
          </div>
          <ButtonLink href="/contact" variant="primary" className="shrink-0">
            Contact support
          </ButtonLink>
        </div>
      </div>
    </div>
    </>
  );
}

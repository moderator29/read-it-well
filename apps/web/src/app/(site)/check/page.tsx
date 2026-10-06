import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CheckForm } from "./CheckForm";

/**
 * V-61. /check: "IS THIS A VALLO AGENT?" A public door.
 *
 * Nigeria's property market runs on WhatsApp statuses, Instagram posts and
 * flyers, and Vallo cannot and should not stop agents advertising there. This
 * turns every such advert into a door back in: paste the number or the Vallo
 * code, and the answer is either the agent's public name (with the date their
 * identity was checked, only when it was), with a way to talk to them inside
 * Vallo, or one plain no that tells a renter not to pay.
 *
 * Open signed out, because the person holding the flyer has no account yet.
 * Rate limited in the action, never cached, never indexed with a query in it.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.trustDoors.check.metaTitle, description: t.trustDoors.check.lede };
}

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const copy = t.trustDoors.check;

  return (
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-xl pt-block">
        {/* The page's one subject is one Island (Session 3, stage 9): the same navy
            glass as the landing's hero card, the question asked once and
            answered once, in the answer card CheckForm draws under the field. */}
        <section className="nf-island p-lg">
          <p className="nf-overline text-[var(--nf-content-muted)]">{copy.chip}</p>
          <h1 className="nf-h2 mt-xs">{copy.title}</h1>
          <p className="nf-body mt-sm leading-relaxed text-[var(--nf-content-secondary)]">{copy.lede}</p>
          <CheckForm
            copy={copy}
            locale={locale}
            initial={typeof q === "string" ? q.slice(0, 40) : ""}
            warning={t.publicDoors.warning}
          />
          <Link href="/r" className="nf-caption mt-md inline-flex min-h-11 items-center gap-xs font-semibold text-[var(--nf-brand-primary)]">
            <UiIcon name="receipt" size={16} aria-hidden />
            {t.publicDoors.checkCard.receipt}
          </Link>
        </section>
        <p className="nf-caption mt-md text-center text-[var(--nf-content-muted)]">{copy.privacy}</p>
      </div>
    </div>
  );
}

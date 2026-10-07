import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatMoney } from "@vallo/i18n/core";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { readHeldPayment } from "@/lib/money/held-view";
import { heldModel } from "@/lib/money/held-model";
import { HELD_BY_LINE } from "@/lib/money/copy";
import { withNext } from "@/lib/auth/next-link";
import { ReleaseControl } from "./ReleaseControl";
import "./held-payment.css";

/**
 * STEP 8, FUNDED (D68d, B.3.5): the screen that wins the market. A renter in
 * Lagos who sent a deposit to somebody they met online sees, plainly, that the
 * money is held by a licensed provider and exactly what releases it; the
 * lister sees the same money held for them and what they will receive.
 * Everything on it is the provider's record, read under the viewer's own RLS:
 * no figure is computed here except the lister's take-home, which is the
 * amount less Payluk's reported fee and is shown only once Payluk reported it.
 */
export const metadata: Metadata = { title: "Escrow payment" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function HeldPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [locale, read] = await Promise.all([getLocale(), readHeldPayment(id)]);

  if (read.state === "signed-out") {
    return (
      <div className="mx-auto max-w-xl px-md">
        <PageHeader title="Escrow payment" fallback="/agreements" />
        <ButtonLink href={withNext("/sign-in", `/agreements/${id}/held`)} variant="primary" full>
          Sign in to see it
        </ButtonLink>
      </div>
    );
  }
  if (read.state === "unavailable") {
    return (
      <div className="mx-auto max-w-xl px-md">
        <PageHeader title="Escrow payment" fallback={`/agreements/${id}`} />
        <p className="nf-body">This could not be read just now. Nothing has moved; refresh to try again.</p>
      </div>
    );
  }

  if (read.state !== "ready") return notFound();
  const f = read.facts;
  const m = heldModel(f);
  const money = (minor: number) => formatMoney(minor, locale, "NGN");
  /* The figure huge, its unit softer at the same size (Plasma): the naira
     sign is the unit, the number is the figure. */
  const full = money(f.amountMinor);
  const figure = full.replace(/^₦\s?/, "");

  return (
    <div className="mx-auto max-w-xl px-md pb-2xl">
      <PageHeader title="Escrow payment" fallback={`/agreements/${id}`} />
      <section className="nf-held" aria-labelledby="held-title" data-testid="held-payment" data-role={f.role} data-status={f.status}>
        <header>
          <p className="nf-held__eyebrow">{f.placeTitle}</p>
          <h1 id="held-title" className="nf-held__title">
            {m.title}
          </h1>
        </header>

        <div className="nf-held__card" data-testid="held-card">
          <span className="nf-held__badge" data-tone={m.badge.tone}>
            <UiIcon name={m.badge.tone === "done" ? "check" : "shield-lock"} size={16} />
            {m.badge.label}
          </span>
          <p className="nf-held__figure" aria-label={full}>
            <span className="nf-held__unit" aria-hidden>
              ₦
            </span>
            <span aria-hidden>{figure}</span>
          </p>
          <p className="nf-held__by">
            <UiIcon name="shield-check" size={ICON.inline} />
            {HELD_BY_LINE}
          </p>
          {f.role === "lister" && (
            <div className="nf-held__split">
              <div>
                <p className="nf-held__label">Held for you</p>
                <p className="nf-held__value">{full}</p>
              </div>
              <hr aria-hidden />
              <div>
                <p className="nf-held__label">You receive</p>
                <p className="nf-held__value">
                  {m.receiveMinor !== null ? money(m.receiveMinor) : "After Payluk's fee"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="nf-held__eyebrow">What releases it</h2>
          <ol className="nf-held__steps mt-sm">
            {m.steps.map((step, i) => (
              <li key={step.title} className="nf-held__step" data-state={step.state}>
                <span className="nf-held__dot" aria-hidden>
                  {step.state === "done" ? <UiIcon name="check" size={16} /> : i + 1}
                </span>
                <div>
                  <p className="nf-held__step-title">{step.title}</p>
                  <p className="nf-held__step-body">
                    {i === 0 && f.moveIn ? `${step.body} Move-in: ${f.moveIn}.` : step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {f.milestones.length > 0 && (
          <div>
            <h2 className="nf-held__eyebrow">Released in stages</h2>
            <ul className="nf-held__milestones mt-sm">
              {f.milestones.map((ms) => (
                <li key={ms.position} className="nf-held__milestone">
                  <span>{ms.title}</span>
                  <span className="nf-held__value">
                    {money(ms.amountMinor)} · {ms.status === "released" ? "Released" : ms.status === "pending" ? "Held" : "Releasing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {m.note && <p className="nf-held__note">{m.note}</p>}

        {m.canRelease && <ReleaseControl agreementId={read.agreementId} arrangementId={read.arrangementId} />}
        {m.nextMilestone && (
          <ReleaseControl
            agreementId={read.agreementId}
            arrangementId={read.arrangementId}
            milestonePosition={m.nextMilestone.position}
            label={`Swipe to release ${money(m.nextMilestone.amountMinor)}: ${m.nextMilestone.title}`}
          />
        )}
      </section>
    </div>
  );
}

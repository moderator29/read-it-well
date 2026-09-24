import type { Metadata } from "next";
import { formatDate, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { readTenancyReviewTarget } from "@/lib/tenancy/review-queries";
import { TenancyReviewForm } from "./TenancyReviewForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).trustVisible.tenancy.title, robots: { index: false } };
}

/**
 * THE TENANCY REVIEW (V-59): a month after moving in, the tenant on the rent
 * charge is asked about the door first. States: signed out, a charge that is
 * not theirs or does not exist, too early (with the date it opens), already
 * reviewed, and the form. Loading is `loading.tsx` beside this file.
 */
export default async function TenancyReviewPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).trustVisible.tenancy;
  const target = await readTenancyReviewTarget(paymentId);

  const header = (subtitle?: string) => (
    <PageHeader title={copy.title} {...(subtitle ? { subtitle } : {})} fallback="/bookings?kind=inspection" />
  );

  if (target.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        {header()}
        <EmptyState
          icon="keys-home"
          title={copy.signedOut}
          body={copy.lede}
          action={
            <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/rent/review/${paymentId}`)}`} variant="primary" size="lg">
              {copy.signIn}
            </ButtonLink>
          }
        />
      </div>
    );
  }
  if (target.state === "missing") {
    return (
      <div className="mx-auto max-w-2xl">
        {header()}
        <EmptyState
          icon="keys-home"
          title={copy.missingTitle}
          body={copy.missingBody}
          action={
            <ButtonLink href="/bookings?kind=inspection" variant="primary" size="lg">
              {copy.openInspections}
            </ButtonLink>
          }
        />
      </div>
    );
  }
  if (target.state === "already") {
    return (
      <div className="mx-auto max-w-2xl">
        {header(target.title)}
        <p role="status" className={TYPE.body}>
          {copy.already}
        </p>
      </div>
    );
  }
  if (target.state === "not-open") {
    return (
      <div className="mx-auto max-w-2xl">
        {header(target.title)}
        <p role="status" className={TYPE.body}>
          {copy.notOpen} {copy.movedIn.replace("{date}", formatDate(new Date(`${target.moveIn}T12:00:00Z`), locale))}
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      {header(target.title)}
      <p className={`${TYPE.body} mb-block`}>{copy.lede}</p>
      <TenancyReviewForm paymentId={target.paymentId} copy={copy} />
    </div>
  );
}

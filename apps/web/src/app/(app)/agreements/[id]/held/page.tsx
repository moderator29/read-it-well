import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { readHeldPayment } from "@/lib/money/held-view";
import { withNext } from "@/lib/auth/next-link";
import { HeldPaymentBody } from "./HeldPaymentBody";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function HeldPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [locale, read] = await Promise.all([getLocale(), readHeldPayment(id)]);

  if (read.state === "signed-out") {
    return (
      <div className="mx-auto max-w-xl px-md">
        <PageHeader title="Escrow payment" fallback="/agreements" />
        <ButtonLink
          href={withNext("/sign-in", `/agreements/${id}/held`)}
          variant="primary"
          full
        >
          Sign in to see it
        </ButtonLink>
      </div>
    );
  }
  if (read.state === "unavailable") {
    return (
      <div className="mx-auto max-w-xl px-md">
        <PageHeader title="Escrow payment" fallback={`/agreements/${id}`} />
        <p className="nf-body">
          This could not be read just now. Nothing has moved; refresh to try
          again.
        </p>
      </div>
    );
  }

  if (read.state !== "ready") return notFound();
  const f = read.facts;
  /* D77: not paid in yet, the renter's next step is the funding screen. */
  if (f.role === "renter" && f.status === "awaiting_payment")
    redirect(`/agreements/${id}/fund`);

  return (
    <div className="mx-auto max-w-xl px-md pb-2xl">
      <PageHeader title="Escrow payment" fallback={`/agreements/${id}`} />
      <HeldPaymentBody
        facts={f}
        locale={locale}
        agreementId={read.agreementId}
        arrangementId={read.arrangementId}
      />
    </div>
  );
}

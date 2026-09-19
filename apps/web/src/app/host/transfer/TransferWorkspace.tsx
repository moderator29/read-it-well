"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EmptyState, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  closeBusiness,
  offerBusinessTransfer,
  respondToBusinessTransfer,
} from "@/lib/business-transfer/actions";
import type {
  TransferOffer,
  TransferableBusiness,
} from "@/lib/business-transfer/queries";

/**
 * The route out of the business precondition, drawn as the two doors it is.
 *
 * NOTHING ON THIS SCREEN IS A DEAD END, and that is the whole reason it
 * exists. Every business shows what is actually in the way for it, and every
 * one of those things carries the control that clears it: hand it over, close
 * it, or settle the diary on the screen where the diary lives.
 *
 * AN OFFER IS NOT AN ACT. The form sends an offer with a fourteen day clock on
 * it and the copy says so twice, because a person clearing a deletion
 * precondition needs to know the business has NOT moved yet. It moves when the
 * other person accepts, and not before.
 *
 * THE RECEIVER IS TOLD WHAT THEY ARE TAKING ON. The incoming panel says the
 * verified badge starts again and the consents are theirs to make, because
 * accepting a business is accepting its obligations and a consent given in
 * ignorance is not consent.
 */

const KIND_WORD: Record<string, string> = {
  hotel: "Hotel",
  serviced_apartments: "Serviced apartments",
  guest_house: "Guest house",
  resort: "Resort",
  shortlet_operator: "Shortlet operator",
  restaurant: "Restaurant",
  agency: "Agency",
};

const STATUS_WORD: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "With our team",
  UNDER_REVIEW: "Being read",
  MORE_INFO_REQUIRED: "Needs more from you",
  APPROVED: "Approved",
  PUBLISHED: "Live",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
};

function when(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TransferWorkspace({
  businesses,
  outgoing,
  incoming,
  partial,
}: {
  businesses: TransferableBusiness[];
  outgoing: TransferOffer[];
  incoming: TransferOffer[];
  partial: boolean;
}) {
  const trading = businesses.filter((business) => business.stillTrading).length;

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Hand over a business</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {businesses.length === 0
              ? "There is no business on this account."
              : trading === 0
                ? "Nothing here is trading, so none of it is holding anything up."
                : /*
                     THE VERB AGREES WITH `trading`, NOT WITH `businesses.length`,
                     and it used to agree with the wrong one. Two businesses with
                     one of them trading read "1 of your businesses are still
                     trading", which is the first sentence on a screen somebody
                     reaches while closing their account. The subject of the
                     sentence is the number that is trading; the plural of the
                     set it is drawn from is the possessive and is separate.
                  */
                  `${trading} of your ${businesses.length === 1 ? "business" : "businesses"} ${trading === 1 ? "is" : "are"} still trading. A business a stranger can book cannot be left with nobody behind it, so it has to move or close before an account can be deleted.`}
          </p>
        </div>
      </div>

      <Stack>
        {incoming.length > 0 && (
          <Section
            title="Offered to you"
            description="Nothing has moved. It is yours only if you accept it, and taking it on means taking on its bookings and its obligations."
          >
            <RowList boxed>
              {incoming.map((offer) => (
                <IncomingRow key={offer.transferId} offer={offer} />
              ))}
            </RowList>
          </Section>
        )}

        {businesses.length > 0 && (
          <Section
            title="Your businesses"
            description="Two ways out of each one: hand it to somebody who accepts it, or close it and take it off the market. Both leave every record where it is."
          >
            <RowList boxed>
              {businesses.map((business) => (
                <BusinessRow
                  key={business.id}
                  business={business}
                  offer={outgoing.find(
                    (entry) => entry.businessId === business.id && entry.status === "PENDING",
                  )}
                />
              ))}
            </RowList>
          </Section>
        )}

        {businesses.length === 0 && (
          <EmptyState
            icon="hotel"
            title="Nothing to hand over"
            body="There is no business on this account, so nothing here is standing between you and anything."
            action={
              <ButtonLink href="/settings/account" variant="secondary" size="lg">
                Back to my account
              </ButtonLink>
            }
          />
        )}

        {partial && (
          <p className={TYPE.rowMeta}>
            We could not check every part of this just now, so the list above may be short. Nothing
            has been changed.
          </p>
        )}
      </Stack>
    </>
  );
}

/* ------------------------------------------------------------- one business */

function BusinessRow({
  business,
  offer,
}: {
  business: TransferableBusiness;
  offer: TransferOffer | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const send = () => {
    setError(null);
    start(async () => {
      const result = await offerBusinessTransfer({
        businessId: business.id,
        email,
        note: note.length > 0 ? note : undefined,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.email ?? result.error);
        return;
      }
      setSent(result.data.expiresAt);
      setOpen(false);
      router.refresh();
    });
  };

  const takeBack = () => {
    if (!offer) return;
    setError(null);
    start(async () => {
      const result = await respondToBusinessTransfer({
        transferId: offer.transferId,
        decision: "withdraw",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const close = () => {
    setError(null);
    start(async () => {
      const result = await closeBusiness({ businessId: business.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Row className="flex-col items-stretch gap-sm py-md">
      <div className="grid gap-2xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-sm">
        <span className="min-w-0">
          <span className={`block ${TYPE.rowTitle}`}>{business.name}</span>
          <span className={`block ${TYPE.rowMeta}`}>
            {KIND_WORD[business.kind] ?? business.kind}
            {business.verified ? ", verified" : ""}
          </span>
        </span>
        <StatusPill
          tone={business.stillTrading ? "info" : "neutral"}
          className="justify-self-start sm:justify-self-end"
        >
          {STATUS_WORD[business.status] ?? business.status}
        </StatusPill>
      </div>

      {business.stillTrading && (
        <ul className={`space-y-2xs ${TYPE.rowMeta}`}>
          {business.status === "PUBLISHED" && <li>It is live, so anybody can find it.</li>}
          {business.publishedRooms > 0 && (
            <li>
              {business.publishedRooms === 1
                ? "One property under it is live and bookable."
                : `${business.publishedRooms} properties under it are live and bookable.`}
            </li>
          )}
          {business.futureReservations > 0 && (
            <li>
              {business.futureReservations === 1
                ? "One table is still booked here."
                : `${business.futureReservations} tables are still booked here.`}{" "}
              <Link
                href="/agent/bookings"
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
                data-testid={`transfer-diary-${business.id}`}
              >
                Settle the diary
              </Link>
            </li>
          )}
        </ul>
      )}

      {offer ? (
        <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-md">
          <p className={TYPE.rowTitle}>Offered, waiting on an answer</p>
          <p className={`mt-2xs ${TYPE.rowMeta}`}>
            {offer.counterpartyHandle
              ? `Sent to @${offer.counterpartyHandle}. `
              : "Sent. "}
            It runs out on {when(offer.expiresAt)} and nothing has moved yet.
          </p>
          <div className="mt-sm">
            <Button variant="secondary" onClick={takeBack} loading={busy} data-testid="transfer-withdraw">
              Take the offer back
            </Button>
          </div>
        </div>
      ) : sent ? (
        <p
          className={`${TYPE.rowMeta} text-[var(--nf-state-success)]`}
          data-testid="transfer-sent"
        >
          Offer sent. It runs out on {when(sent)}, and the business stays yours until they accept.
        </p>
      ) : open ? (
        <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-md">
          <label className="nf-label mb-2xs block" htmlFor={`email-${business.id}`}>
            Their email address on Vallo
          </label>
          <input
            id={`email-${business.id}`}
            type="email"
            inputMode="email"
            autoComplete="off"
            className="nf-field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid={`transfer-email-${business.id}`}
          />
          <p className={`mt-2xs ${TYPE.caption} text-[var(--nf-content-muted)]`}>
            They must already have a Vallo account. We send them the offer and nothing moves until
            they accept it.
          </p>
          <label className="nf-label mb-2xs mt-sm block" htmlFor={`note-${business.id}`}>
            A note for them, if you want one
          </label>
          <input
            id={`note-${business.id}`}
            type="text"
            className="nf-field"
            maxLength={400}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="mt-md grid gap-sm sm:grid-cols-2">
            <Button variant="secondary" full onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              full
              onClick={send}
              loading={busy}
              disabled={email.trim().length === 0}
              data-testid={`transfer-send-${business.id}`}
            >
              Send the offer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-sm sm:grid-cols-2">
          <Button
            variant="primary"
            full
            onClick={() => setOpen(true)}
            data-testid={`transfer-open-${business.id}`}
          >
            <UiIcon name="arrow-right" size={20} />
            Hand it over
          </Button>
          <Button
            variant="secondary"
            full
            onClick={close}
            loading={busy}
            data-testid={`transfer-close-${business.id}`}
          >
            Close it
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className={`${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {error}
        </p>
      )}
    </Row>
  );
}

/* --------------------------------------------------------- one offer to you */

function IncomingRow({ offer }: { offer: TransferOffer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const answer = (decision: "accept" | "decline") => {
    setError(null);
    start(async () => {
      const result = await respondToBusinessTransfer({
        transferId: offer.transferId,
        decision,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Row className="flex-col items-stretch gap-sm py-md">
      <span className="min-w-0">
        <span className={`block ${TYPE.rowTitle}`}>{offer.businessName}</span>
        <span className={`block ${TYPE.rowMeta}`}>
          {offer.counterpartyHandle ? `From @${offer.counterpartyHandle}. ` : ""}
          Runs out on {when(offer.expiresAt)}.
        </span>
      </span>
      {offer.note && <p className={`${TYPE.rowMeta} whitespace-pre-wrap`}>{offer.note}</p>}
      <p className={TYPE.rowMeta}>
        If you accept, its bookings and its diary become yours. The verified badge starts again from
        your own identity check, and the consents and attestations are yours to make.
      </p>
      <div className="grid gap-sm sm:grid-cols-2">
        <Button
          variant="secondary"
          full
          onClick={() => answer("decline")}
          loading={busy}
          data-testid="transfer-decline"
        >
          No thank you
        </Button>
        <Button
          variant="primary"
          full
          onClick={() => answer("accept")}
          loading={busy}
          data-testid="transfer-accept"
        >
          Accept it
        </Button>
      </div>
      {error && (
        <p role="alert" className={`${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
          {error}
        </p>
      )}
    </Row>
  );
}

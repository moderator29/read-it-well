"use client";

import { useState } from "react";
import { getDictionary } from "@vallo/i18n";
import { SuccessScreen, SuccessSheet, type SuccessDetail } from "@/components/ui/SuccessSheet";
import { Button } from "@/components/ui/Button";
import { successCopy, type SuccessMomentId } from "@/lib/ui/success-moments";

/** The moments the founder named first, at the top of the index. */
export const PREVIEW_MOMENTS: SuccessMomentId[] = [
  "passcodeSet",
  "passcodeChanged",
  "accountCreated",
  "passwordChanged",
  "kycSubmitted",
  "listingSubmitted",
  "listingLive",
  "stayRequested",
  "stayPaid",
  "payoutAccountAdded",
  "agreementConfirmed",
  "reviewPosted",
  "reportFiled",
  "flatmateInvited",
];

/* Fixture values for the moments whose line names something. Example data,
   for the screenshot only. */
const VALUES: Record<string, string> = {
  when: "Tue 30 Sep, 10:00",
  reference: "SUP-7F3A9C",
  promise: "A person at Vallo reads every report, usually within a day.",
  name: "The Harbour Kitchen (Example)",
  n: "4",
  place: "Flat 2, Yaba (Example)",
};

const MONEY: Partial<Record<SuccessMomentId, number>> = {
  stayPaid: 48_500_000,
  stayPaidRecorded: 48_500_000,
  rentPaid: 250_000_000,
  sharePaid: 62_500_000,
  moveInPaid: 250_000_000,
  cryptoPaid: 48_500_000,
};

/** A page behind the sheet, so the backdrop has something to sit over. */
export function Preview({
  moment,
  ids,
  shape,
  still,
}: {
  moment: SuccessMomentId | null;
  ids: SuccessMomentId[];
  shape: "sheet" | "page";
  still: boolean;
}) {
  const copy = getDictionary("en").success;
  const [open, setOpen] = useState(true);

  if (!moment) {
    const ordered = [...PREVIEW_MOMENTS, ...ids.filter((id) => !PREVIEW_MOMENTS.includes(id))];
    return (
      <main className="mx-auto grid max-w-2xl gap-md p-md" data-testid="success-index">
        <h1 className="nf-h2">Success moments</h1>
        <ul className="grid gap-xs">
          {ordered.map((id) => {
            const words = successCopy(copy, id, VALUES);
            return (
              <li key={id} className="nf-panel nf-panel--card flex flex-wrap items-center justify-between gap-xs p-sm">
                <span>
                  <strong>{words.title}</strong> <span className="nf-caption">{id}, {words.variant}, {words.object}</span>
                </span>
                <span className="flex gap-xs">
                  <a className="nf-btn nf-btn--glass nf-btn--sm" href={`?moment=${id}`}>
                    Sheet
                  </a>
                  <a className="nf-btn nf-btn--glass nf-btn--sm" href={`?moment=${id}&shape=page`}>
                    Page
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    );
  }

  const words = successCopy(copy, moment, VALUES);
  const money = MONEY[moment];
  const details: SuccessDetail[] | undefined =
    money !== undefined
      ? [
          { label: copy.detail.for, value: "Two-bedroom flat, Yaba (Example)" },
          { label: copy.detail.reference, value: "rm-book-7f3a9c21e4", mono: true },
        ]
      : undefined;
  const stillStyle = still ? (
    <style>{`.nf-success *, .nf-success, .nf-sheet--card { animation: none !important; transition: none !important; }`}</style>
  ) : null;

  if (shape === "page") {
    return (
      <>
        {stillStyle}
        <SuccessScreen
          variant={words.variant}
          object={words.object}
          title={words.title}
          body={words.body}
          amount={money !== undefined ? { minorUnits: money } : undefined}
          details={details}
          primary={{ label: "Go to Home", href: "/preview/success" }}
          secondary={money !== undefined ? { label: copy.close, href: "/preview/success" } : undefined}
          haptic={false}
        />
      </>
    );
  }

  return (
    <main className="mx-auto grid max-w-2xl gap-md p-md" data-still={still ? "1" : undefined}>
      {stillStyle}
      <h1 className="nf-h2">Behind the moment</h1>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="nf-panel nf-panel--card block h-24 p-md" />
      ))}
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open again
      </Button>
      <SuccessSheet
        open={open}
        onOpenChange={setOpen}
        variant={words.variant}
        object={words.object}
        title={words.title}
        body={words.body}
        amount={money !== undefined ? { minorUnits: money } : undefined}
        details={details}
        primary={{ label: copy.continue }}
        secondary={money !== undefined ? { label: copy.close } : undefined}
        haptic={false}
      />
    </main>
  );
}

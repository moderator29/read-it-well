/* Preview harness for PAY ON VALLO (founder rulings, 13 October 2026): the
   payment step's choice card, drawn by the real PayChoiceCard from recorded
   answers, one state per link. Continue answers as the server would after a
   pause; nothing is called and nothing is charged.

     /preview/pay                 rent or shortlet: Escrow preselected
     ?state=card                  the payer chose Pay by card
     ?state=sale                  a purchase: escrow only
     ?state=room                  a hotel room: card only
     ?state=lister                the lister reads it; the choice is not theirs
     ?state=locked                a payment has started

   The acceptance step is drawn by the real owner form at /preview/b1b/owner?step=2.
   Closed outside development by the preview layout. */
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import type { PayChoice } from "@/lib/payments/rail-choice";
import { PreviewPayChoice } from "./PreviewPayChoice";

const BOTH: PayChoice = { options: ["escrow", "card"], defaultRail: "escrow", chosen: null, rail: "escrow", payer: true, locked: null };

const STATES: Record<string, PayChoice> = {
  choose: BOTH,
  card: { ...BOTH, chosen: "card", rail: "card" },
  sale: { ...BOTH, options: ["escrow"] },
  room: { ...BOTH, options: ["card"], defaultRail: "card", rail: "card" },
  lister: { ...BOTH, payer: false },
  locked: { ...BOTH, locked: "payment_started" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "choose" } = await searchParams;
  const choice = STATES[state] ?? BOTH;
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-xl px-md py-lg">
      <nav className="mb-md flex flex-wrap gap-xs text-[length:var(--nf-text-caption)]" aria-label="Fixture states">
        {Object.keys(STATES).map((k) => (
          <a key={k} href={k === "choose" ? "/preview/pay" : `/preview/pay?state=${k}`} aria-current={k === state ? "page" : undefined} className="underline">
            {k}
          </a>
        ))}
      </nav>
      <h1 className="nf-h3 mb-md">Payment is open</h1>
      <PreviewPayChoice copy={t.payChoice} choice={choice} showContinue={state !== "room"} />
    </div>
  );
}

import type { SavedMethods } from "@/lib/admin/payments-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import type { AdminRead, SubjectLookup } from "@/lib/admin/queries";
import type { AdminUi } from "../_components/ui";
import { RemoveSavedMethod } from "./MethodLookup";

/**
 * The payment-method lookup panel.
 *
 * "Which card is on my account" and "take that bank account off, I lost the
 * phone" are two of the commonest things support is asked, and until this
 * panel an operator could answer neither without SQL. The search is a GET so
 * the answer is a URL a colleague can open; the person is found by handle,
 * address or id through the console's one subject lookup; the cards are
 * shown as the processor filed them (brand, last four, expiry) and the
 * accounts masked to their tail, because an operator never needs more than
 * the tail to confirm "the one ending 4821" with the person on the phone.
 *
 * Out of the page so the preview harness draws the same panel the desk draws.
 */
export function LookupPanel({
  term,
  lookup,
  methods,
  ui,
  base = "/admin/payments",
}: {
  term: string;
  lookup: AdminRead<SubjectLookup | null> | null;
  methods: AdminRead<SavedMethods> | null;
  ui: AdminUi;
  /** Where the GET lands. The desk's own path unless a harness says otherwise. */
  base?: string;
}) {
  return (
    <ui.Section
      title="Saved cards and bank accounts"
      hint="Find a person by handle, email address or account id to see what they have saved to pay with or be paid to. Cards show what the processor filed, never a number. Accounts show their last four digits only."
    >
      <form method="get" action={base} className="flex flex-wrap items-end gap-row">
        <label className="min-w-0 flex-1">
          <span className="nf-label">Handle, email or account id</span>
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="@handle, name@example.com, or an id"
            className="nf-field mt-inline-tight w-full"
          />
        </label>
        <button type="submit" className="nf-chip nf-chip--active shrink-0">
          Look up
        </button>
      </form>

      {term.length > 0 && <LookupResult lookup={lookup} methods={methods} ui={ui} />}
    </ui.Section>
  );
}

export function LookupResult({
  lookup,
  methods,
  ui,
}: {
  lookup: AdminRead<SubjectLookup | null> | null;
  methods: AdminRead<SavedMethods> | null;
  ui: AdminUi;
}) {
  if (!lookup || lookup.state !== "ok") {
    return (
      <div className="mt-sm">
        <ui.QueueUnavailable />
      </div>
    );
  }
  const found: SubjectLookup | null = lookup.data;
  if (found === null) {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        That does not read as a handle, an email address or an account id. Check it and try again.
      </p>
    );
  }
  if (found.state === "email-unavailable") {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        Looking a person up by email address is not switched on in this
        deployment yet. Search by their handle or their account id instead.
      </p>
    );
  }
  if (found.state === "none") {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        No account matches that {found.by === "email" ? "address" : found.by}.
      </p>
    );
  }

  const { subject } = found;
  const saved: SavedMethods | null = methods && methods.state === "ok" ? methods.data : null;

  return (
    <div className="mt-sm">
      <p className="nf-body font-semibold text-content">
        {subject.displayName ?? "No display name"}
        {subject.handle ? ` · @${subject.handle}` : ""}
      </p>
      {/* THE ID, UNCLIPPED: what an operator pastes into the money desk to
          find this person's wallet. */}
      <p className="font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
        {subject.userId}
      </p>

      {saved === null ? (
        <div className="mt-sm">
          <ui.QueueUnavailable />
        </div>
      ) : (
        <>
          <h3 className="nf-h4 mt-group">Saved cards</h3>
          {saved.cards.length === 0 ? (
            <p className="nf-body-sm mt-row text-content-2">No card has been saved on this account.</p>
          ) : (
            <ul className="nf-rows mt-row">
              {saved.cards.map((card) => {
                const brand = card.cardType
                  ? card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
                  : "Card";
                const describe = `${brand} ending ${card.last4 ?? "????"}`;
                return (
                  <li key={card.id} className="nf-row flex-wrap">
                    {/* The saved card's glass object, small, as the render
                        carries one per row. Never a card number beside it. */}
                    <BrandIcon name="card-tile" size={26} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="nf-body-sm block font-semibold text-content">
                        {describe}
                        {card.bank ? ` · ${card.bank}` : ""}
                      </span>
                      <span className="nf-caption block">
                        {card.expMonth && card.expYear
                          ? `Expires ${String(card.expMonth).padStart(2, "0")}/${card.expYear}`
                          : "Expiry not on file"}
                        {card.isDefault && !card.removedAt ? " · default" : ""}
                        {!card.reusable ? " · processor says no longer chargeable" : ""}
                        {" · saved "}
                        {ui.when(card.createdAt)}
                      </span>
                    </span>
                    {card.removedAt ? (
                      <ui.StatusChip label={`Removed ${ui.when(card.removedAt)}`} tone="neutral" />
                    ) : (
                      <RemoveSavedMethod kind="card" id={card.id} describe={describe} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="nf-h4 mt-group">Bank accounts</h3>
          {saved.accounts.length === 0 ? (
            <p className="nf-body-sm mt-row text-content-2">
              No bank account has been filed on this account.
            </p>
          ) : (
            <ul className="nf-rows mt-row">
              {saved.accounts.map((account) => {
                const describe = `${account.bankName} ending ${account.accountNumberMasked.slice(-4)}`;
                return (
                  <li key={account.id} className="nf-row flex-wrap">
                    {/* The bank account's object: the column, not a card. */}
                    <BrandIcon name="bank-column" size={26} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="nf-body-sm block font-semibold text-content">
                        {account.bankName}
                        {" · "}
                        <span className="nf-numeric">{account.accountNumberMasked}</span>
                      </span>
                      <span className="nf-caption block">
                        {account.accountName}
                        {account.isDefault && !account.removedAt ? " · default" : ""}
                        {" · filed "}
                        {ui.when(account.createdAt)}
                      </span>
                    </span>
                    {account.removedAt ? (
                      <ui.StatusChip
                        label={`Removed ${ui.when(account.removedAt)}`}
                        tone="neutral"
                      />
                    ) : (
                      <RemoveSavedMethod kind="account" id={account.id} describe={describe} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

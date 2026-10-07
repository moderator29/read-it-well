import Link from "next/link";
import type { Locale } from "@vallo/i18n/core";
import type { BalanceRead } from "@/lib/money/member-wallet";
import { ACTION_LABEL, HELD_BY, HELD_BY_HREF, HELD_BY_LINK, NOT_LIVE_BODY, NOT_LIVE_TITLE } from "@/lib/money/balance-copy";
import { State } from "@/components/ui/State";
import { ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { BalanceScreen } from "./BalanceScreen";
import { BalanceOnboarding } from "./BalanceOnboarding";
import "@/app/css/money-layer.css";

/**
 * Every signed-in state of /wallet, as one component the route draws with
 * the real read and the preview harness draws with fixture reads. The route
 * keeps the signed-out door itself (`withNext`, its own test).
 *
 * NOT LIVE IS DESIGNED, NOT APOLOGISED FOR (D72: "the honest not-live state
 * must be as beautiful as the live one"). No figure, no zero and no sample:
 * the one 3D object, what is true today, and what will open here, each in
 * the words the flows themselves use, then the way to the records that
 * exist now.
 */
const OPENS: { key: keyof typeof ACTION_LABEL; icon: UiIconName; sub: string }[] = [
  { key: "add", icon: "plus", sub: "From your own bank or card, on our escrow partner's own payment page." },
  { key: "withdraw", icon: "bank", sub: "To a bank account in your name, with every fee shown before you confirm." },
  { key: "send", icon: "arrow-up", sub: "To another Vallo member, by their phone number." },
];

export function BalanceView({ read, locale }: { read: Exclude<BalanceRead, { state: "signed-out" }>; locale: Locale }) {
  if (read.state === "not-live") {
    return (
      <div className="mt-inline space-y-block" data-testid="balance-not-live" data-reason={read.reason}>
        <div className="nf-mhead">
          <span className="nf-mhead__art">
            <BrandIcon name="wallet-secure" size={112} priority />
          </span>
          <h2 className="nf-mhead__title">{NOT_LIVE_TITLE}</h2>
          <p className="nf-mhead__body">{NOT_LIVE_BODY}</p>
        </div>
        <ListGroup label="What opens here">
          {OPENS.map((row) => (
            <ListRow
              key={row.key}
              leading={
                <IconPlate size="sm" tone="brand">
                  <UiIcon name={row.icon} size={ICON_PLATE_GLYPH.sm} />
                </IconPlate>
              }
              title={row.key === "send" ? "Transfer" : ACTION_LABEL[row.key]}
              sub={row.sub}
            />
          ))}
        </ListGroup>
        <div className="nf-mhead__actions">
          <ButtonLink href="/payments" variant="primary" size="lg" full>
            See your payments
          </ButtonLink>
          <ButtonLink href="/receipts" variant="secondary" size="lg" full>
            Your receipts
          </ButtonLink>
        </div>
        <p className="nf-caption text-center text-[var(--nf-content-muted)]">
          {HELD_BY}{" "}
          <Link href={HELD_BY_HREF} className="underline">
            {HELD_BY_LINK}
          </Link>
        </p>
      </div>
    );
  }
  if (read.state === "onboarding") return <BalanceOnboarding state={read.onboarding} gaps={read.gaps} />;
  if (read.state === "error") {
    return (
      <div className="mt-block">
        <State
          kind="error"
          title="Your balance could not be read"
          body="Nothing has moved. We show no figure rather than a wrong one. Try again in a moment."
          primary={{ href: "/wallet", label: "Try again" }}
        />
      </div>
    );
  }
  return <BalanceScreen figures={read.figures} movements={read.movements} live={read.live} locale={locale} now={Date.parse(read.readAt)} />;
}

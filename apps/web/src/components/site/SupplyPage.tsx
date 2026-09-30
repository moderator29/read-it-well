import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SiteHead } from "@/components/site/SiteHead";
import { JsonLd } from "@/components/site/JsonLd";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { GUARANTEE_CONTRIBUTION_NOTE, NO_INSPECTION_FEE } from "@/lib/money/copy";
import type { ListerFees } from "@/lib/site/lister-fees";
import { bpsLabel } from "@/lib/site/move-in-calculator";
import { breadcrumbLd, webPageLd } from "@/lib/site/structured-data";
import { SUPPLY_DOORS, SUPPLY_ROLES, type SupplyDoor } from "@/lib/site/supply-doors";

/** `?next=` for the sign-up and sign-in doors, carrying the setup address. */
export function startHref(base: "/sign-up" | "/sign-in", setupPath: string): string {
  return `${base}?next=${encodeURIComponent(setupPath)}`;
}

/** The fee table's rows, from the live rates when they could be read. */
export function feeRows(fees: ListerFees | null): { title: string; value: string; sub?: string }[] {
  if (!fees) return [];
  const free = (bps: number, flat: number) => bps === 0 && flat === 0;
  return [
    {
      title: "Listing a property or a stay",
      value: free(fees.listingFeeBps, fees.listingFeeFlatMinor) ? "Free" : bpsLabel(fees.listingFeeBps),
    },
    {
      title: "Vallo's commission on a payment",
      value: free(fees.commissionBps, fees.commissionFlatMinor) ? "None" : bpsLabel(fees.commissionBps),
    },
    ...(fees.guaranteeBps !== null
      ? [
          {
            title: "Vallo Guarantee contribution",
            value: bpsLabel(fees.guaranteeBps),
            sub: "Of each payment, from your share, into a separate reserve. Never added to the price a renter or guest pays.",
          },
        ]
      : []),
    { title: "Inspection fee", value: "None", sub: NO_INSPECTION_FEE },
  ];
}

/**
 * A9. One supply page: the head, the steps, the fee table, payouts, what is
 * looked at and what is not, an Example desk, and the two Start doors. Every
 * fact comes from `lib/site/supply-doors.ts`, which reads it from the module
 * that enforces it.
 */
export function SupplyPage({ door, fees, t }: { door: SupplyDoor; fees: ListerFees | null; t: Dictionary }) {
  const s = t.publicDoors.supply;
  const rows = feeRows(fees);
  const others = SUPPLY_ROLES.filter((role) => role !== door.role).map((role) => SUPPLY_DOORS[role]);
  const actions = (
    <div className="nf-supply__actions">
      <ButtonLink href={startHref("/sign-up", door.setupPath)} variant="primary" size="lg" trailingIcon="arrow-right">
        {s.startNew}
      </ButtonLink>
      <ButtonLink href={startHref("/sign-in", door.setupPath)} variant="secondary" size="lg">
        {s.startExisting}
      </ButtonLink>
    </div>
  );

  return (
    <>
      <JsonLd
        data={[
          webPageLd({ path: door.path, name: door.title, description: door.metaDescription }),
          breadcrumbLd([
            { name: "Vallo", path: "/" },
            { name: door.chip, path: door.path },
          ]),
        ]}
      />
      <SiteHead plate={door.plate} icon="keys-home" chip={door.chip} title={door.title} lede={door.lede}>
        {actions}
      </SiteHead>

      <div className="nf-shell pb-section">
        <div className="nf-supply mx-auto max-w-3xl">
          <section aria-labelledby="supply-steps">
            <h2 id="supply-steps" className="nf-supply__h2">
              {s.stepsTitle}
            </h2>
            <ol className="nf-supply__steps">
              {door.steps.map((step, index) => (
                <li key={step.title} className="nf-pd-card nf-supply__step">
                  <IconPlate size="md" tone={index === door.steps.length - 1 ? "success" : "brand"}>
                    <UiIcon name={step.icon} size={20} />
                  </IconPlate>
                  <div>
                    <p className="nf-supply__step-n nf-numeric">{index + 1}</p>
                    <h3 className="nf-supply__h3">{step.title}</h3>
                    <p className="nf-supply__body">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="supply-fees">
            <h2 id="supply-fees" className="nf-supply__h2">
              {s.feesTitle}
            </h2>
            {rows.length > 0 ? (
              <ListGroup>
                {rows.map((row) => (
                  <ListRow
                    key={row.title}
                    title={row.title}
                    sub={row.sub}
                    value={<span className="nf-numeric font-semibold">{row.value}</span>}
                  />
                ))}
              </ListGroup>
            ) : (
              <p className="nf-supply__body">{GUARANTEE_CONTRIBUTION_NOTE}</p>
            )}
          </section>

          <section aria-labelledby="supply-payout">
            <h2 id="supply-payout" className="nf-supply__h2">
              {s.payoutTitle}
            </h2>
            <div className="nf-pd-card nf-supply__prose">
              {door.payout.map((line) => (
                <p key={line} className="nf-supply__body">
                  {line}
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="supply-checks">
            <h2 id="supply-checks" className="nf-supply__h2">
              {s.checksTitle}
            </h2>
            <div className="nf-supply__two">
              <ListGroup label={s.checksDo}>
                {door.checks.map((line) => (
                  <ListRow key={line} leading={<UiIcon name="circle-check" size={20} className="text-[var(--nf-state-success)]" />} title={<span className="nf-supply__row-text">{line}</span>} />
                ))}
              </ListGroup>
              <ListGroup label={s.checksDont}>
                {door.notDone.map((line) => (
                  <ListRow key={line} leading={<UiIcon name="info" size={20} className="text-[var(--nf-content-muted)]" />} title={<span className="nf-supply__row-text">{line}</span>} />
                ))}
              </ListGroup>
            </div>
          </section>

          <section aria-labelledby="supply-example">
            <h2 id="supply-example" className="nf-supply__h2">
              {s.exampleTitle}
            </h2>
            <ListGroup
              label={s.exampleTitle}
              action={
                <StatusBadge tone="info" size="sm">
                  {s.exampleBadge}
                </StatusBadge>
              }
            >
              {door.example.map((row) => (
                <ListRow
                  key={row.title}
                  leading={
                    <IconPlate size="sm" tone="neutral">
                      <UiIcon name="document" size={20} />
                    </IconPlate>
                  }
                  title={row.title}
                  sub={row.sub}
                  status={<StatusBadge tone="neutral" size="sm">{row.value}</StatusBadge>}
                />
              ))}
            </ListGroup>
            <p className="nf-caption mt-xs text-[var(--nf-content-muted)]">{s.exampleNote}</p>
          </section>

          <section className="nf-pd-card nf-supply__close" aria-label={door.title}>
            <h2 className="nf-supply__h3">{door.title}</h2>
            {actions}
          </section>

          <nav aria-label={s.otherDoors} className="nf-supply__others">
            <p className="nf-section-label">{s.otherDoors}</p>
            <ListGroup>
              {others.map((other) => (
                <ListRow key={other.path} href={other.path} title={other.chip} sub={other.title} chevron />
              ))}
            </ListGroup>
          </nav>
        </div>
      </div>
    </>
  );
}

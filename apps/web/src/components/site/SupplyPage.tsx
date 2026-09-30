import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SiteHead } from "@/components/site/SiteHead";
import { JsonLd } from "@/components/site/JsonLd";
import { EdgeLap } from "@/components/site/EdgeLap";
import { DisclosureInline } from "@/components/app/DisclosureInline";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { GUARANTEE_CONTRIBUTION_NOTE } from "@/lib/money/copy";
import type { ListerFees } from "@/lib/site/lister-fees";
import { bpsLabel } from "@/lib/site/move-in-calculator";
import { breadcrumbLd, faqLd, webPageLd } from "@/lib/site/structured-data";
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
      title: "Listing",
      value: free(fees.listingFeeBps, fees.listingFeeFlatMinor) ? "Free" : bpsLabel(fees.listingFeeBps),
      sub: "To publish a property or a stay",
    },
    {
      title: "Commission",
      value: free(fees.commissionBps, fees.commissionFlatMinor) ? "None" : bpsLabel(fees.commissionBps),
      sub: "On a payment through Vallo",
    },
    ...(fees.guaranteeBps !== null
      ? [
          {
            title: "Guarantee",
            value: bpsLabel(fees.guaranteeBps),
            sub: "Of each payment, from your share",
          },
        ]
      : []),
    { title: "Inspection fee", value: "None", sub: "Viewing through Vallo is free" },
  ];
}

/** Under the fee tiles when the Guarantee row prints: where that money goes. */
export const GUARANTEE_TILE_NOTE =
  "The Guarantee contribution goes into a separate reserve. It is never added to the price a renter or guest pays.";

/**
 * A9. One supply page, in the landing's register (the re-audit of 30
 * September): the plate head with the two doors and three short facts; the
 * steps as one numbered track in one card, each on a round tinted plate
 * (spec section 17); what it costs as figure tiles read from the live rates,
 * with payouts under them; what is looked at and what is not; an Example
 * desk; the common questions (FAQPage data, the page's own sentences); and
 * the landing's final card. Every fact comes from `lib/site/supply-doors.ts`,
 * which reads it from the module that enforces it.
 */
export function SupplyPage({ door, fees, t }: { door: SupplyDoor; fees: ListerFees | null; t: Dictionary }) {
  const s = t.publicDoors.supply;
  const rows = feeRows(fees);
  const others = SUPPLY_ROLES.filter((role) => role !== door.role).map((role) => SUPPLY_DOORS[role]);
  const actions = (full: boolean) => (
    <div className={full ? "nf-close__actions" : "nf-supply__actions"}>
      <ButtonLink href={startHref("/sign-up", door.setupPath)} variant="primary" size="lg" trailingIcon="arrow-right" full={full}>
        {s.startNew}
      </ButtonLink>
      <ButtonLink href={startHref("/sign-in", door.setupPath)} variant="secondary" size="lg" full={full}>
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
          faqLd(door.faq),
        ]}
      />
      <SiteHead plate={door.plate} icon="keys-home" chip={door.chip} title={door.title} lede={door.lede}>
        {actions(false)}
        <ul className="nf-hero-facts nf-supply__facts" aria-label={s.factsLabel}>
          {door.facts.map((fact) => (
            <li key={fact}>
              <UiIcon name="circle-check" size={16} aria-hidden />
              {fact}
            </li>
          ))}
        </ul>
      </SiteHead>

      <div className="nf-shell">
        <div className="nf-supply mx-auto max-w-3xl">
          <section aria-labelledby="supply-steps">
            <h2 id="supply-steps" className="nf-supply__h2">
              {s.stepsTitle}
            </h2>
            {/* One card, one track: each step on a round tinted plate, a
                hairline running from plate to plate, the last one done. */}
            <ol className="nf-pd-card nf-supply__track">
              {door.steps.map((step, index) => (
                <li key={step.title} className="nf-supply__step">
                  <span className="nf-supply__rail" aria-hidden="true">
                    <IconPlate size="sm" shape="round" tone={index === door.steps.length - 1 ? "success" : "brand"}>
                      <UiIcon name={step.icon} size={20} />
                    </IconPlate>
                  </span>
                  <div className="nf-supply__step-text">
                    <p className="nf-supply__step-n nf-numeric">{String(index + 1).padStart(2, "0")}</p>
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
              <>
                <ul className="nf-figure-tiles nf-supply__tiles">
                  {rows.map((row) => (
                    <li key={row.title} className="nf-kpi nf-supply__tile">
                      <p className="nf-kpi__head">
                        <span className="nf-section-label nf-kpi__label">{row.title}</span>
                      </p>
                      <p className="nf-kpi__figure nf-numeric">{row.value}</p>
                      {row.sub ? <p className="nf-kpi__sub">{row.sub}</p> : null}
                    </li>
                  ))}
                </ul>
                {fees?.guaranteeBps != null ? <p className="nf-supply__note">{GUARANTEE_TILE_NOTE}</p> : null}
              </>
            ) : (
              <p className="nf-pd-card nf-supply__body">{GUARANTEE_CONTRIBUTION_NOTE}</p>
            )}
          </section>

          <section aria-labelledby="supply-payout">
            <h2 id="supply-payout" className="nf-supply__h2">
              {s.payoutTitle}
            </h2>
            <div className="nf-pd-card nf-supply__payout">
              <IconPlate size="md" shape="round" tone="success">
                <UiIcon name="bank" size={20} />
              </IconPlate>
              <div className="nf-supply__prose">
                {door.payout.map((line) => (
                  <p key={line} className="nf-supply__body">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="supply-checks">
            <h2 id="supply-checks" className="nf-supply__h2">
              {s.checksTitle}
            </h2>
            <div className="nf-supply__two">
              <ListGroup label={s.checksDo}>
                {door.checks.map((line) => (
                  <ListRow
                    key={line}
                    leading={
                      <IconPlate size="sm" shape="round" tone="success">
                        <UiIcon name="circle-check" size={20} />
                      </IconPlate>
                    }
                    title={<span className="nf-supply__row-text">{line}</span>}
                  />
                ))}
              </ListGroup>
              <ListGroup label={s.checksDont}>
                {door.notDone.map((line) => (
                  <ListRow
                    key={line}
                    leading={
                      <IconPlate size="sm" shape="round" tone="neutral">
                        <UiIcon name="info" size={20} />
                      </IconPlate>
                    }
                    title={<span className="nf-supply__row-text">{line}</span>}
                  />
                ))}
              </ListGroup>
            </div>
          </section>

          <section aria-labelledby="supply-example">
            <div className="nf-supply__h2-row">
              <h2 id="supply-example" className="nf-supply__h2">
                {s.exampleTitle}
              </h2>
              <StatusBadge tone="neutral" size="sm">
                {s.exampleBadge}
              </StatusBadge>
            </div>
            <ListGroup>
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
            <p className="nf-supply__note">{s.exampleNote}</p>
          </section>

          <section aria-labelledby="supply-faq">
            <h2 id="supply-faq" className="nf-supply__h2">
              {s.faqTitle}
            </h2>
            <ListGroup>
              {door.faq.map((item) => (
                <li key={item.q} className="nf-list-item">
                  <DisclosureInline title={item.q} titleClassName="nf-faq-q" className="nf-faq-item">
                    <p className="nf-faq-a">{item.a}</p>
                  </DisclosureInline>
                </li>
              ))}
            </ListGroup>
          </section>
        </div>
      </div>

      {/* The landing's final card, so the page closes the way the front door
          does: the brand plate, the title, one line and the two doors. */}
      <section className="nf-close-room nf-supply__close-room" aria-labelledby="supply-close">
        <div className="nf-hero-grid nf-close-room__grid" aria-hidden="true" />
        <div className="nf-shell">
          <div className="nf-close">
            <div className="nf-close__brand">
              <EdgeLap as="span" className="nf-close__plate" aria-hidden="true">
                <LogoMark size={34} />
              </EdgeLap>
            </div>
            <h2 id="supply-close" className="nf-close__title">
              {door.title}
            </h2>
            <p className="nf-close__body">{s.closeBody}</p>
            {actions(true)}
          </div>
        </div>
      </section>

      <div className="nf-shell pb-section">
        <nav aria-label={s.otherDoors} className="nf-supply__others mx-auto max-w-3xl">
          <p className="nf-section-label">{s.otherDoors}</p>
          <ListGroup>
            {others.map((other) => (
              <ListRow
                key={other.path}
                href={other.path}
                leading={
                  <IconPlate size="sm" shape="round" tone="brand">
                    <UiIcon name={other.role === "host" ? "building-hotel" : other.role === "agent" ? "id-card" : "house"} size={20} />
                  </IconPlate>
                }
                title={other.chip}
                sub={other.title}
                chevron
              />
            ))}
          </ListGroup>
        </nav>
      </div>
    </>
  );
}

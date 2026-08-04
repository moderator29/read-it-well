import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Listing } from "@/lib/listings/types";
import type { ListingAccessView } from "@/lib/listings/access-queries";

/**
 * Light, water, and getting through the gate.
 *
 * The three questions a Nigerian guest asks before the price, and the reason
 * nobody else can answer them: they are structured columns here, not a tick box
 * called "Backup Power" that flattens Band A and a generator running seven to
 * eleven into the same claim.
 *
 * Unanswered is rendered as unanswered. A host who has not said whether there
 * is light must not have silence read as a yes, so the row says so plainly and
 * points the guest at the one control that gets a real answer: the message
 * thread with the host.
 *
 * The gate block has three states and they are all designed. Before a booking
 * is confirmed the guest is told the details exist and when they arrive. After
 * confirmation the real details are here, read through the caller's own
 * policies. And a listing with no gate at all simply omits the block, because a
 * panel explaining the absence of a gate is noise.
 */

const GRID_LABEL: Record<string, { label: string; detail: string }> = {
  BAND_A: { label: "Band A", detail: "20 hours a day or more from the grid" },
  MOSTLY_ON: { label: "Mostly on", detail: "Light most of the day, with gaps" },
  PATCHY: { label: "Patchy", detail: "On and off through the day" },
  RARELY: { label: "Rarely on", detail: "A few hours at best" },
  NONE: { label: "No grid supply", detail: "Nothing from the distribution company" },
};

/**
 * The backup as it belongs inside a sentence, article and all.
 *
 * The first version of this read "Band A and generator and inverter, 24 hours a
 * day", which is two ANDs doing different jobs in one clause and reads as a
 * mistake. A label list and a sentence list are not the same list.
 */
const BACKUP_PHRASE: Record<string, string> = {
  NONE: "no backup",
  GENERATOR: "a generator",
  INVERTER: "an inverter",
  SOLAR: "solar",
  GENERATOR_INVERTER: "a generator and inverter",
};

const WATER_LABEL: Record<string, { label: string; detail: string }> = {
  TREATED_MAINS: { label: "Treated mains", detail: "Running water from the mains" },
  BOREHOLE: { label: "Borehole", detail: "The property's own borehole" },
  PUMPED_STORAGE: { label: "Pumped storage", detail: "Tank filled and pumped through" },
  TANKER: { label: "Tanker delivery", detail: "Water is bought in and stored" },
  NONE: { label: "No running water", detail: "Water is fetched" },
};

export function ListingUtilities({
  utilities,
  access,
  bookingConfirmed,
}: {
  utilities: Listing["utilities"];
  /** The real gate details, or null when the caller may not see them. */
  access: ListingAccessView | null;
  /** True when this caller holds a confirmed booking on this listing. */
  bookingConfirmed: boolean;
}) {
  if (!utilities) return null;

  const grid = utilities.powerGrid ? GRID_LABEL[utilities.powerGrid] : undefined;
  const backup = utilities.powerBackup ? BACKUP_PHRASE[utilities.powerBackup] : undefined;
  const water = utilities.waterSupply ? WATER_LABEL[utilities.waterSupply] : undefined;
  const hours = utilities.powerBackupHours;

  const powerAnswered = Boolean(grid || backup);
  const nothingAnswered = !powerAnswered && !water && !utilities.hasEstateAccess;
  if (nothingAnswered) return null;

  const runs =
    backup && backup !== "no backup" && typeof hours === "number"
      ? `${backup}, running ${hours} ${hours === 1 ? "hour" : "hours"} a day`
      : backup;

  const powerLine = grid
    ? runs
      ? `${grid.label}, with ${runs}`
      : grid.label
    : runs
      ? `${runs.charAt(0).toUpperCase()}${runs.slice(1)}`
      : "Grid supply not stated";

  return (
    <section aria-labelledby="utilities-heading" className="nf-card p-5 sm:p-6">
      <h2 id="utilities-heading" className="nf-h3">
        Light, water and getting in
      </h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
        The three things worth knowing before you book, answered by the host.
      </p>

      <dl className="mt-5 space-y-4">
        <Row
          icon="chart-growth"
          term="Light"
          answered={powerAnswered}
          value={
            powerAnswered ? (
              <>
                <span className="block font-semibold text-[var(--nf-content-primary)]">
                  {powerLine}
                </span>
                {grid && (
                  <span className="mt-0.5 block text-[0.8125rem] text-[var(--nf-content-muted)]">
                    {grid.detail}
                  </span>
                )}
                {utilities.prepaidMeter && (
                  <span className="mt-2 block">
                    <span className="nf-badge">Prepaid meter</span>
                  </span>
                )}
              </>
            ) : null
          }
        />

        <Row
          icon="shield-check"
          term="Water"
          answered={Boolean(water)}
          value={
            water ? (
              <>
                <span className="block font-semibold text-[var(--nf-content-primary)]">
                  {water.label}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] text-[var(--nf-content-muted)]">
                  {water.detail}
                </span>
              </>
            ) : null
          }
        />

        {utilities.hasEstateAccess && (
          <div className="flex gap-4 border-t border-[var(--nf-border-subtle)] pt-4">
            <span className="block h-10 w-10 shrink-0">
              <BrandIcon name="keys-home" fill />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
                The gate
              </dt>
              <dd className="mt-1">
                {access ? (
                  <div data-testid="gate-details">
                    {access.estateName && (
                      <p className="font-semibold text-[var(--nf-content-primary)]">
                        {access.estateName}
                      </p>
                    )}
                    {access.gateDirections && (
                      <p className="mt-1 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                        {access.gateDirections}
                      </p>
                    )}
                    {access.securityPhone && (
                      <p className="nf-numeric mt-2 text-[0.875rem] text-[var(--nf-content-secondary)]">
                        Security desk:{" "}
                        <a
                          href={`tel:${access.securityPhone.replace(/\s+/g, "")}`}
                          className="font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
                        >
                          {access.securityPhone}
                        </a>
                      </p>
                    )}
                    {access.accessCode && (
                      <p className="nf-numeric mt-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
                        Access code: <span className="font-bold">{access.accessCode}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div data-testid="gate-withheld">
                    <p className="flex items-center gap-2 font-semibold text-[var(--nf-content-primary)]">
                      <UiIcon name="verified" size={16} className="shrink-0" />
                      Gated, with the details released on confirmation
                    </p>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
                      {bookingConfirmed
                        ? "Your booking is confirmed. Open it from your bookings to see the gate details."
                        : "The estate name, what to tell security, the desk number and any code arrive here the moment your booking is confirmed. They are never shown publicly, which is what stops a listing being used to case a property."}
                    </p>
                  </div>
                )}
              </dd>
            </div>
          </div>
        )}
      </dl>
    </section>
  );
}

function Row({
  icon,
  term,
  answered,
  value,
}: {
  icon: "chart-growth" | "shield-check";
  term: string;
  answered: boolean;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="block h-10 w-10 shrink-0">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--nf-content-muted)]">
          {term}
        </dt>
        <dd className="mt-1 text-[0.9375rem]">
          {answered ? (
            value
          ) : (
            <span className="text-[var(--nf-content-muted)]">
              The host has not answered this yet. Message them and ask before you
              book, rather than assuming either way.
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}

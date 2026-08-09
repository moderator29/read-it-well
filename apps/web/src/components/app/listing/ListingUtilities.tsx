import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Listing } from "@/lib/listings/types";
import type { ListingAccessView } from "@/lib/listings/access-queries";
import { ICON, TYPE } from "@/components/app/Screen";

/**
 * Light, water, and getting through the gate.
 *
 * The three questions a Nigerian renter asks before the price, and the reason
 * nobody else can answer them: they are structured columns here, not a tick box
 * called "Backup Power" that flattens Band A and a generator running seven to
 * eleven into the same claim.
 *
 * Unanswered is rendered as unanswered. A host who has not said whether there
 * is light must not have silence read as a yes, so the row says so plainly and
 * points at the one control that gets a real answer: the thread with the agent.
 *
 * The gate block has three states and they are all designed. Before a booking
 * is confirmed the guest is told the details exist and when they arrive. After
 * confirmation the real details are here, read through the caller's own
 * policies. A listing with no gate at all omits the block, because a panel
 * explaining the absence of a gate is noise.
 *
 * ---------------------------------------------------------------------------
 * THE SURFACE CHANGED, THE FACTS DID NOT.
 *
 * This was an `.nf-card` carrying its own `h2`, sitting inside the detail
 * page's glass content sheet: a bordered box inside a bordered box, which is
 * the nesting the whole rebuild exists to remove. It is now a run of hairline
 * rows on the GROUND, with the heading supplied by the page's `Section` so
 * there is exactly one heading treatment for every section of the screen.
 *
 * Objects went from 40px to 56px and the values from 0.9375rem to 1rem, on the
 * shared scale in `Screen.tsx`. No object here sits on a tile, a chip or a
 * ring: the mark sits on the surface with its label beside it.
 * ---------------------------------------------------------------------------
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
    <dl className="divide-y divide-[var(--nf-border-subtle)]">
      <Row
        icon="chart-growth"
        term="Light"
        answered={powerAnswered}
        value={
          powerAnswered ? (
            <>
              <span className="block text-[1rem] font-semibold text-[var(--nf-content-primary)]">
                {powerLine}
              </span>
              {grid && <span className={`mt-1 block ${TYPE.rowMeta}`}>{grid.detail}</span>}
              {/*
                A prepaid meter is a fact about how you pay for the light, so it
                belongs under the light. Stated as a sentence rather than as a
                badge: a pill here would be a container around two words sitting
                inside a row that already has a label.
              */}
              {utilities.prepaidMeter && (
                <span className={`mt-1.5 flex items-center gap-2 ${TYPE.rowMeta}`}>
                  <UiIcon name="verified" size={ICON.inline} className="shrink-0" />
                  Prepaid meter, so you buy units rather than settle a shared bill
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
              <span className="block text-[1rem] font-semibold text-[var(--nf-content-primary)]">
                {water.label}
              </span>
              <span className={`mt-1 block ${TYPE.rowMeta}`}>{water.detail}</span>
            </>
          ) : null
        }
      />

      {utilities.hasEstateAccess && (
        <div className="flex gap-3 py-4">
          <span className="block h-10 w-10 shrink-0">
            <BrandIcon name="keys-home" fill />
          </span>
          <div className="min-w-0 flex-1">
            <dt className={TYPE.label}>The gate</dt>
            <dd className="mt-1">
              {access ? (
                <div data-testid="gate-details">
                  {access.estateName && (
                    <p className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
                      {access.estateName}
                    </p>
                  )}
                  {access.gateDirections && (
                    <p className={`mt-1.5 whitespace-pre-wrap ${TYPE.body}`}>
                      {access.gateDirections}
                    </p>
                  )}
                  {access.securityPhone && (
                    <p className={`nf-numeric mt-2 ${TYPE.body}`}>
                      Security desk:{" "}
                      <a
                        href={`tel:${access.securityPhone.replace(/\s+/g, "")}`}
                        className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                      >
                        {access.securityPhone}
                      </a>
                    </p>
                  )}
                  {access.accessCode && (
                    <p className={`nf-numeric mt-1 ${TYPE.body}`}>
                      Access code: <span className="font-bold">{access.accessCode}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div data-testid="gate-withheld">
                  <p className="flex items-center gap-2 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
                    <UiIcon name="verified" size={ICON.inline} className="shrink-0" />
                    Gated, with the details released on confirmation
                  </p>
                  <p className={`mt-1.5 ${TYPE.body}`}>
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
  );
}

function Row({
  icon,
  term,
  answered,
  value,
}: {
  icon: BrandIconName;
  term: string;
  answered: boolean;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-4 first:pt-0">
      <span className="block h-10 w-10 shrink-0">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0 flex-1">
        <dt className={TYPE.label}>{term}</dt>
        <dd className="mt-1">
          {answered ? (
            value
          ) : (
            <span className={TYPE.body}>
              The agent has not answered this yet. Ask them before you commit,
              rather than assuming either way.
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}

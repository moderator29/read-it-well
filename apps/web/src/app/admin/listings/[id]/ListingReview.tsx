import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import type { ListingReviewView } from "@/lib/admin/queries";
import { SALE_STATUS_LABEL, TENURE_LABEL } from "@/lib/listings/pricing";
import type { AdminCopy } from "../../_components/copy";
import { Avatar, Badge, BadgeSlot, DeskHead, Panel, RoleTag } from "../../_review/parts";
import type { ListingReviewExtras } from "../../_review/contracts";
import { tileMosaic } from "../../_review/map-tiles";
import {
  CHECK_KEYS,
  CONDITION_LABEL,
  FURNISHING_LABEL,
  POWER_BACKUP_LABEL,
  POWER_GRID_LABEL,
  WATER_LABEL,
} from "../ListingCard";
import { placeLine, priceLine } from "../rows";

/**
 * The listing under review, C1D98B3C panel 2, with the flow of
 * GOVERNING-12 panel 2 (photos with the walkthrough, the facts, the price
 * breakdown, the description, then Approve, Ask for more, Reject).
 *
 * Presentational. The listing is Session A's `ListingReviewView`; the map pin,
 * amenity names, availability date, example flag and the lister's
 * verification are `getListingReviewExtras` (lib/admin/reads/listings.ts).
 * When that read fails, `extras` is null and those panels say so.
 */

export type ListingReviewProps = {
  listing: ListingReviewView;
  extras: ListingReviewExtras | null;
  reference: string;
  copy: AdminCopy["listings"];
  locale: Locale;
  sqm: string;
  statusLabel: (status: string) => string;
  backHref: string;
  /** Map tile template and credit, from the product's own provider (dark only). */
  tiles: { dark: string; credit: string };
  /** The action bar, or the closed notice for a decided listing. */
  actions: ReactNode;
  /**
   * Whose money each cost line is, in the product's own words ("Paid to the
   * agent", "Paid to the landlord", "Paid to the state"). The render prints
   * "Agency fee (10%)" with no owner, which reads as the platform's; Vallo
   * charges no platform fee and this screen must not imply one (rule 15).
   */
  keepers: { moveIn: Dictionary["moveIn"]; purchase: Dictionary["purchase"] };
  /** Said above everything when the listing may be an example (AR-10). */
  exampleNote?: ReactNode;
};

/** The payee of each cost line, keyed as `lib/listings/pricing` keys them. */
export function keeperFor(
  intent: string,
  key: string,
  words: { moveIn: Dictionary["moveIn"]; purchase: Dictionary["purchase"] },
): string | null {
  if (intent === "sale") {
    if (key === "price") return words.purchase.keptBySeller;
    if (key === "agency" || key === "legal") return words.purchase.keptByAgent;
    if (key === "consent" || key === "stamp" || key === "registration") return words.purchase.keptByState;
    return null;
  }
  if (key === "rent" || key === "caution") return words.moveIn.keptByLister;
  if (key === "agency" || key === "legal" || key === "agreement") return words.moveIn.keptByAgent;
  if (key === "service") return words.moveIn.keptByEstate;
  return null;
}

/** Small tiles beside the lead photo and the walkthrough: four columns, two rows. */
const SMALL_TILES = 8;

export function ListingReview(props: ListingReviewProps) {
  const {
    listing,
    extras,
    reference,
    copy,
    locale,
    sqm,
    statusLabel,
    backHref,
    tiles,
    actions,
    keepers,
    exampleNote,
  } = props;
  const type = copy.propertyType[listing.propertyType];
  const summary = [
    listing.bedrooms > 0 ? `${listing.bedrooms} bedroom ${type.toLowerCase()}` : type,
    placeLine(listing) || copy.locationMissing,
    priceLine(listing, copy, locale),
  ].join(" · ");

  return (
    <div className="nf-rv">
      <DeskHead
        title="Listing under review"
        lead={
          <Link href={backHref} className="nf-rv-back" aria-label="Back to the listings queue">
            <UiIcon name="arrow-left" size={20} />
          </Link>
        }
        trail={<Badge status={listing.status}>{statusLabel(listing.status)}</Badge>}
      />

      <div>
        <p className="nf-rv-idline">{reference}</p>
        <p className="nf-rv-summary">{summary}</p>
        <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-2xs)" }}>
          {listing.title}
        </p>
      </div>

      {exampleNote}

      <MediaStrip listing={listing} copy={copy} />

      <div className="nf-rv-grid2">
        <Panel title="Property details" labelledBy="rv-details">
          <dl className="nf-rv-facts">
            <Fact icon="house" label="Property type" value={type} />
            <Fact icon="bed" label="Bedrooms" value={String(listing.bedrooms)} />
            <Fact icon="bath" label="Bathrooms" value={String(listing.bathrooms)} />
            <Fact icon="bath" label="Toilets" value={num(listing.facts.toilets)} />
            <Fact
              icon="grid"
              label="Size"
              value={listing.facts.sizeSqm === null ? null : `${listing.facts.sizeSqm} ${sqm}`}
            />
            <Fact
              icon="sliders"
              label="Furnishing"
              value={listing.facts.furnished ? FURNISHING_LABEL[listing.facts.furnished] : null}
            />
            <Fact
              icon="building-apartment"
              label="Floor"
              value={
                listing.facts.floor === null
                  ? null
                  : listing.facts.totalFloors === null
                    ? `Floor ${listing.facts.floor}`
                    : `Floor ${listing.facts.floor} of ${listing.facts.totalFloors}`
              }
            />
            <Fact
              icon="verified"
              label="Condition"
              value={
                [
                  listing.facts.condition ? CONDITION_LABEL[listing.facts.condition] : null,
                  listing.facts.yearBuilt === null ? null : `built ${listing.facts.yearBuilt}`,
                ]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <Fact
              icon="parking"
              label="Parking"
              value={
                listing.facts.parkingSpaces === null
                  ? null
                  : `${listing.facts.parkingSpaces} ${listing.facts.parkingSpaces === 1 ? "space" : "spaces"}`
              }
            />
            <Fact
              icon="calendar-booking"
              label="Availability"
              value={extras ? (extras.availableFrom ?? null) : "Could not be read"}
            />
            {listing.intent === "sale" ? (
              <Fact
                icon="key"
                label="Title"
                value={[
                  listing.tenure ? TENURE_LABEL[listing.tenure] : "No title stated",
                  listing.saleStatus ? SALE_STATUS_LABEL[listing.saleStatus] : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            ) : null}
          </dl>
        </Panel>

        <div className="nf-rv-stack">
          <Panel title="Power and water" labelledBy="rv-utilities">
            <ul className="nf-rv-utils">
              <Utility
                icon="bolt"
                label="Electricity"
                value={
                  [
                    listing.utilities.powerGrid ? POWER_GRID_LABEL[listing.utilities.powerGrid] : null,
                    listing.utilities.prepaidMeter === null
                      ? null
                      : listing.utilities.prepaidMeter
                        ? "prepaid meter"
                        : "not prepaid",
                  ]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
              <Utility
                icon="bolt"
                label="Backup power"
                value={
                  listing.utilities.powerBackup
                    ? [
                        POWER_BACKUP_LABEL[listing.utilities.powerBackup],
                        listing.utilities.powerBackupHours === null
                          ? null
                          : `${listing.utilities.powerBackupHours} hrs`,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : null
                }
              />
              <Utility
                icon="water"
                label="Water"
                value={
                  listing.utilities.waterSupply ? WATER_LABEL[listing.utilities.waterSupply] : null
                }
              />
            </ul>
          </Panel>

          <Panel title="Amenities" labelledBy="rv-amenities">
            {extras ? (
              extras.amenities.length > 0 ? (
                <ul className="nf-rv-ticks">
                  {extras.amenities.map((amenity) => (
                    <li key={amenity}>
                      <UiIcon name="verified" size={16} />
                      {amenity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nf-rv-msg">The lister chose none.</p>
              )
            ) : (
              <>
                <p className="nf-rv-msg" style={{ marginBottom: "var(--nf-space-xs)" }}>
                  {listing.amenityCount === 1
                    ? "1 amenity chosen."
                    : `${listing.amenityCount} amenities chosen.`}
                </p>
                <p className="nf-rv-panel__note">Their names could not be read just now.</p>
              </>
            )}
          </Panel>
        </div>
      </div>

      <div className="nf-rv-grid2">
        <Panel title="Location" labelledBy="rv-location">
          <LocationMap
            place={placeLine(listing) || copy.locationMissing}
            latitude={extras?.latitude ?? null}
            longitude={extras?.longitude ?? null}
            tiles={tiles}
          />
          {listing.address ? (
            <p className="nf-rv-msg" style={{ marginTop: "var(--nf-space-xs)" }}>
              {listing.address}
            </p>
          ) : null}
          {extras && (extras.latitude === null || extras.longitude === null) ? (
            <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-2xs)" }}>
              The lister did not drop a pin, so there is no point to show.
            </p>
          ) : null}
        </Panel>

        <Panel title={listing.intent === "sale" ? "Purchase costs" : "Move-in costs"} labelledBy="rv-costs">
          <MoneyBlock listing={listing} locale={locale} keepers={keepers} />
        </Panel>
      </div>

      <div className="nf-rv-grid2">
        <Panel title="Lister verification" labelledBy="rv-lister">
          <ListerBlock listing={listing} extras={extras} />
        </Panel>

        <Panel title="Reason for review" labelledBy="rv-reason-panel">
          <ReasonBlock listing={listing} copy={copy} />
        </Panel>
      </div>

      {actions}

      {listing.description ? (
        <Panel title="Description" labelledBy="rv-description">
          <p className="nf-rv-msg" style={{ whiteSpace: "pre-wrap", color: "var(--nf-content-primary)" }}>
            {listing.description}
          </p>
        </Panel>
      ) : null}

      <Panel title={copy.checklistTitle} labelledBy="rv-checklist">
        <ul className="nf-rv-ticks">
          {listing.checks.map((check) => {
            const key = CHECK_KEYS[check.label];
            return (
              <li key={check.label} style={{ alignItems: "flex-start" }}>
                <span
                  style={{ color: check.pass ? "var(--nf-state-success)" : "var(--nf-state-error)", display: "flex" }}
                  aria-hidden="true"
                >
                  <UiIcon name={check.pass ? "verified" : "close"} size={16} />
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>
                    {key ? copy.checks[key] : check.label}
                    <span className="sr-only">{check.pass ? ", passes" : ", needs a look"}</span>
                  </span>
                  <span className="nf-rv-table__muted" style={{ overflowWrap: "anywhere" }}>
                    {check.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {listing.access.answered > 0 ? (
          <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-sm)" }}>
            Gate and estate: {[listing.access.estateName, `${listing.access.answered} of 4 access details given`].filter(Boolean).join(", ")}.
            The details themselves stay with the lister.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

function num(value: number | null): string | null {
  return value === null ? null : String(value);
}

function Fact({ icon, label, value }: { icon: UiIconName; label: string; value: string | null }) {
  return (
    <div>
      <UiIcon name={icon} size={16} />
      <dt>{label}</dt>
      <dd>{value ?? <span style={{ color: "var(--nf-content-muted)" }}>Not given</span>}</dd>
    </div>
  );
}

/**
 * A water drop in the stroked line tier, drawn here because UiIcon has none.
 * The identity pack's water objects are glass, and the plates beside it carry
 * line glyphs (bolt), so a glass object would break the set.
 */
function WaterGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5c3.2 4 5.5 7.1 5.5 10a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}

function Utility({ icon, label, value }: { icon: UiIconName | "water"; label: string; value: string | null }) {
  return (
    <li>
      <span className="nf-rv-plate" aria-hidden="true">
        {icon === "water" ? <WaterGlyph /> : <UiIcon name={icon} size={16} />}
      </span>
      <span>
        <span className="nf-rv-utils__label">{label}</span>
        <span className="nf-rv-utils__value">
          {value ?? <span style={{ color: "var(--nf-content-muted)" }}>Not answered</span>}
        </span>
      </span>
    </li>
  );
}

function MediaStrip({ listing, copy }: { listing: ListingReviewView; copy: AdminCopy["listings"] }) {
  const photos = listing.photos;
  const video = listing.videos[0] ?? null;
  const lead = photos[0] ?? null;
  const rest = photos.slice(1);
  const extraVideos = listing.videos.length > 1 ? listing.videos.length - 1 : 0;
  const overflow = rest.length + extraVideos > SMALL_TILES;
  const shown = rest.slice(0, overflow ? SMALL_TILES - 1 : SMALL_TILES);
  const hidden = rest.length - shown.length + extraVideos;

  if (!lead && !video) {
    return (
      <Panel>
        <p className="nf-rv-msg">No photos or walkthrough were uploaded with this listing.</p>
      </Panel>
    );
  }

  return (
    <div className="nf-panel nf-rv-panel" style={{ padding: "var(--nf-space-sm)" }}>
      <ul className="nf-rv-media" role="list" aria-label="Photos and walkthrough">
        {lead ? (
          <li className="nf-rv-media__lead">
            <RemoteImage
              src={lead}
              alt={copy.photoAlt.replace("{title}", listing.title).replace("{number}", "1")}
              width={320}
              height={200}
              sizes="(min-width: 900px) 22vw, 50vw"
            />
          </li>
        ) : null}
        {video ? (
          <li className="nf-rv-media__lead">
            {video.url ? (
              /* A walkthrough of an empty flat carries no speech, so there is
                 no track to caption. preload none: a reviewer's line is not
                 spent on a video nobody pressed play on. */
              <video
                src={video.url}
                poster={video.posterUrl ?? undefined}
                controls
                preload="none"
                playsInline
                aria-label="Walkthrough video"
              />
            ) : (
              <div
                className="nf-rv-media__video-off"
                style={video.posterUrl ? { backgroundImage: `url(${video.posterUrl})` } : undefined}
              >
                <span className="nf-rv-media__play" aria-hidden="true">
                  <UiIcon name="arrow-right" size={20} />
                </span>
                <span className="nf-rv-media__caption">
                  This walkthrough could not be opened. The listing has one.
                </span>
              </div>
            )}
          </li>
        ) : null}
        {shown.map((photo, index) => (
          <li key={photo}>
            <RemoteImage
              src={photo}
              alt={copy.photoAlt.replace("{title}", listing.title).replace("{number}", String(index + 2))}
              width={160}
              height={128}
              sizes="120px"
              loading="lazy"
            />
          </li>
        ))}
        {hidden > 0 ? (
          <li className="nf-rv-media__more" aria-label={`${hidden} more not shown`}>
            +{hidden}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function LocationMap({
  place,
  latitude,
  longitude,
  tiles,
}: {
  place: string;
  latitude: number | null;
  longitude: number | null;
  tiles: { dark: string; credit: string };
}) {
  const dark = latitude !== null && longitude !== null ? tileMosaic(latitude, longitude, tiles.dark) : null;

  return (
    <div className="nf-rv-map">
      {dark ? (
        <>
          {[{ mosaic: dark, cls: "nf-rv-map__tiles" }].map(({ mosaic, cls }) => (
            <div
              key={cls}
              className={cls}
              aria-hidden="true"
              style={{ left: `calc(50% - ${mosaic.pointX}px)`, top: `calc(50% - ${mosaic.pointY}px)` }}
            >
              {/* Backgrounds, not images: a tile the provider cannot serve
                  leaves the panel's own ground rather than a broken-image mark. */}
              {mosaic.urls.map((url) => (
                <span key={url} style={{ backgroundImage: `url(${url})` }} />
              ))}
            </div>
          ))}
          <span className="nf-rv-map__pin" aria-hidden="true">
            <UiIcon name="location" size={28} filled />
          </span>
          <span className="nf-rv-map__credit">{tiles.credit}</span>
        </>
      ) : (
        <span className="nf-rv-map__pin" aria-hidden="true" style={{ opacity: 0.5 }}>
          <UiIcon name="location" size={28} />
        </span>
      )}
      <p className="nf-rv-map__place">{place}</p>
    </div>
  );
}

function MoneyBlock({
  listing,
  locale,
  keepers,
}: {
  listing: ListingReviewView;
  locale: Locale;
  keepers: ListingReviewProps["keepers"];
}) {
  const block = listing.intent === "sale" ? listing.purchase : listing.moveIn;
  if (!block) {
    return (
      <dl className="nf-rv-money">
        <div className="nf-rv-money__total">
          <dt>{listing.intent === "sale" ? "Asking price" : "Headline price"}</dt>
          <dd>{formatMoney(listing.priceMinor, locale)}</dd>
        </div>
        <p className="nf-rv-panel__note">The lister stated no other costs.</p>
      </dl>
    );
  }
  return (
    <dl className="nf-rv-money">
      {block.parts.map((part) => {
        const keeper = part.minor > 0 ? keeperFor(listing.intent, part.key, keepers) : null;
        return (
          <div key={part.key}>
            <dt>
              {part.label}
              {keeper ? <span className="nf-rv-keeper">{keeper}</span> : null}
            </dt>
            <dd>{formatMoney(part.minor, locale)}</dd>
          </div>
        );
      })}
      <div className="nf-rv-money__total">
        <dt>{listing.intent === "sale" ? "Total to buy" : "Total to move in"}</dt>
        <dd>{formatMoney(block.totalMinor, locale)}</dd>
      </div>
      <p className="nf-rv-panel__note">
        {block.totalStated ? "Total as the lister stated it." : "Total summed from the parts."}
      </p>
    </dl>
  );
}

const RUNG_WORD: Record<string, string> = {
  identity: "ID",
  address: "Address",
  payout: "Bank",
  in_person: "Met in person",
};

const ROLE_WORD: Record<string, string> = { owner: "Owner", agent: "Agent", firm: "Firm" };

function ListerBlock({
  listing,
  extras,
}: {
  listing: ListingReviewView;
  extras: ListingReviewExtras | null;
}) {
  const lister = extras?.lister ?? null;
  const name = lister?.name ?? listing.agentName ?? "Not recorded";
  return (
    <div style={{ display: "grid", gap: "var(--nf-space-sm)" }}>
      <div className="nf-rv-person">
        <Avatar name={name} src={lister?.avatarUrl ?? null} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--nf-content-primary)" }}>
            {name}
            <BadgeSlot tier={lister?.badge} />
          </p>
          {lister?.role ? <RoleTag>{ROLE_WORD[lister.role]}</RoleTag> : null}
        </div>
        {lister ? (
          <div style={{ textAlign: "right" }}>
            <Badge tone={lister.verified ? "success" : "warning"}>
              {lister.verified ? "Verified" : "Not verified"}
            </Badge>
            <p className="nf-rv-panel__note" style={{ marginTop: "var(--nf-space-2xs)" }}>
              Tier {lister.tier}
              {lister.rungs
                .filter((rung) => rung.status === "passed")
                .map((rung) => ` · ${RUNG_WORD[rung.kind] ?? rung.kind} verified`)
                .join("")}
            </p>
          </div>
        ) : null}
      </div>
      {!lister ? (
        <p className="nf-rv-panel__note">The lister&apos;s verification could not be read just now.</p>
      ) : null}
    </div>
  );
}

const STATUS_REASON: Record<string, string> = {
  SUBMITTED: "Submitted and waiting for its first decision.",
  UNDER_REVIEW: "Picked up for review.",
  MORE_INFO_REQUIRED: "Sent back for changes. It is with the lister until they resubmit.",
  APPROVED: "Passed review. It goes into search only when somebody publishes it.",
  PUBLISHED: "Live in search.",
  REJECTED: "Did not pass review. The lister can edit it and submit again.",
  SUSPENDED: "Taken out of search.",
};

function ReasonBlock({ listing, copy }: { listing: ListingReviewView; copy: AdminCopy["listings"] }) {
  const failing = listing.checks.filter((check) => !check.pass);
  return (
    <div style={{ display: "grid", gap: "var(--nf-space-xs)" }}>
      <p className="nf-rv-msg" style={{ color: "var(--nf-brand-secondary)" }}>
        {STATUS_REASON[listing.status] ?? listing.status}
      </p>
      {failing.length > 0 ? (
        <ul className="nf-rv-ticks">
          {failing.map((check) => {
            const key = CHECK_KEYS[check.label];
            return (
              <li key={check.label}>
                <span style={{ color: "var(--nf-state-error)", display: "flex" }} aria-hidden="true">
                  <UiIcon name="close" size={16} />
                </span>
                {key ? copy.checks[key] : check.label}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="nf-rv-msg">Every line of the admission checklist passes.</p>
      )}
      {listing.reviewNotes ? (
        <p className="nf-rv-panel__note">Last note to the lister: {listing.reviewNotes}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { fill } from "../_copy";
import { createClient } from "@/lib/supabase/client";
import { canCapturePhoto, capturePhoto } from "@/lib/native/device";
import { Switch } from "@/components/ui/Switch";
import {
  addPhoto,
  removePhoto,
  reorderPhotos,
  saveDraft,
  setAmenities,
  setListingAccess,
  submitListing,
} from "@/lib/agent/listings-actions";
import type { WizardDraft } from "@/lib/agent/listings-queries";
import {
  MAX_ACCESS_CODE,
  MAX_BACKUP_HOURS,
  MAX_ESTATE_NAME,
  MAX_GATE_DIRECTIONS,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  PHOTO_MIME_TYPES,
  rejectUpload,
  MAX_SECURITY_PHONE,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_WORDS,
  MIN_PHOTOS,
  MIN_PHOTO_WIDTH,
  MIN_TITLE_LENGTH,
  collapseSpaces,
  CONDITION_CHOICES,
  countWords,
  FURNISHING_CHOICES,
  isRental,
  isTenancy,
  LISTING_INTENT_CHOICES,
  parseNairaToKobo,
  POWER_BACKUP_CHOICES,
  POWER_GRID_CHOICES,
  ratePeriodFor,
  RENT_PERIOD_CHOICES,
  SALE_STATUS_CHOICES,
  submitRequirements,
  TENURE_CHOICES,
  WATER_SUPPLY_CHOICES,
  type BuildCondition,
  type Furnishing,
  type LandTenure,
  type ListingIntent,
  type PowerBackup,
  type PowerGrid,
  type PropertyType,
  type RentPeriod,
  type SaleStatus,
  type WaterSupply,
} from "@/lib/agent/listings-schema";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Amount } from "@/components/ui/Amount";
import { moveInLines } from "@/components/app/listing/move-in-lines";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { VideoWalkthrough, type WalkthroughVideo } from "@/components/agent/VideoWalkthrough";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ListingSentForReview } from "./ListingSentForReview";
import { TextField, TextArea } from "@/components/ui/Field";
import { looksLikeStreetAddress, STREET_IN_TITLE_WARNING } from "@/lib/listings/public-title";
import { tenantPreference } from "@/lib/safety/tenant-preference";
import Link from "next/link";

/**
 * The List Apartment wizard: eight steps, canon reference 03.
 *
 * Built for one thumb at 390px. Every step is a single column, the controls are
 * 44px or larger, and the only fixed furniture is the step footer, so the
 * keyboard never covers the way forward. Work is saved on every step change:
 * to the platform as a DRAFT listing when the agent is signed in, and to this
 * device as well, always, so an interrupted listing survives a closed tab.
 *
 * Photos upload straight from the browser to the listing-photos bucket under
 * `<auth uid>/<listing id>/<uuid>.<ext>`, which storage RLS restricts to the
 * agent's own folder. The first photo is the cover. Anything narrower than
 * 1600px is refused here, and the server enforces the count at submit, so the
 * quality gate holds from both sides.
 *
 * Every string comes from the dictionary slice the page hands down, so the
 * whole wizard reads in the agent's language. The submit gate stays the
 * authority on WHICH requirements are unmet; the dictionary only decides how
 * each one reads, which is why the checklist and the server can never disagree.
 */

type WizardCopy = Dictionary["agentListings"];

/** The eight steps, in order. The names come from the dictionary. */
const STEP_KEYS = [
  "basics",
  "photos",
  "location",
  "amenities",
  "utilities",
  "pricing",
  "guestView",
  "submit",
] as const satisfies readonly (keyof WizardCopy["wizard"]["steps"])[];

/** Display order of the type cards, which is not the schema's storage order. */
/**
 * Display order of the type cards, which is not the schema's storage order.
 *
 * Shops, offices and land are on it now. They were not, which meant the
 * commercial and land categories existed in search, in the enum and in the
 * filter drawer, and there was no way on this platform to supply one: a person
 * with a plot to sell could not choose "Land" and gave up. A market you can
 * browse and cannot list in is worse than one you do not offer.
 */
const TYPE_ORDER: PropertyType[] = [
  "apartment",
  "shortlet",
  "home",
  "villa",
  "hotel",
  "rental",
  "shop",
  "office",
  "land",
  "restaurant",
];

const DRAFT_KEY = "nf_listing_draft";

type Values = {
  title: string;
  description: string;
  propertyType: PropertyType;
  stateCode: string;
  city: string;
  area: string;
  address: string;
  landmark: string;
  bedrooms: number;
  bathrooms: number;
  toilets: string;
  parkingSpaces: string;
  floor: string;
  totalFloors: string;
  sizeSqm: string;

  /** To let, or for sale. The first money question and the one all the rest hang off. */
  intent: ListingIntent;

  /* A tenancy. */
  rentNaira: string;
  rentPeriod: RentPeriod;
  rentNegotiable: boolean;
  cautionDepositNaira: string;
  serviceChargeNaira: string;
  serviceChargePeriod: RentPeriod;
  agencyFeeNaira: string;
  legalFeeNaira: string;
  agreementFeeNaira: string;
  totalMoveInNaira: string;
  minimumTenancyMonths: string;
  availableFrom: string;
  furnished: Furnishing | "";

  /* A short stay. The period is never asked for: the category decides it. */
  rateNaira: string;

  /* A sale. */
  salePriceNaira: string;
  saleAgencyFeeNaira: string;
  saleLegalFeeNaira: string;
  governorsConsentFeeNaira: string;
  stampDutyNaira: string;
  surveyRegistrationFeeNaira: string;
  totalPurchaseNaira: string;
  priceNegotiable: boolean;
  tenure: LandTenure | "";
  saleStatus: SaleStatus;
  yearBuilt: string;
  condition: BuildCondition | "";

  powerGrid: PowerGrid | "";
  powerBackup: PowerBackup | "";
  powerBackupHours: string;
  waterSupply: WaterSupply | "";
  prepaidMeter: boolean;
  estateName: string;
  gateDirections: string;
  securityPhone: string;
  accessCode: string;
};

type Photo = { id: string; path: string; url: string };

/** How a rent cycle reads beside a figure, in the one place that prints both. */
const PERIOD_WORD: Record<RentPeriod, string> = {
  month: "per month",
  quarter: "per quarter",
  year: "per year",
};

/** Keep an input numeric without fighting the caret. Empty stays empty. */
function digitsOnly(raw: string, max: number): string {
  return raw.replace(/[^0-9]/g, "").slice(0, max);
}

const EMPTY: Values = {
  title: "",
  description: "",
  propertyType: "apartment",
  stateCode: "",
  city: "",
  area: "",
  address: "",
  landmark: "",
  bedrooms: 1,
  bathrooms: 1,
  toilets: "",
  parkingSpaces: "",
  floor: "",
  totalFloors: "",
  sizeSqm: "",
  intent: "rent",
  rentNaira: "",
  rentPeriod: "year",
  rentNegotiable: false,
  cautionDepositNaira: "",
  serviceChargeNaira: "",
  serviceChargePeriod: "year",
  agencyFeeNaira: "",
  legalFeeNaira: "",
  agreementFeeNaira: "",
  totalMoveInNaira: "",
  minimumTenancyMonths: "",
  availableFrom: "",
  furnished: "",
  rateNaira: "",
  salePriceNaira: "",
  saleAgencyFeeNaira: "",
  saleLegalFeeNaira: "",
  governorsConsentFeeNaira: "",
  stampDutyNaira: "",
  surveyRegistrationFeeNaira: "",
  totalPurchaseNaira: "",
  priceNegotiable: false,
  tenure: "",
  saleStatus: "available",
  yearBuilt: "",
  condition: "",
  powerGrid: "",
  powerBackup: "",
  powerBackupHours: "",
  waterSupply: "",
  prepaidMeter: false,
  estateName: "",
  gateDirections: "",
  securityPhone: "",
  accessCode: "",
};

function valuesFrom(draft: WizardDraft): Values {
  return {
    title: draft.title,
    description: draft.description,
    propertyType: draft.propertyType ?? "apartment",
    stateCode: draft.stateCode,
    city: draft.city,
    area: draft.area,
    address: draft.address,
    landmark: draft.landmark,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    toilets: draft.toilets,
    parkingSpaces: draft.parkingSpaces,
    floor: draft.floor,
    totalFloors: draft.totalFloors,
    sizeSqm: draft.sizeSqm,
    intent: draft.intent,
    rentNaira: draft.rentNaira,
    rentPeriod: draft.rentPeriod === "" ? "year" : draft.rentPeriod,
    rentNegotiable: draft.rentNegotiable,
    cautionDepositNaira: draft.cautionDepositNaira,
    serviceChargeNaira: draft.serviceChargeNaira,
    serviceChargePeriod: draft.serviceChargePeriod === "" ? "year" : draft.serviceChargePeriod,
    agencyFeeNaira: draft.agencyFeeNaira,
    legalFeeNaira: draft.legalFeeNaira,
    agreementFeeNaira: draft.agreementFeeNaira,
    totalMoveInNaira: draft.totalMoveInNaira,
    minimumTenancyMonths: draft.minimumTenancyMonths,
    availableFrom: draft.availableFrom,
    furnished: draft.furnished,
    rateNaira: draft.rateNaira,
    salePriceNaira: draft.salePriceNaira,
    saleAgencyFeeNaira: draft.saleAgencyFeeNaira,
    saleLegalFeeNaira: draft.saleLegalFeeNaira,
    governorsConsentFeeNaira: draft.governorsConsentFeeNaira,
    stampDutyNaira: draft.stampDutyNaira,
    surveyRegistrationFeeNaira: draft.surveyRegistrationFeeNaira,
    totalPurchaseNaira: draft.totalPurchaseNaira,
    priceNegotiable: draft.priceNegotiable,
    tenure: draft.tenure,
    saleStatus: draft.saleStatus === "" ? "available" : draft.saleStatus,
    yearBuilt: draft.yearBuilt,
    condition: draft.condition,
    powerGrid: draft.powerGrid,
    powerBackup: draft.powerBackup,
    powerBackupHours: draft.powerBackupHours,
    waterSupply: draft.waterSupply,
    prepaidMeter: draft.prepaidMeter,
    estateName: draft.access.estateName,
    gateDirections: draft.access.gateDirections,
    securityPhone: draft.access.securityPhone,
    accessCode: draft.access.accessCode,
  };
}

/* ------------------------------------------------------------ small parts */

/*
 * THE THIRD OF THREE SWITCHES STOOD HERE, AND IT IS GONE.
 *
 * `Toggle` drew its own 48x28 track with a 20px knob, animated on `left`
 * rather than on a transform (a layout property, so the row reflowed on every
 * frame of the animation instead of compositing), and painted
 * `--nf-gradient-agent` when on while every other switch on the platform
 * paints `--nf-brand-primary`. That last one is the part worth naming: the
 * same control meant the same thing in two places and was a different colour
 * in each, which is the uniqueness failure in its purest form.
 *
 * It is `components/ui/Switch.tsx` now, with `label` and `description`, which
 * is the primitive's OWN row branch. The research counted four separate row
 * layouts wrapped around one switch; this is the one the primitive already
 * ships, so the wrapper is deleted rather than replaced by a fourth.
 */


function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="nf-label">{label}</span>
      {children}
      {error ? (
        <span className="nf-body-sm mt-inline-tight block font-medium text-[var(--nf-state-error)]">
          {error}
        </span>
      ) : hint ? (
        <span className="nf-body-sm mt-inline-tight block text-[var(--nf-content-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------- the drawn furniture
 *
 * GOVERNING-06, -07 and -08 share one anatomy across all twelve screens, and
 * until now the wizard had none of it: a back chevron beside a row of small
 * filled rectangles, a display title with one quiet sentence under it and a
 * glass object on the right, a calm explanatory panel with a small round
 * glyph, and option cards that carry an object, a word, a line and a tick.
 * Each of those is one component here so a step cannot draw its own version.
 */

/** The object each step's header carries, where the set has an honest one. */
const STEP_OBJECT: Partial<Record<(typeof STEP_KEYS)[number], BrandIconName>> = {
  basics: "apartment-block",
  photos: "camera",
  location: "pin-map",
  pricing: "naira-coins",
  guestView: "home-search",
  submit: "seal-pending",
  /*
   * `amenities` and `utilities` carry NO object, and that is a decision
   * rather than an omission. The render heads Light with a lightbulb and
   * Water with a droplet, and the 144-object glass pack has neither. The
   * nearest candidates mean something else in this product, and this codebase
   * already ruled that a glyph meaning the wrong thing is worse than no glyph
   * because the reader does not know they have misread it. Two objects are
   * named for the artwork list in the ledger instead.
   */
};

/** The object on each property type's card. 06 screen one draws all six. */
const TYPE_OBJECT: Record<PropertyType, BrandIconName> = {
  apartment: "apartment-block",
  shortlet: "shortlet",
  home: "modern-house",
  villa: "villa",
  hotel: "hotel",
  rental: "keys-home",
  shop: "shop-retail",
  office: "office-space",
  land: "land-plot",
  restaurant: "concierge-bell",
};

/** 06 screen four's four build conditions. */
const CONDITION_OBJECT: Record<BuildCondition, BrandIconName> = {
  newly_built: "home-check",
  renovated: "home-ring",
  old: "townhouse",
  off_plan: "doc-home",
};

/* 07 screens one and two. These are the stroked tier: they are small marks
   inside a card rather than the card's subject, which is what UiIcon is for. */
const GRID_GLYPH: Record<PowerGrid, UiIconName> = {
  BAND_A: "bolt",
  MOSTLY_ON: "bolt",
  PATCHY: "bolt",
  RARELY: "bolt",
  NONE: "block",
};
const BACKUP_GLYPH: Record<PowerBackup, UiIconName> = {
  NONE: "block",
  GENERATOR: "bolt",
  INVERTER: "bolt",
  SOLAR: "sun",
  GENERATOR_INVERTER: "bolt",
};
const WATER_GLYPH: Record<WaterSupply, UiIconName> = {
  TREATED_MAINS: "bath",
  BOREHOLE: "bath",
  PUMPED_STORAGE: "bath",
  TANKER: "bath",
  NONE: "block",
};

/** 07 screen three's twelve tiles. Same mapping the listing page tiles use. */
const AMENITY_GLYPH: Record<string, UiIconName> = {
  wifi: "wifi",
  ac: "sparkle",
  tv: "picture",
  kitchen: "kitchen",
  parking: "parking",
  pool: "pool",
  gym: "bolt",
  security: "verified",
  elevator: "arrow-up",
  furnished: "home",
  balcony: "building-apartment",
  garden: "map",
  laundry: "sparkle",
  generator: "bolt",
  water: "bath",
  shower: "bath",
  breakfast: "utensils",
  workspace: "document",
};

/** The step header: title, one sentence, and the object where there is one. */
function StepHead({
  title,
  sub,
  object,
}: {
  title: string;
  sub?: string;
  object?: BrandIconName | "" | undefined;
}) {
  return (
    <div className="nf-lw-head">
      <div className="min-w-0">
        {/* aria-live because the heading is what tells a screen reader the
            step changed, and this is the only heading on the screen. */}
        <h1 className="nf-lw-head__title" aria-live="polite">
          {title}
        </h1>
        {sub && <p className="nf-lw-head__sub">{sub}</p>}
      </div>
      {object && (
        <span className="nf-lw-head__object" aria-hidden="true">
          <BrandIcon name={object} fill />
        </span>
      )}
    </div>
  );
}

/**
 * The calm explanatory panel.
 *
 * The roles README names this as part of the register every surface inherits:
 * "the calm explanatory panel with a small round glyph that appears on almost
 * every screen in this set". The wizard had the sentences and drew them as
 * loose grey paragraphs, so the one piece of furniture the whole reference set
 * agrees on was the piece this flow did not have.
 */
function Note({
  children,
  glyph = "info",
  role,
}: {
  children: React.ReactNode;
  glyph?: UiIconName;
  role?: "status";
}) {
  return (
    <div className="nf-lw-note" role={role}>
      <span className="nf-lw-note__glyph" aria-hidden="true">
        <UiIcon name={glyph} size={16} />
      </span>
      <p className="nf-lw-note__body">{children}</p>
    </div>
  );
}

/** One option card: an object, a word, a line under it, and the tick. */
function Choice({
  name,
  sub,
  object,
  glyph,
  chosen,
  centred,
  onClick,
}: {
  name: string;
  sub?: string;
  object?: BrandIconName;
  glyph?: UiIconName;
  chosen: boolean;
  centred?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chosen}
      className={`nf-lw-choice${centred ? " nf-lw-choice--centred" : ""}`}
    >
      {object ? (
        <span className="nf-lw-choice__object" aria-hidden="true">
          <BrandIcon name={object} fill />
        </span>
      ) : glyph ? (
        <span className="nf-lw-choice__glyph" aria-hidden="true">
          <UiIcon name={glyph} size={24} />
        </span>
      ) : null}
      <span className="nf-lw-choice__name">{name}</span>
      {sub && <span className="nf-lw-choice__sub">{sub}</span>}
      {chosen && (
        <span className="nf-lw-choice__tick" aria-hidden="true">
          <UiIcon name="verified-badge" size={20} />
        </span>
      )}
    </button>
  );
}

/**
 * The stepper of 06 screen three and 07 screen one: one rounded rectangle
 * holding minus, the figure and plus.
 *
 * The two ends are 44px, which is the whole reason this replaces the old
 * `.nf-icon-btn` pair: the drawn control is a single object and a thumb has
 * to be able to hit either end of it without looking.
 */
function Stepper({
  value,
  min,
  max,
  fewerLabel,
  moreLabel,
  inline,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  fewerLabel: string;
  moreLabel: string;
  inline?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className={`nf-lw-step${inline ? " nf-lw-step--inline" : ""}`}>
      <button
        type="button"
        className="nf-lw-step__end"
        aria-label={fewerLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <UiIcon name="minus" size={20} />
      </button>
      <span className="nf-lw-step__value">{value}</span>
      <button
        type="button"
        className="nf-lw-step__end"
        aria-label={moreLabel}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <UiIcon name="plus" size={20} />
      </button>
    </div>
  );
}

/** A fact row: the object on its plate, the fact, the question, the control. */
function FactRow({
  glyph,
  name,
  ask,
  optional,
  children,
  stacked,
}: {
  glyph: UiIconName;
  name: string;
  ask: string;
  optional?: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`nf-lw-fact${stacked ? " nf-lw-fact--stacked" : ""}`}>
      <span className="nf-lw-fact__plate" aria-hidden="true">
        <UiIcon name={glyph} size={22} />
      </span>
      <span className="nf-lw-fact__head">
        <span className="min-w-0">
          <span className="nf-lw-fact__name">{name}</span>
          <span className="nf-lw-fact__ask">{ask}</span>
        </span>
        {/* The Optional mark rides the head line, which is where the render
            puts it: top right of the card, level with the fact's name. */}
        {optional && <span className="nf-lw-fact__optional">{optional}</span>}
      </span>
      <div className="nf-lw-fact__control">{children}</div>
    </div>
  );
}

/**
 * WHAT A TENANT WILL ACTUALLY PAY, on the agent's own screen.
 *
 * GOVERNING-08 screen two, which this platform drew for the SEARCHER on the
 * listing page and never drew for the person setting the figures. So the
 * lister typed six amounts into six boxes and never once saw the sentence
 * those boxes make. This is that sentence, live, under the boxes.
 *
 * IT SHARES THE MODEL RATHER THAN MIRRORING IT. `moveInLines` is the single
 * place the honesty rule lives and the only reason it is a separate file: an
 * UNDECLARED cost is still LISTED, drawn with the words "Not declared", with
 * no figure, and contributes nothing to the total; a DECLARED ZERO agency fee
 * is a different fact and is drawn as "No agency fee" in the success ink. A
 * second implementation here is exactly what that file exists to prevent, so
 * the wizard builds the eight facts the model reads and hands them over.
 *
 * The total is never recomputed from the parts. The agent's own stated total
 * wins where they gave one, because agents fold fees into each other; where
 * they did not, the sum of the named parts is the honest FLOOR and it is
 * labelled "from" so it cannot read as a quote. That is the same rule the
 * listing page follows, in the same words.
 *
 * AND THE PLATFORM CHARGES NOTHING HERE. Every line is the agent's, the
 * landlord's or the estate's. There is no Vallo row because there is no Vallo
 * fee.
 */
function TenantPays({
  facts,
  currency,
  locale,
  copy,
  moveInCopy,
}: {
  facts: Parameters<typeof moveInLines>[0];
  currency: string;
  locale: Locale;
  copy: WizardCopy;
  moveInCopy: Dictionary["moveIn"];
}) {
  const lines = moveInLines(facts, moveInCopy);
  const declared = lines.filter((line) => line.minor !== undefined && line.minor !== null);
  const total = declared.reduce((sum, line) => sum + (line.minor ?? 0), 0);

  /* Nothing has been named yet, so there is nothing honest to draw. The panel
     says where the breakdown will appear rather than drawing an empty one. */
  if (declared.length === 0) {
    return <Note>{copy.drawn.tenantPays.empty}</Note>;
  }

  return (
    <div className="nf-movein" data-testid="wizard-tenant-pays">
      <ul className="nf-movein__list">
        {lines.map((line) => {
          const isDeclared = line.minor !== undefined && line.minor !== null;
          return (
            <li
              key={line.key}
              className="nf-movein__row"
              data-declared={isDeclared || undefined}
              data-testid={`wizard-pays-${line.key}`}
            >
              <span className="nf-movein__plate" aria-hidden="true">
                <BrandIcon name={line.icon} fill />
              </span>
              <span className="nf-movein__name">
                <span className="nf-movein__label">
                  {line.label}
                  {line.basis && <span className="nf-movein__basis"> ({line.basis})</span>}
                </span>
                {/* A declared ZERO does not also say who keeps it: "No agency
                    fee" over "Paid to the agent" is two halves of a sentence
                    that contradict each other. */}
                {isDeclared && line.minor !== 0 && line.keeper && (
                  <span className="nf-movein__keeper">{line.keeper}</span>
                )}
              </span>
              <span className="nf-movein__figure">
                {isDeclared ? (
                  line.key === "agency" && line.minor === 0 ? (
                    <span className="nf-movein__free">{moveInCopy.noAgencyFee}</span>
                  ) : (
                    <Amount minorUnits={line.minor as number} locale={locale} currency={currency} />
                  )
                ) : (
                  <span className="nf-movein__undeclared">{moveInCopy.notDeclared}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="nf-movein__total" data-testid="wizard-pays-total">
        <span className="nf-movein__plate nf-movein__plate--total" aria-hidden="true">
          <BrandIcon name="naira-coins" fill />
        </span>
        <span className="min-w-0">
          <span className="nf-movein__total-label">{moveInCopy.totalFrom}</span>
          <span className="nf-movein__total-figure">
            <Amount minorUnits={total} locale={locale} currency={currency} />
          </span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the wizard */

export function ListingWizard({
  copy,
  reference,
  moveInCopy,
  locale,
  userId,
  states,
  amenities,
  initial,
  canPersist,
  startAt = 0,
}: {
  copy: WizardCopy;
  /* Its own slice rather than a key inside `agentListings`, because the same
     words are read by the search page, the public listing page and the
     lister's console, and one namespace owns them. */
  reference: Dictionary["listingReference"];
  /* The move-in slice, for the same reason `reference` is its own slice: the
     breakdown GOVERNING-08 screen two draws is the searcher's block turned
     round to face the agent, and it has to read in exactly the same words. */
  moveInCopy: Dictionary["moveIn"];
  locale: Locale;
  userId: string | null;
  states: { code: string; name: string }[];
  amenities: { code: string; label: string }[];
  initial: WizardDraft | null;
  canPersist: boolean;
  /**
   * The step to open on, zero based and clamped.
   *
   * The preview harness passes it so every one of the eight steps can be
   * photographed beside its governing image; nothing in the product passes it
   * today, and the default is the first step, which is what /agent/list has
   * always done.
   */
  startAt?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(() =>
    Math.min(Math.max(Math.trunc(startAt), 0), STEP_KEYS.length - 1),
  );
  const [values, setValues] = useState<Values>(initial ? valuesFrom(initial) : EMPTY);
  const [photos, setPhotos] = useState<Photo[]>(initial?.photos ?? []);
  const [chosenAmenities, setChosenAmenities] = useState<string[]>(initial?.amenityCodes ?? []);
  /* The walkthroughs already attached to this draft. Every layer behind them
     was built weeks ago and had zero callers; `VideoWalkthrough` is the half a
     human touches. */
  const [videos, setVideos] = useState<WalkthroughVideo[]>(
    (initial?.videos ?? []).map((video) => ({
      id: video.id,
      url: video.url,
      posterUrl: video.posterUrl,
      durationSeconds: video.durationSeconds,
    })),
  );
  const [listingId, setListingId] = useState<string | null>(initial?.id ?? null);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /* STORE-04: the shell's own camera, when the running binary carries it. */
  const [nativeCamera, setNativeCamera] = useState(false);
  useEffect(() => {
    let live = true;
    void canCapturePhoto().then((able) => {
      if (live) setNativeCamera(able);
    });
    return () => {
      live = false;
    };
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  /* The two counts the render draws as steppers and this form stored as
     text. Empty stays empty in `values` so a blank is still a blank to the
     save path; the stepper only ever sees a number. */
  /* `step` is clamped by `go`, so this is never undefined in practice. The
     narrowing is the compiler's, not a defence against a real case. */
  const stepKey = STEP_KEYS[step];
  const availableFromDate = (() => {
    const parts = values.availableFrom.split("-").map(Number);
    const [year, month, day] = parts;
    if (parts.length !== 3 || !year || !month || !day) return null;
    return new Date(year, month - 1, day);
  })();
  const toiletCount = Number(values.toilets) || 0;
  const backupHours = Number(values.powerBackupHours) || 0;
  const parkingCount = Number(values.parkingSpaces) || 0;

  const rental = isRental(values.propertyType);
  /*
   * Which of the three money shapes this listing is in.
   *
   * `sale` wins over everything: a property being sold has no rent and no
   * nightly rate. Otherwise the CATEGORY decides, not another question, because
   * a shop is let by the year and a shortlet is let by the night and asking
   * somebody to confirm what they already told us is a question with one
   * answer.
   */
  const forSale = values.intent === "sale";
  const tenancy = !forSale && isTenancy(values.propertyType);
  const shortStay = !forSale && !tenancy;
  const perHead = ratePeriodFor(values.propertyType) === "guest";

  const rentMinor = parseNairaToKobo(values.rentNaira) ?? 0;
  const rateMinor = parseNairaToKobo(values.rateNaira) ?? 0;
  const saleMinor = parseNairaToKobo(values.salePriceNaira) ?? 0;
  /* The headline figure, resolved exactly the way the catalogue resolves it, so
     the preview card on step 7 shows the number a renter will see. */
  const priceMinor = forSale ? saleMinor : tenancy ? rentMinor : rateMinor;

  /* What has to be found before the keys change hands. Summed live so the
     lister watches the real number appear as they type the parts, which is the
     figure a Nigerian tenant is actually shopping on and the one the platform
     has never shown anybody. */
  /*
   * THE SERVICE CHARGE WAS MISSING FROM THIS LIST AND THE TENANT WAS ALWAYS
   * GOING TO BE SHOWN IT.
   *
   * Found by drawing GOVERNING-08 screen two under the boxes that feed it: the
   * breakdown totalled a stated tenancy at 5,150,000 while the hint two inches
   * above it said "leave blank and we show 5,000,000", and the gap was exactly
   * the service charge. `moveInParts` in `lib/listings/pricing.ts` is the
   * canonical list and has always counted it, so the listing page a searcher
   * reads counted it too. The only place that did not was the agent's own
   * floor, which is the number they price against.
   *
   * It raises the floor the stated total is checked against, which is the
   * correct direction: a total BELOW the parts the lister named is a quote
   * that contradicts its own breakdown.
   */
  const feeParts = [
    values.rentNaira,
    values.cautionDepositNaira,
    values.serviceChargeNaira,
    values.agencyFeeNaira,
    values.legalFeeNaira,
    values.agreementFeeNaira,
  ];
  const partsSumMinor = feeParts.reduce(
    (total, raw) => total + (parseNairaToKobo(raw) ?? 0),
    0,
  );
  /*
   * The eight facts `moveInLines` reads, straight off the form.
   *
   * `parseNairaToKobo` returns null for an EMPTY box and a number for a typed
   * one, including a typed zero. That is exactly the declared / undeclared
   * distinction the model needs, so `?? undefined` is the whole translation:
   * a blank stays absent and a typed 0 stays 0. Collapsing null to 0 here
   * would turn every silence into a claim of "free", which is the one thing
   * this model exists to stop.
   */
  const paysFacts = {
    priceMinor: rentMinor,
    pricePeriod: values.rentPeriod,
    agencyFeeMinor: parseNairaToKobo(values.agencyFeeNaira) ?? undefined,
    legalFeeMinor: parseNairaToKobo(values.legalFeeNaira) ?? undefined,
    agreementFeeMinor: parseNairaToKobo(values.agreementFeeNaira) ?? undefined,
    cautionDepositMinor: parseNairaToKobo(values.cautionDepositNaira) ?? undefined,
    serviceChargeMinor: parseNairaToKobo(values.serviceChargeNaira) ?? undefined,
    serviceChargePeriod: values.serviceChargePeriod,
  };
  const statedTotalMinor = parseNairaToKobo(values.totalMoveInNaira);

  /* THE SAME ARITHMETIC ON THE SALE SIDE, and the price is one of the parts.
     "The total to buy" means the asking price plus everything on top of it, so
     a hundred and eighty million asking price is routinely two hundred million
     by the time the deed is signed, and until now this platform collected
     none of the difference. */
  const purchasePartsMinor = [
    values.salePriceNaira,
    values.saleAgencyFeeNaira,
    values.saleLegalFeeNaira,
    values.governorsConsentFeeNaira,
    values.stampDutyNaira,
    values.surveyRegistrationFeeNaira,
  ].reduce((total, raw) => total + (parseNairaToKobo(raw) ?? 0), 0);
  const statedPurchaseMinor = parseNairaToKobo(values.totalPurchaseNaira);
  const purchaseMinor = statedPurchaseMinor ?? purchasePartsMinor;

  const words = countWords(values.description);
  /* SEC-06: the database holds a listing that states a tenant preference for
     review; this says so while the lister is still typing. */
  const preference = tenantPreference(`${values.title} ${values.description}`);
  const stepNames = STEP_KEYS.map((key) => copy.wizard.steps[key]);
  const amenityNames = copy.amenities.names as Record<string, string | undefined>;
  const pricePeriod = forSale
    ? "asking price"
    : tenancy
      ? copy.pricing.perYear
      : perHead
        ? "per head"
        : copy.pricing.perNight;

  const unmet = useMemo(
    () =>
      submitRequirements({
        title: values.title,
        description: values.description,
        propertyType: values.propertyType,
        stateCode: values.stateCode,
        city: values.city,
        area: values.area,
        intent: values.intent,
        rentMinor: tenancy ? rentMinor : null,
        rentPeriod: tenancy ? values.rentPeriod : null,
        rateMinor: shortStay ? rateMinor : null,
        ratePeriod: shortStay ? ratePeriodFor(values.propertyType) : null,
        salePriceMinor: forSale ? saleMinor : null,
        tenure: values.tenure === "" ? null : values.tenure,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        amenityCount: chosenAmenities.length,
        photoCount: photos.length,
        hasCover: photos.length > 0,
      }),
    [
      values,
      tenancy,
      shortStay,
      forSale,
      rentMinor,
      rateMinor,
      saleMinor,
      chosenAmenities.length,
      photos.length,
    ],
  );

  /**
   * The gate's verdict, in the agent's language.
   *
   * `submitRequirements` decides which fields are unmet; this decides how each
   * one reads. Where one field can fail two ways (a title too short or too
   * long, photos too few or no cover) the same local values that fed the gate
   * pick the sentence, so the wording always matches the actual failure. A
   * field the gate grows later falls through to the message it carried, which
   * is English but never blank.
   */
  function gateText(field: string, fallback: string): string {
    const g = copy.gate;
    switch (field) {
      case "title":
        return collapseSpaces(values.title).length > MAX_TITLE_LENGTH
          ? fill(g.titleLong, { max: MAX_TITLE_LENGTH })
          : fill(g.titleShort, { min: MIN_TITLE_LENGTH });
      case "description":
        return fill(g.description, { min: MIN_DESCRIPTION_WORDS, count: words });
      case "propertyType":
        return g.propertyType;
      case "photos":
        return photos.length < MIN_PHOTOS
          ? fill(g.photos, { min: MIN_PHOTOS, count: photos.length })
          : g.cover;
      case "stateCode":
        return g.stateCode;
      case "city":
        return g.city;
      case "area":
        return g.area;
      case "amenities":
        return g.amenities;
      /* The three money branches. The dictionary has two sentences, for a
         yearly rent and a nightly rate, which is what it was written against.
         The sale and per-head cases are new markets it has not been translated
         for yet, so they read in English rather than printing the wrong one of
         the two it does have. */
      case "rent":
        return g.priceYear;
      case "rate":
        return perHead ? "Set the price per head in naira." : g.priceNight;
      case "salePrice":
        return "Set the asking price in naira.";
      case "tenure":
        return "Say what title comes with the property, for example Certificate of Occupancy.";
      case "rentPeriod":
        return "Say whether the rent is per year, quarter or month.";
      case "ratePeriod":
        return "Say what the rate covers.";
      case "bedrooms":
        return g.bedrooms;
      case "bathrooms":
        return g.bathrooms;
      default:
        return fallback;
    }
  }

  /**
   * Screen reader wording for the two counter buttons. The label is lowercased
   * in the active locale so "One more bedrooms" reads as a sentence rather
   * than a heading, and so a language with its own casing rules keeps them.
   */
  function counterAria(direction: "fewer" | "more", label: string): string {
    const template = direction === "fewer" ? copy.basics.counterFewer : copy.basics.counterMore;
    return fill(template, { label: label.toLocaleLowerCase(locale) });
  }

  /* ---------------------------------------------------------- draft safety */

  /*
   * Restore a device draft once, and only when the platform did not hand us
   * one, so a stored listing always wins over whatever this browser remembers.
   *
   * The device draft now records WHICH listing it is a copy of, and that turns
   * out to be the load-bearing field. Without it the two halves of the save
   * could not tell each other apart: this browser remembered the words, the
   * platform held the row, the photos and the amenities, and nothing connected
   * them. Restoring the words into a wizard with no id meant the next autosave
   * INSERTED a second listing, so the host ended up owning two half drafts, saw
   * neither set of photos, and had every reason to believe their work was gone.
   *
   * When the stored draft names a listing the platform did NOT hand back, the
   * right answer is to drop it rather than retype it. That combination means
   * the listing has been deleted, or has moved past DRAFT and is no longer the
   * host's to edit; in both cases writing its old text into a brand new row
   * would resurrect something the host or a reviewer already settled.
   */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (initial) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        listingId?: string | null;
        values?: Partial<Values>;
        amenities?: string[];
      };
      if (typeof parsed.listingId === "string" && parsed.listingId.length > 0) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (parsed.values) setValues((prev) => ({ ...prev, ...parsed.values }));
      if (parsed.amenities) setChosenAmenities(parsed.amenities);
    } catch {
      /* a malformed draft is not worth an error message */
    }
  }, [initial]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ listingId, values, amenities: chosenAmenities }),
      );
    } catch {
      /* storage unavailable, the platform copy still holds */
    }
  }, [listingId, values, chosenAmenities]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  /* --------------------------------------------------------------- saving */

  /** Push the current state to the platform. Returns the listing id, or null. */
  const persist = useCallback(async (): Promise<string | null> => {
    if (!canPersist) return null;
    if (values.title.trim().length < 2) return listingId;

    const result = await saveDraft({
      id: listingId ?? undefined,
      title: values.title,
      description: values.description,
      propertyType: values.propertyType,
      stateCode: values.stateCode,
      city: values.city,
      area: values.area,
      address: values.address,
      landmark: values.landmark,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      toilets: values.toilets === "" ? undefined : values.toilets,
      parkingSpaces: values.parkingSpaces === "" ? undefined : values.parkingSpaces,
      floor: values.floor === "" ? undefined : values.floor,
      totalFloors: values.totalFloors === "" ? undefined : values.totalFloors,
      sizeSqm: values.sizeSqm === "" ? undefined : values.sizeSqm,
      intent: values.intent,
      rentNaira: values.rentNaira === "" ? undefined : values.rentNaira,
      rentPeriod: values.rentPeriod,
      rentNegotiable: values.rentNegotiable,
      cautionDepositNaira:
        values.cautionDepositNaira === "" ? undefined : values.cautionDepositNaira,
      serviceChargeNaira:
        values.serviceChargeNaira === "" ? undefined : values.serviceChargeNaira,
      serviceChargePeriod: values.serviceChargePeriod,
      agencyFeeNaira: values.agencyFeeNaira === "" ? undefined : values.agencyFeeNaira,
      legalFeeNaira: values.legalFeeNaira === "" ? undefined : values.legalFeeNaira,
      agreementFeeNaira: values.agreementFeeNaira === "" ? undefined : values.agreementFeeNaira,
      totalMoveInNaira: values.totalMoveInNaira === "" ? undefined : values.totalMoveInNaira,
      minimumTenancyMonths:
        values.minimumTenancyMonths === "" ? undefined : values.minimumTenancyMonths,
      availableFrom: values.availableFrom === "" ? undefined : values.availableFrom,
      furnished: values.furnished === "" ? undefined : values.furnished,
      rateNaira: values.rateNaira === "" ? undefined : values.rateNaira,
      salePriceNaira: values.salePriceNaira === "" ? undefined : values.salePriceNaira,
      saleAgencyFeeNaira: values.saleAgencyFeeNaira === "" ? undefined : values.saleAgencyFeeNaira,
      saleLegalFeeNaira: values.saleLegalFeeNaira === "" ? undefined : values.saleLegalFeeNaira,
      governorsConsentFeeNaira: values.governorsConsentFeeNaira === "" ? undefined : values.governorsConsentFeeNaira,
      stampDutyNaira: values.stampDutyNaira === "" ? undefined : values.stampDutyNaira,
      surveyRegistrationFeeNaira: values.surveyRegistrationFeeNaira === "" ? undefined : values.surveyRegistrationFeeNaira,
      totalPurchaseNaira: values.totalPurchaseNaira === "" ? undefined : values.totalPurchaseNaira,
      priceNegotiable: values.priceNegotiable,
      tenure: values.tenure === "" ? undefined : values.tenure,
      saleStatus: values.saleStatus,
      yearBuilt: values.yearBuilt === "" ? undefined : values.yearBuilt,
      condition: values.condition === "" ? undefined : values.condition,
      powerGrid: values.powerGrid === "" ? undefined : values.powerGrid,
      powerBackup: values.powerBackup === "" ? undefined : values.powerBackup,
      powerBackupHours: values.powerBackupHours === "" ? undefined : values.powerBackupHours,
      waterSupply: values.waterSupply === "" ? undefined : values.waterSupply,
      prepaidMeter: values.prepaidMeter,
    });

    if (!result.ok) {
      setNotice(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return listingId;
    }

    setNotice(null);
    setFieldErrors({});
    setListingId(result.data.id);
    setSavedAt(formatDate(new Date(), locale, { hour: "2-digit", minute: "2-digit" }));

    const amenityResult = await setAmenities({
      listingId: result.data.id,
      codes: chosenAmenities,
    });
    if (!amenityResult.ok) setNotice(amenityResult.error);

    /* The gate details go to their own table, which the public page cannot
       read. Written on every autosave like everything else, so a host who
       types a gate code and closes the phone does not lose it. */
    const accessResult = await setListingAccess({
      listingId: result.data.id,
      estateName: values.estateName,
      gateDirections: values.gateDirections,
      securityPhone: values.securityPhone,
      accessCode: values.accessCode,
    });
    if (!accessResult.ok) setNotice(accessResult.error);

    return result.data.id;
  }, [canPersist, chosenAmenities, listingId, values]);

  function go(next: number) {
    const target = Math.min(STEP_KEYS.length - 1, Math.max(0, next));

    // The title is the one thing asked for before moving on, and the sentence
    // shown is the gate's own, so step one and the submit checklist never
    // phrase the same requirement two different ways. The draft is still saved
    // before we stop, because a refusal must never cost the agent their work.
    const titleIssue = unmet.find((item) => item.field === "title");
    if (target > step && step === 0 && titleIssue) {
      setFieldErrors((prev) => ({ ...prev, title: gateText("title", titleIssue.message) }));
      startTransition(async () => {
        await persist();
      });
      return;
    }

    startTransition(async () => {
      await persist();
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* --------------------------------------------------------------- photos */

  /** Reject anything that would look soft in search results. */
  async function widthOf(file: File): Promise<number> {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        bitmap.close();
        return width;
      } catch {
        /* fall through to the image element */
      }
    }
    return await new Promise<number>((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image.naturalWidth);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      image.src = url;
    });
  }

  /**
   * Re-encode a photo before it leaves the phone.
   *
   * A camera photo carries EXIF, and on a phone that usually includes GPS
   * coordinates. Listing photos are served from a public bucket, so uploading
   * the original file would publish the exact location of the property to
   * anyone who downloads the image, which is precisely what the platform
   * promises not to do before an inspection. Drawing the image onto a canvas
   * and exporting it produces pixels with no metadata at all, so the tag
   * cannot survive.
   *
   * The long edge is capped at 2560px, comfortably above the 1600px minimum
   * the quality gate demands, which also cuts the upload down for someone on
   * a slow connection. If anything about the re-encode fails the original file
   * is refused rather than uploaded, because publishing a geotagged photo is
   * worse than asking for another one.
   */
  async function stripMetadata(file: File): Promise<Blob | null> {
    const MAX_EDGE = 2560;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        return null;
      }
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      });
    } catch {
      return null;
    }
  }

  async function onFiles(files: FileList | readonly File[] | null) {
    if (!files || files.length === 0) return;
    setPhotoNotice(null);

    if (!canPersist || !userId) {
      setPhotoNotice(copy.photos.needsKeys);
      return;
    }

    setUploading(true);
    try {
      const id = listingId ?? (await persist());
      if (!id) {
        setPhotoNotice(copy.photos.needsTitle);
        return;
      }

      const supabase = createClient();
      let slot = photos.length;

      for (const file of Array.from(files)) {
        if (slot >= MAX_PHOTOS) {
          setPhotoNotice(fill(copy.photos.ceiling, { max: MAX_PHOTOS }));
          break;
        }
        if (!file.type.startsWith("image/")) {
          setPhotoNotice(copy.photos.notAnImage);
          continue;
        }
        const width = await widthOf(file);
        if (width < MIN_PHOTO_WIDTH) {
          setPhotoNotice(fill(copy.photos.tooNarrow, { width: MIN_PHOTO_WIDTH }));
          continue;
        }

        // Strip location metadata before the photo leaves the device. The
        // re-encode always produces a JPEG, so the stored extension follows.
        const clean = await stripMetadata(file);
        if (!clean) {
          setPhotoNotice(copy.photos.notPrepared);
          continue;
        }

        /*
         * THE BUCKET'S OWN CEILING, CHECKED BEFORE THE BYTES LEAVE.
         *
         * `MAX_UPLOAD_BYTES` is fifty megabytes and the `listing-photos`
         * bucket is capped at ten, so a photograph between the two was
         * uploaded in full on somebody's mobile data and then refused by
         * storage at the very end. The re-encode above usually lands well
         * under ten, which is exactly why this is measured on the RE-ENCODED
         * blob: that is the object that will be posted, and the original's
         * size says nothing about it.
         */
        const tooBig = rejectUpload(
          { type: "image/jpeg", size: clean.size },
          PHOTO_MIME_TYPES,
          MAX_PHOTO_BYTES,
        );
        if (tooBig) {
          setPhotoNotice(tooBig);
          continue;
        }

        const path = `${userId}/${id}/${crypto.randomUUID()}.jpg`;

        const upload = await supabase.storage
          .from("listing-photos")
          .upload(path, clean, { contentType: "image/jpeg", upsert: false });
        if (upload.error) {
          setPhotoNotice(copy.photos.uploadFailed);
          continue;
        }

        const attached = await addPhoto({ listingId: id, storagePath: path, position: slot });
        if (!attached.ok) {
          setPhotoNotice(attached.error);
          continue;
        }

        const url = supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
        setPhotos((prev) => [...prev, { id: attached.data.photoId, path, url }]);
        slot += 1;
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function orderPhotos(next: Photo[]) {
    setPhotos(next);
    if (!canPersist || !listingId) return;
    startTransition(async () => {
      const result = await reorderPhotos({
        listingId,
        orderedIds: next.map((p) => p.id),
      });
      if (!result.ok) {
        setPhotoNotice(result.error);
        return;
      }
      // Adopt the ids the platform settled on: at the ten photo ceiling one row
      // is rewritten, and holding a stale id would break the next reorder.
      setPhotos((prev) =>
        result.data.photos.map((photo) => ({
          id: photo.id,
          path: photo.path,
          url: prev.find((p) => p.path === photo.path)?.url ?? "",
        })),
      );
    });
  }

  /*
   * Move one photograph one place, which is what the grid's two arrows do.
   *
   * It replaces `makeCover`, and it can do that because the cover IS the
   * first photograph: walking one to the front makes it the cover, and the
   * Cover mark on the grid says so while it moves. That is one control doing
   * one thing instead of a "Make cover" button and a separate ordering that
   * could disagree with each other.
   */
  function movePhoto(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = photos.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    orderPhotos(next);
  }

  function dropPhoto(index: number) {
    const chosen = photos[index];
    if (!chosen) return;
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    if (!canPersist || !listingId) return;
    startTransition(async () => {
      const result = await removePhoto({ listingId, photoId: chosen.id });
      if (!result.ok) setPhotoNotice(result.error);
    });
  }

  /* --------------------------------------------------------------- submit */

  function send() {
    startTransition(async () => {
      const id = listingId ?? (await persist());
      if (!id) {
        setNotice(canPersist ? copy.submit.needsTitle : copy.submit.needsKeys);
        return;
      }
      const result = await submitListing({ listingId: id });
      if (!result.ok) {
        setNotice(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setNotice(null);
      setFieldErrors({});
      setSubmitted(true);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing depends on this */
      }
      router.refresh();
    });
  }

  /* ----------------------------------------------------------- the render */

  if (submitted) {
    return <ListingSentForReview copy={copy} reference={reference} />;
  }

  const price = priceMinor > 0 ? formatMoney(priceMinor, locale) : null;
  const stateName = states.find((s) => s.code === values.stateCode)?.name ?? "";

  return (
    <div className="mx-auto max-w-2xl pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/*
        THE RAIL, DRAWN AS THE THREE GOVERNING IMAGES DRAW IT.

        A back chevron, then the row of small filled rectangles, on one line.
        `SegmentedProgress` is gone from this surface and is untouched for its
        other callers: it draws a full-width track of `--nf-radius-pill`
        segments, and the roles README calls this row "small filled
        rectangles" and translates every capsule in these renders to a rounded
        rectangle. The ARIA contract it carried is kept exactly, because a
        screen reader being told where it is in an eight step form was the
        whole reason that component was written.

        The jump-back control keeps its geometry too: a transparent row of
        44pt buttons laid OVER a 10px bar, rather than 10px tap targets on the
        control that undoes a wrong turn.
      */}
      <div className="nf-lw-rail py-lg">
        <button
          type="button"
          className="nf-lw-back"
          onClick={() => go(step - 1)}
          disabled={step === 0 || pending}
          aria-label={copy.wizard.back}
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
        <div className="relative flex-1">
          <div
            role="progressbar"
            aria-label={fill(copy.wizard.stepCounter, {
              current: step + 1,
              total: STEP_KEYS.length,
            })}
            aria-valuemin={1}
            aria-valuemax={STEP_KEYS.length}
            aria-valuenow={step + 1}
            className="nf-lw-rail__track"
          >
            {stepNames.map((name, index) => (
              <span
                key={name}
                className="nf-lw-rail__seg"
                data-done={index <= step ? "" : undefined}
                data-at={index === step ? "" : undefined}
              />
            ))}
          </div>
          <ol
            className="absolute inset-0 flex items-stretch gap-inline-tight"
            aria-label={copy.wizard.stepsLabel}
          >
            {stepNames.map((name, index) => (
              <li key={name} className="flex-1">
                <button
                  type="button"
                  onClick={() => index <= step && go(index)}
                  disabled={index > step}
                  aria-current={index === step ? "step" : undefined}
                  aria-label={fill(copy.wizard.stepAria, { number: index + 1, name })}
                  className="block h-full w-full"
                />
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* The title and its one sentence, with the step's object on the right.
          The "3 of 8" counter is gone from the picture and kept in the rail's
          accessible name, which is where the renders put that information:
          the row of rectangles says it to a sighted reader already. */}
      <StepHead
        title={(stepKey && copy.drawn.titles[stepKey]) || (stepNames[step] ?? "")}
        sub={stepKey && copy.drawn.subtitles[stepKey]}
        object={stepKey && STEP_OBJECT[stepKey]}
      />

      {!canPersist && (
        <div className="mt-group">
          <Note>{copy.wizard.unconfiguredNotice}</Note>
        </div>
      )}

      {notice && (
        <div className="mt-group">
          <Note glyph="flag" role="status">
            {notice}
          </Note>
        </div>
      )}

      <div className="nf-panel nf-panel--card block mt-group p-card sm:p-cell">
        {/* ---------------------------------------------------- 1 basic info */}
        {step === 0 && (
          <div className="space-y-lg">
            {/*
              The two fields that can actually fail validation use the shared
              TextField/TextArea. The local `Field` above them only draws a
              label and a message: `aria-invalid` on a `.nf-field` changes
              nothing a sighted user can see, because that class paints its
              border with a border-box gradient and the error rule sets
              `border-color` underneath it. A screen reader knew the title was
              rejected; nobody else did.
            */}
            <TextField
              label={copy.basics.titleLabel}
              /* STORE-16: a warning, never a refusal. */
              hint={looksLikeStreetAddress(values.title) ? STREET_IN_TITLE_WARNING : copy.basics.titleHint}
              error={fieldErrors.title}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={copy.basics.titlePlaceholder}
              maxLength={80}
            />

            <div>
              <span className="nf-label">{copy.basics.propertyTypeLabel}</span>
              {/*
                06 screen one draws the property types THREE ACROSS, each one
                a centred glass object over a single word, with no description
                inside the card and a tick on the one chosen. They were two
                across with the blurb inside them, which is the same
                information at twice the height and none of the drawn grid.

                THE BLURB IS NOT DROPPED, it moves. A card that only says
                "Rental" cannot tell somebody it means a yearly tenancy rather
                than a house let by the night, and that distinction is the
                whole reason both cards exist. So the chosen type's line sits
                in the calm panel under the grid, which is where the reader
                needs it: after choosing, not before.
              */}
              <div className="nf-lw-choices nf-lw-choices--3">
                {TYPE_ORDER.map((type) => (
                  <Choice
                    key={type}
                    centred
                    name={copy.propertyTypes[type].label}
                    object={TYPE_OBJECT[type]}
                    chosen={values.propertyType === type}
                    onClick={() => set("propertyType", type)}
                  />
                ))}
              </div>
              <div className="mt-row">
                <Note glyph="info">{copy.propertyTypes[values.propertyType].blurb}</Note>
              </div>
              {rental && (
                <div className="mt-row">
                  <Note>{copy.basics.rentalNote}</Note>
                </div>
              )}
            </div>

            <TextArea
              label={copy.basics.descriptionLabel}
              error={fieldErrors.description}
              hint={fill(copy.basics.descriptionHint, {
                words,
                min: MIN_DESCRIPTION_WORDS,
              })}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={copy.basics.descriptionPlaceholder}
              textAreaClassName="min-h-[9rem]"
            />
            {preference && (
              <div className="mt-row" data-testid="tenant-preference-warning">
                <Note glyph="info">
                  {`This reads as a tenant preference ("${preference}"). Vallo does not allow refusing people for their ethnicity, religion, marital status or gender, so a listing that says this is held for review before it goes up. See `}
                  <Link href="/standards" className="underline">our standards</Link>.
                </Note>
              </div>
            )}

            {/*
              THE ROOMS, DRAWN AS GOVERNING-06 SCREEN THREE DRAWS THEM.

              Every fact is a row: the object on its plate, the fact's name,
              the question it is asking under that, and the control on the
              right. The three counts get the stepper the render draws as one
              rounded rectangle; the three that are not counts get a field or
              a select on a line of their own inside the same row. Size
              carries the Optional mark, which is a capsule in the render and
              a rounded rectangle here.

              What this replaces is six bare inputs in a two column grid with
              their labels floating above them, which shares no anatomy with
              the render at all. Guests and beds are still gone with the
              short-stay model, for the reason recorded before: asking for a
              number nothing stores is asking somebody to type into a void.
            */}
            <div>
              <span className="nf-label">{copy.drawn.rooms.title}</span>
              <div className="nf-lw-facts">
                <FactRow
                  glyph="bed"
                  name={copy.basics.counters.bedrooms}
                  ask={copy.drawn.rooms.bedroomsAsk}
                >
                  <Stepper
                    inline
                    value={values.bedrooms}
                    min={0}
                    max={20}
                    fewerLabel={counterAria("fewer", copy.basics.counters.bedrooms)}
                    moreLabel={counterAria("more", copy.basics.counters.bedrooms)}
                    onChange={(v) => set("bedrooms", v)}
                  />
                </FactRow>
                <FactRow
                  glyph="bath"
                  name={copy.basics.counters.bathrooms}
                  ask={copy.drawn.rooms.bathroomsAsk}
                >
                  <Stepper
                    inline
                    value={values.bathrooms}
                    min={0}
                    max={20}
                    fewerLabel={counterAria("fewer", copy.basics.counters.bathrooms)}
                    moreLabel={counterAria("more", copy.basics.counters.bathrooms)}
                    onChange={(v) => set("bathrooms", v)}
                  />
                </FactRow>
                {/* Toilets is a count in the render and was a free text box
                    here, which is the one row a Nigerian listing is asked
                    about most and the one that could be typed wrong. */}
                <FactRow
                  glyph="bath"
                  name={copy.drawn.rooms.toilets}
                  ask={copy.drawn.rooms.toiletsAsk}
                >
                  <Stepper
                    inline
                    value={toiletCount}
                    min={0}
                    max={20}
                    fewerLabel={counterAria("fewer", copy.drawn.rooms.toilets)}
                    moreLabel={counterAria("more", copy.drawn.rooms.toilets)}
                    onChange={(v) => set("toilets", v === 0 ? "" : String(v))}
                  />
                </FactRow>
                <FactRow
                  glyph="parking"
                  name={copy.drawn.rooms.parking}
                  ask={copy.drawn.rooms.parkingAsk}
                >
                  <Stepper
                    inline
                    value={parkingCount}
                    min={0}
                    max={20}
                    fewerLabel={counterAria("fewer", copy.drawn.rooms.parking)}
                    moreLabel={counterAria("more", copy.drawn.rooms.parking)}
                    onChange={(v) => set("parkingSpaces", v === 0 ? "" : String(v))}
                  />
                </FactRow>

                <FactRow
                  stacked
                  glyph="grid"
                  name={copy.drawn.rooms.size}
                  ask={copy.drawn.rooms.sizeAsk}
                  optional={copy.drawn.rooms.optional}
                >
                  <input
                    className="nf-field"
                    inputMode="decimal"
                    aria-label={copy.drawn.rooms.size}
                    value={values.sizeSqm}
                    onChange={(e) =>
                      set("sizeSqm", e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))
                    }
                    placeholder="150"
                  />
                  {fieldErrors.sizeSqm && (
                    <span className="nf-body-sm mt-inline-tight block font-medium text-[var(--nf-state-error)]">
                      {fieldErrors.sizeSqm}
                    </span>
                  )}
                </FactRow>

                <FactRow
                  stacked
                  glyph="home"
                  name={copy.drawn.rooms.furnishing}
                  ask={copy.drawn.rooms.furnishingAsk}
                >
                  <select
                    className="nf-field"
                    aria-label={copy.drawn.rooms.furnishing}
                    value={values.furnished}
                    onChange={(e) => set("furnished", e.target.value as Furnishing | "")}
                  >
                    <option value="">{copy.drawn.rooms.notStated}</option>
                    {FURNISHING_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </FactRow>

                <FactRow
                  stacked
                  glyph="building-apartment"
                  name={copy.drawn.rooms.floor}
                  ask={copy.drawn.rooms.floorAsk}
                >
                  <div className="grid grid-cols-2 gap-row">
                    <input
                      className="nf-field"
                      inputMode="numeric"
                      aria-label={copy.drawn.rooms.floor}
                      value={values.floor}
                      onChange={(e) => set("floor", digitsOnly(e.target.value, 3))}
                      placeholder="2"
                    />
                    <input
                      className="nf-field"
                      inputMode="numeric"
                      aria-label={copy.drawn.rooms.floors}
                      value={values.totalFloors}
                      onChange={(e) => set("totalFloors", digitsOnly(e.target.value, 3))}
                      placeholder="5"
                    />
                  </div>
                  {(fieldErrors.floor || fieldErrors.totalFloors) && (
                    <span className="nf-body-sm mt-inline-tight block font-medium text-[var(--nf-state-error)]">
                      {fieldErrors.floor ?? fieldErrors.totalFloors}
                    </span>
                  )}
                </FactRow>
              </div>
            </div>

            {/*
              BUILD CONDITION, AND IT USED TO BE ASKED ONLY OF A SALE.

              GOVERNING-06 screen four heads "Condition and availability" and
              draws the four conditions as cards. It is a fact about the
              BUILDING, not about the transaction, and a tenant asks it as
              often as a buyer does: "newly built" and "older build" are the
              difference between a flat you move into and one you renovate.
              The column has always been on every listing and was null on
              every rental, because the only control that wrote it lived
              inside the for-sale branch.

              The availability half of that render stays with the tenancy
              terms on the price step, where the date sits beside the shortest
              tenancy it has to agree with.
            */}
            <fieldset>
              <legend className="nf-label mb-inline">
                {copy.drawn.checkOver.keys.condition}
              </legend>
              <div className="nf-lw-choices">
                {CONDITION_CHOICES.map((c) => (
                  <Choice
                    key={c.value}
                    name={c.label}
                    object={CONDITION_OBJECT[c.value]}
                    chosen={values.condition === c.value}
                    onClick={() => set("condition", values.condition === c.value ? "" : c.value)}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {/* -------------------------------------------------------- 2 photos */}
        {step === 1 && (
          <div className="space-y-group">
            <Note>
              {fill(copy.photos.intro, { min: MIN_PHOTOS, max: MAX_PHOTOS })}{" "}
              {fill(copy.photos.tooNarrow, { width: MIN_PHOTO_WIDTH })}
            </Note>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => void onFiles(e.target.files)}
            />

            {photoNotice && <Note glyph="flag" role="status">{photoNotice}</Note>}

            {/*
              THE GRID OF GOVERNING-07 SCREEN FOUR.

              Three across, each photograph in a rounded rectangle with the
              Cover mark on the first, a round cross to drop it, and the add
              cell last carrying a round plus. The render's bottom-corner grip
              is a DRAG handle; ours is a pair of real move controls, because
              a reorder that needs a pointer is a photograph an agent on a
              phone cannot move, and every photograph on this platform is
              uploaded from a phone.

              The "Make cover" text button is gone: moving a photograph to the
              front IS making it the cover, which the grid now says with the
              mark rather than with a second control that meant the same
              thing.
            */}
            <ul className="nf-lw-shots">
              {photos.map((photo, index) => (
                <li key={photo.id} className="nf-lw-shot" data-cover={index === 0 ? "" : undefined}>
                  <RemoteImage
                    src={photo.url}
                    alt=""
                    width={640}
                    height={480}
                    sizes="(max-width: 40rem) 33vw, 14rem"
                    className="nf-lw-shot__img"
                  />
                  {index === 0 && <span className="nf-lw-shot__cover">{copy.photos.cover}</span>}
                  <button
                    type="button"
                    className="nf-lw-shot__drop"
                    aria-label={copy.photos.remove}
                    onClick={() => dropPhoto(index)}
                  >
                    <UiIcon name="close" size={14} />
                  </button>
                  <span className="nf-lw-shot__moves">
                    <button
                      type="button"
                      className="nf-lw-shot__move"
                      aria-label={copy.drawn.photos.earlier}
                      disabled={index === 0}
                      onClick={() => movePhoto(index, index - 1)}
                    >
                      <UiIcon name="arrow-left" size={14} />
                    </button>
                    <button
                      type="button"
                      className="nf-lw-shot__move"
                      aria-label={copy.drawn.photos.later}
                      disabled={index === photos.length - 1}
                      onClick={() => movePhoto(index, index + 1)}
                    >
                      <UiIcon name="arrow-right" size={14} />
                    </button>
                  </span>
                </li>
              ))}
              {photos.length < MAX_PHOTOS && (
                <li className="contents">
                  <button
                    type="button"
                    className="nf-lw-add"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                  >
                    <span className="nf-lw-add__plus" aria-hidden="true">
                      <UiIcon name="plus" size={18} />
                    </span>
                    <span>{uploading ? copy.photos.uploading : copy.drawn.photos.add}</span>
                  </button>
                </li>
              )}
              {photos.length < MAX_PHOTOS && nativeCamera && (
                <li className="contents">
                  <button
                    type="button"
                    className="nf-lw-add"
                    data-testid="listing-photo-camera"
                    onClick={() =>
                      void capturePhoto().then((shot) => {
                        if (shot) void onFiles([shot]);
                      })
                    }
                    disabled={uploading}
                  >
                    <span className="nf-lw-add__plus" aria-hidden="true">
                      <UiIcon name="picture" size={18} />
                    </span>
                    <span>{copy.photos.takePhoto}</span>
                  </button>
                </li>
              )}
            </ul>

            <p className="nf-numeric text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {fill(copy.photos.progress, { count: photos.length, min: MIN_PHOTOS })}
            </p>

            {photos.length === 0 && <Note>{copy.photos.empty}</Note>}

            {/*
              THE WALKTHROUGH, ON THE SAME STEP AS THE PHOTOGRAPHS.

              GOVERNING-07 screen four puts it here, under the photo grid,
              headed "Video walkthrough" with the calm explanatory line above
              the clip. It belongs with the photographs because it is the same
              decision a lister is making: what a stranger will see.
            */}
            <VideoWalkthrough
              listingId={listingId}
              userId={userId}
              videos={videos}
              onChange={setVideos}
              canUpload={canPersist && userId !== null}
              ensureListing={persist}
            />
          </div>
        )}

        {/* ------------------------------------------------------ 3 location */}
        {step === 2 && (
          <div className="space-y-lg">
            <Field label={copy.location.stateLabel} error={fieldErrors.stateCode}>
              <select
                className="nf-field"
                value={values.stateCode}
                onChange={(e) => set("stateCode", e.target.value)}
              >
                <option value="">{copy.location.statePlaceholder}</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={copy.location.cityLabel} error={fieldErrors.city}>
              <input
                className="nf-field"
                value={values.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder={copy.location.cityPlaceholder}
              />
            </Field>
            <Field
              label={copy.location.areaLabel}
              error={fieldErrors.area}
              hint={copy.location.areaHint}
            >
              <input
                className="nf-field"
                value={values.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder={copy.location.areaPlaceholder}
              />
            </Field>
            <Field label={copy.location.addressLabel} hint={copy.location.addressHint}>
              <input
                className="nf-field"
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder={copy.location.addressPlaceholder}
              />
            </Field>
            <Field label={copy.location.landmarkLabel} hint={copy.location.landmarkHint}>
              <input
                className="nf-field"
                value={values.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                placeholder={copy.location.landmarkPlaceholder}
              />
            </Field>
          </div>
        )}

        {/* ----------------------------------------------------- 4 amenities */}
        {step === 3 && (
          <div>
            <Note>{copy.amenities.intro}</Note>
            {fieldErrors.amenities && (
              <p className="nf-body-sm mt-row font-medium text-[var(--nf-state-error)]">
                {fieldErrors.amenities}
              </p>
            )}
            {/* Three across, a glyph over one word, a round tick on the ones
                that are on. They were wrapping chips, which put the same list
                on the screen with none of the render's grid, none of its
                objects and none of its ticks. */}
            <div className="nf-lw-tiles mt-group">
              {amenities.map((amenity) => {
                const active = chosenAmenities.includes(amenity.code);
                return (
                  <button
                    key={amenity.code}
                    type="button"
                    className="nf-lw-tile"
                    aria-pressed={active}
                    onClick={() =>
                      setChosenAmenities((prev) =>
                        prev.includes(amenity.code)
                          ? prev.filter((c) => c !== amenity.code)
                          : [...prev, amenity.code],
                      )
                    }
                  >
                    <UiIcon name={AMENITY_GLYPH[amenity.code] ?? "sparkle"} size={24} />
                    <span>{amenityNames[amenity.code] ?? amenity.label}</span>
                    {active && (
                      <span className="nf-lw-choice__tick" aria-hidden="true">
                        <UiIcon name="verified-badge" size={20} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --------------------------------------------- 5 light and water */}
        {step === 4 && (
          <div className="space-y-heading">
            <Note>
              Is there light, is there water, and will they let a guest through
              the gate. These are the first three questions every guest here
              asks, and answering them honestly wins bookings from the listings
              that do not.
            </Note>

            {/*
              GOVERNING-07 SCREENS ONE AND TWO, WHICH THIS STEP HELD AS CHIPS.

              Power supply, backup and water are each a grid of option cards
              with a glyph, a word, the line that says what the word means and
              a round tick on the one chosen. The blurbs were `title`
              attributes and a single line under the row that changed as you
              picked: a tooltip is invisible on a phone, and one line under
              five choices makes you choose before you can read what you chose.
              Every blurb is on its own card now.
            */}
            <fieldset>
              <legend className="nf-label mb-inline">{copy.drawn.supply.power}</legend>
              <div className="nf-lw-choices">
                {POWER_GRID_CHOICES.map((choice) => (
                  <Choice
                    key={choice.value}
                    name={choice.label}
                    sub={choice.blurb}
                    glyph={GRID_GLYPH[choice.value]}
                    chosen={values.powerGrid === choice.value}
                    onClick={() =>
                      set("powerGrid", values.powerGrid === choice.value ? "" : choice.value)
                    }
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="nf-label mb-inline">{copy.drawn.supply.backup}</legend>
              <div className="nf-lw-choices">
                {POWER_BACKUP_CHOICES.map((choice) => (
                  <Choice
                    key={choice.value}
                    name={choice.label}
                    glyph={BACKUP_GLYPH[choice.value]}
                    chosen={values.powerBackup === choice.value}
                    onClick={() => {
                      const next = values.powerBackup === choice.value ? "" : choice.value;
                      set("powerBackup", next);
                      /* Hours against a backup that does not exist is refused
                         by the database, so choosing "no backup" clears them
                         here rather than letting the save bounce. */
                      if (next === "NONE" || next === "") set("powerBackupHours", "");
                    }}
                  />
                ))}
              </div>
            </fieldset>

            {values.powerBackup !== "" && values.powerBackup !== "NONE" && (
              <div>
                <span className="nf-label">{copy.drawn.supply.backupHours}</span>
                {/* The render draws this as one wide stepper rather than a
                    number field, and it is right: an agent knows the hours as
                    a count and typing "8" into a box is the slower way to say
                    a number you are already holding up on your fingers. */}
                <Stepper
                  value={backupHours}
                  min={0}
                  max={MAX_BACKUP_HOURS}
                  fewerLabel={counterAria("fewer", copy.drawn.supply.backupHours)}
                  moreLabel={counterAria("more", copy.drawn.supply.backupHours)}
                  onChange={(v) => set("powerBackupHours", String(v))}
                />
                {fieldErrors.powerBackupHours ? (
                  <span className="nf-body-sm mt-inline-tight block font-medium text-[var(--nf-state-error)]">
                    {fieldErrors.powerBackupHours}
                  </span>
                ) : (
                  <span className="nf-body-sm mt-inline-tight block text-[var(--nf-content-muted)]">
                    &quot;Generator&quot; on its own tells a guest nothing; the hours are the answer.
                  </span>
                )}
              </div>
            )}

            <fieldset>
              <legend className="nf-label mb-inline">{copy.drawn.supply.water}</legend>
              <div className="nf-lw-choices">
                {WATER_SUPPLY_CHOICES.map((choice) => (
                  <Choice
                    key={choice.value}
                    name={choice.label}
                    sub={choice.blurb}
                    glyph={WATER_GLYPH[choice.value]}
                    chosen={values.waterSupply === choice.value}
                    onClick={() =>
                      set("waterSupply", values.waterSupply === choice.value ? "" : choice.value)
                    }
                  />
                ))}
              </div>
            </fieldset>

            {/* The render draws a TOGGLE on this row, and it was a bare 24px
                checkbox painted with `accent-color`: the one control on this
                step that the platform's own switch primitive already owned. */}
            <Switch
              label={copy.drawn.supply.prepaid}
              description={copy.drawn.supply.prepaidBody}
              checked={values.prepaidMeter}
              onCheckedChange={(v) => set("prepaidMeter", v)}
            />

            {/* ------------------------------------------------ the gate */}
            <div className="nf-panel nf-panel--card block p-card">
              <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                Getting through the gate
              </p>
              <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
                Nobody can read any of this from your public page. It is released
                only to a guest whose booking is confirmed, and to nobody else,
                ever. The page will say the estate has a gate and that the
                details arrive on confirmation.
              </p>

              <div className="mt-group space-y-group">
                <Field label="Estate or compound name" error={fieldErrors.estateName}>
                  <input
                    className="nf-field"
                    value={values.estateName}
                    maxLength={MAX_ESTATE_NAME}
                    onChange={(e) => set("estateName", e.target.value)}
                    placeholder="Alagomeji Court"
                  />
                </Field>
                <Field
                  label="What to tell the gate"
                  hint="The words that get somebody through, in the order they need them."
                  error={fieldErrors.gateDirections}
                >
                  <textarea
                    className="nf-field min-h-[84px] resize-y"
                    value={values.gateDirections}
                    maxLength={MAX_GATE_DIRECTIONS}
                    onChange={(e) => set("gateDirections", e.target.value)}
                    placeholder="Second gate off Herbert Macaulay. Tell security you are visiting flat 4B."
                  />
                </Field>
                <Field label="Security desk number" error={fieldErrors.securityPhone}>
                  <input
                    className="nf-field"
                    inputMode="tel"
                    value={values.securityPhone}
                    maxLength={MAX_SECURITY_PHONE}
                    onChange={(e) => set("securityPhone", e.target.value)}
                    placeholder="0803 000 0000"
                  />
                </Field>
                <Field label="Access code" error={fieldErrors.accessCode}>
                  <input
                    className="nf-field"
                    value={values.accessCode}
                    maxLength={MAX_ACCESS_CODE}
                    onChange={(e) => set("accessCode", e.target.value)}
                    placeholder="4471"
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- 5 pricing */}
        {step === 5 && (
          <div className="space-y-lg">
            {/*
              The first question, and everything below it follows.

              This is the choice the whole product turns on and until now the
              wizard never asked it: a person with a flat to sell had to price
              it per night. The two cards are deliberately the same size and
              equally weighted, because Vallo is a marketplace for renting AND
              buying and leaning the layout toward one of them would quietly
              tell half the listers they are in the wrong place.
            */}
            <fieldset>
              <legend className="nf-label mb-inline">What are you listing it for?</legend>
              <div className="nf-lw-choices">
                {LISTING_INTENT_CHOICES.map((choice) => (
                  <Choice
                    key={choice.value}
                    name={choice.label}
                    sub={choice.blurb}
                    object={choice.value === "sale" ? "keys-tag" : "keys-home"}
                    chosen={values.intent === choice.value}
                    onClick={() => set("intent", choice.value)}
                  />
                ))}
              </div>
            </fieldset>

            {/* ------------------------------------------------------- a sale */}
            {forSale && (
              <>
                <Field
                  label="Asking price"
                  error={fieldErrors.salePrice ?? fieldErrors.salePriceNaira}
                  hint={
                    saleMinor > 0
                      ? `${formatMoney(saleMinor, locale)} asking price`
                      : "In naira. Buyers filter on this figure, so it is the one number that has to be right."
                  }
                >
                  <input
                    className="nf-field"
                    inputMode="decimal"
                    value={values.salePriceNaira}
                    onChange={(e) => set("salePriceNaira", e.target.value)}
                    placeholder="180,000,000"
                  />
                </Field>

                <Switch
                  label="The price is negotiable"
                  description="Say so and a buyer will open the conversation rather than scroll past."
                  checked={values.priceNegotiable}
                  onCheckedChange={(v) => set("priceNegotiable", v)}
                />

                {/*
                  WHAT A BUYER ACTUALLY PAYS.

                  The tenancy side has had an honest cost model for weeks and
                  the sale side had an asking price and nothing else, which is
                  the same lie in a much bigger currency. Agency and legal are
                  conventionally five per cent each, and Governor's consent,
                  stamp duty and registration run to several per cent more of
                  the value of the land. A buyer who plans around the asking
                  price finds twenty million naira they had not budgeted for
                  after they are committed.

                  Nothing here is calculated from the price, although four of
                  the five have a conventional percentage. A rate that is
                  usually five per cent is not five per cent, and a number this
                  platform worked out and printed as a fact would be an
                  invented number. The lister states what they charge.
                */}
                <div className="nf-panel nf-panel--card block p-card">
                  <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                    What a buyer actually pays
                  </p>
                  <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
                    Fill in whatever applies. Anything you leave blank is shown
                    as not stated, never as zero, and a fee you do not charge is
                    worth saying with a nought.
                  </p>

                  <div className="mt-group grid grid-cols-2 gap-row">
                    <Field label="Agency fee" error={fieldErrors.saleAgencyFeeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.saleAgencyFeeNaira}
                        onChange={(e) => set("saleAgencyFeeNaira", e.target.value)}
                        placeholder="9,000,000"
                      />
                    </Field>
                    <Field label="Legal fee" error={fieldErrors.saleLegalFeeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.saleLegalFeeNaira}
                        onChange={(e) => set("saleLegalFeeNaira", e.target.value)}
                        placeholder="9,000,000"
                      />
                    </Field>
                    <Field
                      label="Governor's consent"
                      error={fieldErrors.governorsConsentFeeNaira}
                    >
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.governorsConsentFeeNaira}
                        onChange={(e) => set("governorsConsentFeeNaira", e.target.value)}
                        placeholder="14,000,000"
                      />
                    </Field>
                    <Field label="Stamp duty" error={fieldErrors.stampDutyNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.stampDutyNaira}
                        onChange={(e) => set("stampDutyNaira", e.target.value)}
                        placeholder="1,440,000"
                      />
                    </Field>
                  </div>

                  <div className="mt-row">
                    <Field
                      label="Survey and registration"
                      error={fieldErrors.surveyRegistrationFeeNaira}
                    >
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.surveyRegistrationFeeNaira}
                        onChange={(e) => set("surveyRegistrationFeeNaira", e.target.value)}
                        placeholder="900,000"
                      />
                    </Field>
                  </div>

                  <div className="mt-group">
                    <Field
                      label="Total to buy"
                      error={fieldErrors.totalPurchaseNaira}
                      hint={
                        statedPurchaseMinor === null
                          ? purchasePartsMinor > 0
                            ? `Leave blank and we show ${formatMoney(purchasePartsMinor, locale)}, which is the price plus the costs above.`
                            : "The number a buyer has to find. Leave it blank and we add up the price and the costs above."
                          : `${formatMoney(statedPurchaseMinor, locale)} all in. It has to be at least ${formatMoney(purchasePartsMinor, locale)}, which is the price plus the costs above.`
                      }
                    >
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.totalPurchaseNaira}
                        onChange={(e) => set("totalPurchaseNaira", e.target.value)}
                        placeholder="205,000,000"
                      />
                    </Field>
                  </div>

                  {purchaseMinor > 0 && (
                    <div className="mt-group flex items-baseline justify-between gap-inline border-t border-[var(--nf-border-subtle)] pt-row">
                      <span className="nf-body-sm text-[var(--nf-content-secondary)]">
                        Total to buy
                      </span>
                      <span className="nf-numeric nf-h4 font-bold">
                        {formatMoney(purchaseMinor, locale)}
                      </span>
                    </div>
                  )}
                  {purchaseMinor > 0 && (
                    <p className="nf-caption mt-inline-tight text-right text-[var(--nf-content-muted)]">
                      {statedPurchaseMinor === null
                        ? "from the price and the costs above"
                        : "as you stated it"}
                    </p>
                  )}
                </div>

                {/*
                  The question every Nigerian buyer asks first, and the one a
                  fraudulent listing will not answer. It is required by the
                  submit gate rather than encouraged, because a property for
                  sale with no stated title is the shape of every land scam
                  there has ever been.
                */}
                <fieldset>
                  <legend className="nf-label mb-inline">What title comes with it?</legend>
                  <div className="flex flex-wrap gap-inline">
                    {TENURE_CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className="nf-chip min-h-11"
                        aria-pressed={values.tenure === choice.value}
                        title={choice.blurb}
                        onClick={() =>
                          set("tenure", values.tenure === choice.value ? "" : choice.value)
                        }
                      >
                        {values.tenure === choice.value && <UiIcon name="verified" size={16} />}
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <p className="nf-body-sm mt-inline text-[var(--nf-content-muted)]">
                    {TENURE_CHOICES.find((c) => c.value === values.tenure)?.blurb ??
                      "A buyer will ask before anything else. Answering here saves both of you a journey."}
                  </p>
                  {fieldErrors.tenure && (
                    <p className="nf-body-sm mt-inline-tight font-medium text-[var(--nf-state-error)]">
                      {fieldErrors.tenure}
                    </p>
                  )}
                </fieldset>

                <fieldset>
                  <legend className="nf-label mb-inline">Where the sale stands</legend>
                  <div className="flex flex-wrap gap-inline">
                    {SALE_STATUS_CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className="nf-chip min-h-11"
                        aria-pressed={values.saleStatus === choice.value}
                        onClick={() => set("saleStatus", choice.value)}
                      >
                        {values.saleStatus === choice.value && (
                          <UiIcon name="verified" size={16} />
                        )}
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-row">
                  <Field label="Year built" error={fieldErrors.yearBuilt}>
                    <input
                      className="nf-field"
                      inputMode="numeric"
                      value={values.yearBuilt}
                      onChange={(e) => set("yearBuilt", digitsOnly(e.target.value, 4))}
                      placeholder="2019"
                    />
                  </Field>
                </div>


              </>
            )}

            {/* ---------------------------------------------------- a tenancy */}
            {tenancy && (
              <>
                <Field
                  label="Rent"
                  error={fieldErrors.rent ?? fieldErrors.rentNaira}
                  hint={
                    rentMinor > 0
                      ? `${formatMoney(rentMinor, locale)} ${PERIOD_WORD[values.rentPeriod]}`
                      : copy.pricing.priceHint
                  }
                >
                  <input
                    className="nf-field"
                    inputMode="decimal"
                    value={values.rentNaira}
                    onChange={(e) => set("rentNaira", e.target.value)}
                    placeholder="4,500,000"
                  />
                </Field>

                <fieldset>
                  <legend className="nf-label mb-inline">How often is it paid?</legend>
                  <div className="flex flex-wrap gap-inline">
                    {RENT_PERIOD_CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className="nf-chip min-h-11"
                        aria-pressed={values.rentPeriod === choice.value}
                        onClick={() => set("rentPeriod", choice.value)}
                      >
                        {values.rentPeriod === choice.value && (
                          <UiIcon name="verified" size={16} />
                        )}
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Switch
                  label="The rent is negotiable"
                  description="Say so and somebody who is close will start the conversation."
                  checked={values.rentNegotiable}
                  onCheckedChange={(v) => set("rentNegotiable", v)}
                />

                {/*
                  WHAT IT ACTUALLY COSTS TO MOVE IN.

                  A 4.5m yearly rent in Lagos routinely means seven million at
                  the door once caution, agency, legal and agreement fees are
                  counted, and every one of those was invisible on this platform
                  until now. A tenant who travels across the city to be told the
                  real figure has been wasted, and the agent has wasted a
                  Saturday too. Every field is optional because agents genuinely
                  quote different subsets, and an unstated fee renders as
                  unstated rather than as zero: "no agency fee" is a selling
                  point and "we did not say" is not the same promise.
                */}
                <div className="nf-panel nf-panel--card block p-card">
                  <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                    What it costs to move in
                  </p>
                  <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">
                    Fill in whatever you charge. Anything you leave blank is
                    shown as not stated, never as zero.
                  </p>

                  <div className="mt-group grid grid-cols-2 gap-row">
                    <Field label="Caution deposit" error={fieldErrors.cautionDepositNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.cautionDepositNaira}
                        onChange={(e) => set("cautionDepositNaira", e.target.value)}
                        placeholder="450,000"
                      />
                    </Field>
                    <Field label="Agency fee" error={fieldErrors.agencyFeeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.agencyFeeNaira}
                        onChange={(e) => set("agencyFeeNaira", e.target.value)}
                        placeholder="450,000"
                      />
                    </Field>
                    <Field label="Legal fee" error={fieldErrors.legalFeeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.legalFeeNaira}
                        onChange={(e) => set("legalFeeNaira", e.target.value)}
                        placeholder="225,000"
                      />
                    </Field>
                    <Field label="Agreement fee" error={fieldErrors.agreementFeeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.agreementFeeNaira}
                        onChange={(e) => set("agreementFeeNaira", e.target.value)}
                        placeholder="225,000"
                      />
                    </Field>
                  </div>

                  <div className="mt-row grid grid-cols-2 gap-row">
                    <Field label="Service charge" error={fieldErrors.serviceChargeNaira}>
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.serviceChargeNaira}
                        onChange={(e) => set("serviceChargeNaira", e.target.value)}
                        placeholder="600,000"
                      />
                    </Field>
                    <Field label="Service charge cycle">
                      <select
                        className="nf-field"
                        value={values.serviceChargePeriod}
                        onChange={(e) =>
                          set("serviceChargePeriod", e.target.value as RentPeriod)
                        }
                      >
                        {RENT_PERIOD_CHOICES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-group">
                    <Field
                      label="Total to move in"
                      error={fieldErrors.totalMoveInNaira}
                      hint={
                        statedTotalMinor === null
                          ? partsSumMinor > 0
                            ? `Leave blank and we show ${formatMoney(partsSumMinor, locale)}, which is what the parts above come to.`
                            : "The one number people shop on. Leave it blank and we add up the parts above."
                          : `${formatMoney(statedTotalMinor, locale)} at the door. It has to be at least ${formatMoney(partsSumMinor, locale)}, which is what the parts above come to.`
                      }
                    >
                      <input
                        className="nf-field"
                        inputMode="decimal"
                        value={values.totalMoveInNaira}
                        onChange={(e) => set("totalMoveInNaira", e.target.value)}
                        placeholder="7,000,000"
                      />
                    </Field>
                  </div>

                </div>

                {/*
                  GOVERNING-08 SCREEN TWO, AND IT WAS THE ONE SCREEN OF THE
                  TWELVE THAT EXISTED NOWHERE IN THIS FLOW.

                  What stood here was one bold figure and a four word caption.
                  The render is a breakdown: a row per cost with its object,
                  its basis, its amount and who keeps it, then the total in its
                  own lit panel. It matters more here than on the listing page,
                  because this is the screen where the silences are still
                  fixable: an agent who sees "Not declared" against the legal
                  fee, in the reader's own words, can go up two boxes and
                  declare it.
                */}
                <div>
                  <p className="nf-label">{copy.drawn.tenantPays.title}</p>
                  <p className="nf-body-sm mb-row text-[var(--nf-content-secondary)]">
                    {copy.drawn.tenantPays.lede}
                  </p>
                  <TenantPays
                    facts={paysFacts}
                    currency="NGN"
                    locale={locale}
                    copy={copy}
                    moveInCopy={moveInCopy}
                  />
                  {statedTotalMinor !== null && statedTotalMinor > partsSumMinor && (
                    <div className="mt-row">
                      <Note>
                        {fill(
                          "You have stated {total} as the total to move in, which is {gap} more than the parts above come to. A searcher sees your total, so name what the difference is for.",
                          {
                            total: formatMoney(statedTotalMinor, locale),
                            gap: formatMoney(statedTotalMinor - partsSumMinor, locale),
                          },
                        )}
                      </Note>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-row">
                  <Field
                    label="Shortest tenancy, in months"
                    error={fieldErrors.minimumTenancyMonths}
                  >
                    <input
                      className="nf-field"
                      inputMode="numeric"
                      value={values.minimumTenancyMonths}
                      onChange={(e) =>
                        set("minimumTenancyMonths", digitsOnly(e.target.value, 3))
                      }
                      placeholder="12"
                    />
                  </Field>
                  <Field label="Available from" error={fieldErrors.availableFrom}>
                    <input
                      className="nf-field"
                      type="date"
                      value={values.availableFrom}
                      onChange={(e) => set("availableFrom", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Furnishing">
                  <select
                    className="nf-field"
                    value={values.furnished}
                    onChange={(e) => set("furnished", e.target.value as Furnishing | "")}
                  >
                    <option value="">Not stated</option>
                    {FURNISHING_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <p className="text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
                  {copy.pricing.rentalNote}
                </p>
              </>
            )}

            {/* ------------------------------------------------- a short stay */}
            {shortStay && (
              <Field
                label={perHead ? "Price per head" : copy.pricing.priceNightLabel}
                error={fieldErrors.rate ?? fieldErrors.rateNaira}
                hint={
                  rateMinor > 0
                    ? fill(copy.pricing.priceWithPeriod, {
                        price: formatMoney(rateMinor, locale),
                        period: perHead ? "per head" : copy.pricing.perNight,
                      })
                    : copy.pricing.priceHint
                }
              >
                <input
                  className="nf-field"
                  inputMode="decimal"
                  value={values.rateNaira}
                  onChange={(e) => set("rateNaira", e.target.value)}
                  placeholder={copy.pricing.priceNightPlaceholder}
                />
              </Field>
            )}

            <Field
              label="Available from"
              hint="Shown on the listing so nobody asks."
              error={fieldErrors.availableFrom}
            >
              {shortStay || forSale ? (
                <input
                  className="nf-field"
                  type="date"
                  value={values.availableFrom}
                  onChange={(e) => set("availableFrom", e.target.value)}
                />
              ) : (
                <span className="block text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                  Set above, with the tenancy terms.
                </span>
              )}
            </Field>
          </div>
        )}

        {/* ---------------------------------------------------- 6 guest view */}
        {step === 6 && (
          <div>
            <Note>{copy.guestView.intro}</Note>
            <article className="nf-panel nf-panel--card block mt-group overflow-hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--nf-surface-raised)]">
                {photos[0] ? (
                  /* The guest view's cover: one wide 4:3 plate, so it earns a
                     larger candidate than the grid above it. */
                  <RemoteImage
                    src={photos[0].url}
                    alt=""
                    width={960}
                    height={720}
                    sizes="(max-width: 48rem) 100vw, 30rem"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                    {copy.guestView.addPhotos}
                  </div>
                )}
                <div
                  /* The platform scrim, not a hand-rolled black gradient. One
                     definition, used by the listing card and the gallery too, so
                     a preview of a card matches the card it previews. */
                  className="absolute inset-x-0 bottom-0 h-20"
                  style={{ backgroundImage: "var(--nf-scrim-media)" }}
                  aria-hidden="true"
                />
                {/* One badge, and which one it is says which market this is. The
                    instant-book badge is gone with the column behind it. */}
                {forSale ? (
                  <span className="nf-badge nf-badge--warning absolute left-3 top-3">
                    For sale
                  </span>
                ) : rental ? (
                  <span className="nf-badge nf-badge--brand absolute left-3 top-3">
                    {copy.guestView.rentBadge}
                  </span>
                ) : null}
                {/*
                  ON MEDIA, WHICH IS ITS OWN TOKEN FAMILY.

                  This line sits on the listing's own photograph, so it is not
                  a dark-theme colour and it is not a light-theme colour: it is
                  ink on somebody's picture, in both themes, and
                  `--nf-content-on-media` is the token that says so. The
                  `text-white/90` and `text-white/70` it replaces happened to
                  look right and could never follow a theme, which is exactly
                  the distinction the on-media family exists to hold.
                */}
                <p className="nf-body-sm absolute bottom-3 left-3 right-3 flex items-center gap-inline-tight font-medium text-[var(--nf-content-on-media)]">
                  <UiIcon
                    name="location"
                    size={12}
                    className="shrink-0 text-[var(--nf-content-on-media-muted)]"
                  />
                  <span className="truncate">
                    {[values.area, values.city, stateName].filter(Boolean).join(", ") ||
                      copy.guestView.locationPlaceholder}
                  </span>
                </p>
              </div>
              <div className="p-card">
                <h3 className="text-[length:var(--nf-text-body-sm)] font-semibold leading-snug">
                  {values.title || copy.guestView.titlePlaceholder}
                </h3>
                <p className="nf-body-sm mt-inline-tight text-[var(--nf-content-muted)]">
                  {/* The dictionary sentence names a guest count this model no
                      longer has, so the preview states the two facts it does
                      hold rather than printing a number nothing stores. */}
                  {[
                    `${values.bedrooms} bed`,
                    `${values.bathrooms} bath`,
                    values.toilets ? `${values.toilets} toilet` : null,
                    values.sizeSqm ? `${values.sizeSqm} sqm` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-inline flex items-baseline gap-inline-tight">
                  <span className="nf-numeric text-[length:var(--nf-text-body-lg)] font-bold">
                    {price ?? copy.guestView.priceToSet}
                  </span>
                  <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                    {pricePeriod}
                  </span>
                </p>
                {chosenAmenities.length > 0 && (
                  <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">
                    {chosenAmenities
                      .map(
                        (code) =>
                          amenityNames[code] ??
                          amenities.find((a) => a.code === code)?.label ??
                          code,
                      )
                      .slice(0, 4)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </article>
            <p className="nf-body-sm mt-group whitespace-pre-line leading-relaxed text-[var(--nf-content-secondary)]">
              {values.description || copy.guestView.descriptionPlaceholder}
            </p>

            {/*
              THE LISTING DETAILS TABLE OF GOVERNING-08 SCREEN THREE.

              A glyph, the fact, the value, and the control that goes back and
              changes it. The wizard had the preview card and stopped there, so
              the last thing an agent saw before sending was a picture they
              could not act on: spotting a wrong bedroom count meant walking
              back through the steps by hand to find where it lived.

              EVERY VALUE HERE IS WHAT THE FORM HOLDS, and a fact nobody has
              set reads "Not set" rather than a zero or a guess. `Edit` jumps
              to the step that OWNS the fact, which is why the target is a step
              index and not a scroll position.
            */}
            <p className="nf-label mt-heading">{copy.drawn.checkOver.detailsTitle}</p>
            <div className="nf-lw-details">
              {[
                {
                  key: "propertyType",
                  glyph: "home" as UiIconName,
                  label: copy.drawn.checkOver.keys.propertyType,
                  value: copy.propertyTypes[values.propertyType]?.label,
                  step: 0,
                },
                {
                  key: "bedrooms",
                  glyph: "bed" as UiIconName,
                  label: copy.drawn.checkOver.keys.bedrooms,
                  value: values.bedrooms > 0 ? String(values.bedrooms) : null,
                  step: 0,
                },
                {
                  key: "bathrooms",
                  glyph: "bath" as UiIconName,
                  label: copy.drawn.checkOver.keys.bathrooms,
                  value: values.bathrooms > 0 ? String(values.bathrooms) : null,
                  step: 0,
                },
                {
                  key: "size",
                  glyph: "grid" as UiIconName,
                  label: copy.drawn.checkOver.keys.size,
                  /* The unit is written beside the figure rather than folded
                     into it, because the figure is the agent's and the unit
                     is ours. */
                  value: values.sizeSqm ? `${values.sizeSqm} m²` : null,
                  step: 0,
                },
                {
                  key: "furnishing",
                  glyph: "home" as UiIconName,
                  label: copy.drawn.checkOver.keys.furnishing,
                  value:
                    FURNISHING_CHOICES.find((c) => c.value === values.furnished)?.label ?? null,
                  step: 0,
                },
                {
                  key: "floor",
                  glyph: "building-apartment" as UiIconName,
                  label: copy.drawn.checkOver.keys.floor,
                  value: values.floor === "" ? null : values.floor,
                  step: 0,
                },
                {
                  key: "condition",
                  glyph: "verified" as UiIconName,
                  label: copy.drawn.checkOver.keys.condition,
                  value: CONDITION_CHOICES.find((c) => c.value === values.condition)?.label ?? null,
                  step: 5,
                },
                {
                  key: "availability",
                  glyph: "calendar-booking" as UiIconName,
                  label: copy.drawn.checkOver.keys.availability,
                  /* The box holds an ISO day. `formatDate` takes a Date, and
                     a bare `new Date("2026-10-01")` is parsed as UTC midnight,
                     which reads as the day before in every timezone west of
                     Greenwich. Splitting the parts builds it in local time. */
                  value: availableFromDate
                    ? formatDate(availableFromDate, locale)
                    : copy.drawn.checkOver.availableNow,
                  step: 5,
                },
              ].map((row) => (
                <div key={row.key} className="nf-lw-detail">
                  <span className="nf-lw-detail__glyph" aria-hidden="true">
                    <UiIcon name={row.glyph} size={16} />
                  </span>
                  <span className="nf-lw-detail__key">{row.label}</span>
                  <span className="nf-lw-detail__value">
                    {row.value ?? (
                      <span className="text-[var(--nf-content-muted)]">
                        {copy.drawn.checkOver.notSet}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="nf-lw-detail__edit"
                    onClick={() => go(row.step)}
                    aria-label={`${copy.drawn.checkOver.edit}: ${row.label}`}
                  >
                    {copy.drawn.checkOver.edit}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- 7 submit */}
        {step === 7 && (
          <div>
            <h2 className="nf-h3">{copy.submit.title}</h2>
            <p className="nf-body-sm mt-inline leading-relaxed text-[var(--nf-content-secondary)]">
              {copy.submit.body}
            </p>

            <ul className="mt-group space-y-row">
              {[
                { field: "title", label: copy.submit.checklist.title },
                {
                  field: "description",
                  label: fill(copy.submit.checklist.description, { min: MIN_DESCRIPTION_WORDS }),
                },
                {
                  field: "photos",
                  label: fill(copy.submit.checklist.photos, { min: MIN_PHOTOS }),
                },
                { field: "stateCode", label: copy.submit.checklist.stateCode },
                { field: "city", label: copy.submit.checklist.city },
                { field: "area", label: copy.submit.checklist.area },
                { field: "amenities", label: copy.submit.checklist.amenities },
                {
                  field: "price",
                  label: rental
                    ? copy.submit.checklist.priceYear
                    : copy.submit.checklist.priceNight,
                },
                { field: "bathrooms", label: copy.submit.checklist.rooms },
              ].map((item) => {
                const problem = unmet.find((u) => u.field === item.field);
                return (
                  <li key={item.field} className="flex items-start gap-row">
                    <span
                      className="mt-inline-tight grid h-5 w-5 shrink-0 place-items-center rounded-full"
                      style={{
                        background: problem
                          ? "var(--nf-state-warning-surface)"
                          : "var(--nf-state-success-surface)",
                        color: problem ? "var(--nf-state-warning)" : "var(--nf-state-success)",
                      }}
                    >
                      <UiIcon name="verified" size={12} />
                    </span>
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[length:var(--nf-text-body-sm)] font-medium">{item.label}</span>
                      {problem && (
                        <span className="block text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                          {gateText(problem.field, problem.message)}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <Button
              variant="primary"
              full
              className="mt-heading"
              onClick={send}
              disabled={unmet.length > 0}
              loading={pending}
            >
              {copy.submit.action}
            </Button>
            <p className="nf-body-sm mt-row text-center text-[var(--nf-content-muted)]">
              {copy.submit.note}
            </p>
          </div>
        )}
      </div>

      {savedAt && (
        <p className="nf-body-sm mt-row text-center text-[var(--nf-content-muted)]">
          {fill(copy.wizard.savedAt, { time: savedAt })}
        </p>
      )}

      {/* Sticky step footer: the way forward never moves. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-gutter pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-row lg:left-[var(--nf-rail-width)]">
        <div className="mx-auto flex max-w-2xl items-center gap-md">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => go(step - 1)}
            disabled={step === 0 || pending}
          >
            {copy.wizard.back}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => go(step + 1)}
              loading={pending}
            >
              {copy.wizard.next}
            </Button>
          ) : (
            <ButtonLink href="/agent/listings" variant="secondary" className="flex-1">
              {copy.wizard.myListings}
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

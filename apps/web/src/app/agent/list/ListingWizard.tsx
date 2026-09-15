"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatMoney, type Dictionary, type Locale } from "@naijafinds/i18n";
import { fill } from "../_copy";
import { createClient } from "@/lib/supabase/client";
import { MomentScreen } from "@/components/app/MomentScreen";
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
  MAX_FLOORS,
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
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SegmentedProgress } from "@/components/ui/Progress";
import { TextField, TextArea } from "@/components/ui/Field";

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

/** The pill switch the pricing step uses twice, for the two negotiable flags. */
function Toggle({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-row rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-row text-left"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span>
        <span className="block text-[0.9375rem] font-medium">{title}</span>
        <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">{body}</span>
      </span>
      <span
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--nf-gradient-agent)" : "var(--nf-surface-raised)" }}
      >
        <span
          /* The knob is a physical object in this metaphor rather than a
             piece of text, so it takes the on-media ink, which is the token
             that means "white in both themes" and is what the platform switch
             in settings-rows.css already uses. `bg-white` is a raw literal and
             the rule is right to catch it. */
          className="absolute top-1 h-5 w-5 rounded-full bg-[var(--nf-content-on-media)] transition-all"
          style={{ left: checked ? "1.625rem" : "0.25rem" }}
        />
      </span>
    </button>
  );
}

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

/** Big plus and minus counter: a comfortable one-handed control. */
function Counter({
  label,
  fewerLabel,
  moreLabel,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  fewerLabel: string;
  moreLabel: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-row border-b border-[var(--nf-border-subtle)] py-row last:border-b-0">
      <span className="text-[0.9375rem] font-medium text-[var(--nf-content-primary)]">{label}</span>
      <span className="flex items-center gap-md">
        <button
          type="button"
          className="nf-icon-btn"
          aria-label={fewerLabel}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <span aria-hidden="true" className="text-[1.25rem] leading-none">
            &minus;
          </span>
        </button>
        <span className="nf-numeric w-7 text-center text-[1rem] font-bold">{value}</span>
        <button
          type="button"
          className="nf-icon-btn"
          aria-label={moreLabel}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <span aria-hidden="true" className="text-[1.25rem] leading-none">
            +
          </span>
        </button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- the wizard */

export function ListingWizard({
  copy,
  locale,
  userId,
  states,
  amenities,
  initial,
  canPersist,
}: {
  copy: WizardCopy;
  locale: Locale;
  userId: string | null;
  states: { code: string; name: string }[];
  amenities: { code: string; label: string }[];
  initial: WizardDraft | null;
  canPersist: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initial ? valuesFrom(initial) : EMPTY);
  const [photos, setPhotos] = useState<Photo[]>(initial?.photos ?? []);
  const [chosenAmenities, setChosenAmenities] = useState<string[]>(initial?.amenityCodes ?? []);
  const [listingId, setListingId] = useState<string | null>(initial?.id ?? null);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

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
  const feeParts = [
    values.rentNaira,
    values.cautionDepositNaira,
    values.agencyFeeNaira,
    values.legalFeeNaira,
    values.agreementFeeNaira,
  ];
  const partsSumMinor = feeParts.reduce(
    (total, raw) => total + (parseNairaToKobo(raw) ?? 0),
    0,
  );
  const statedTotalMinor = parseNairaToKobo(values.totalMoveInNaira);
  const moveInMinor = statedTotalMinor ?? partsSumMinor;

  const words = countWords(values.description);
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

  async function onFiles(files: FileList | null) {
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

  function makeCover(index: number) {
    const chosen = photos[index];
    if (!chosen || index === 0) return;
    orderPhotos([chosen, ...photos.filter((_, i) => i !== index)]);
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
    return (
      <MomentScreen
        variant="success"
        title={copy.submitted.title}
        description={copy.submitted.body}
        actions={
          <>
            <ButtonLink href="/agent/listings" variant="primary">
              {copy.submitted.goToListings}
            </ButtonLink>
            {/* "List another" is the one control on the platform that means a
                blank wizard and nothing else, so it says so. Bare /agent/list
                resumes an open draft now, which is right for the navigation
                entry and would be wrong here. */}
            <ButtonLink href="/agent/list?new=1" variant="secondary">
              {copy.submitted.another}
            </ButtonLink>
          </>
        }
      />
    );
  }

  const price = priceMinor > 0 ? formatMoney(priceMinor, locale) : null;
  const stateName = states.find((s) => s.code === values.stateCode)?.name ?? "";

  return (
    <div className="mx-auto max-w-2xl pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/*
        The step rail.

        The bar itself is `SegmentedProgress`, which is the platform's one
        wizard bar: it carries `role="progressbar"` with the real position
        (there were zero progressbar roles in this codebase, so a screen reader
        was told nothing about how far through an eight-step form somebody was)
        and it fills by a composited transform rather than jumping between
        renders.

        The jump-back-to-a-finished-step control is kept, as a transparent row
        of buttons laid over the bar. Its geometry is the whole point: each of
        these used to BE the 6px painted segment, which is a 6px tap target -
        the worst on the platform, on the control that undoes a wrong turn.
        Overlaying instead of inflating means the target is 44pt while the bar
        stays 6px, so nothing about the picture changes.
      */}
      <div className="relative py-lg">
        <SegmentedProgress
          steps={STEP_KEYS.length}
          current={step + 1}
          label={fill(copy.wizard.stepCounter, { current: step + 1, total: STEP_KEYS.length })}
        />
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
      {/* The step name is the page's heading: a seven step form needs a real
          document outline, and a screen reader announcing the step is how
          someone knows where they are. aria-live tells them it changed. */}
      <div className="mt-heading flex items-baseline justify-between gap-md">
        <h1 className="nf-h3" aria-live="polite">
          {stepNames[step]}
        </h1>
        <span className="nf-numeric shrink-0 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.wizard.stepCounter, { current: step + 1, total: STEP_KEYS.length })}
        </span>
      </div>

      {!canPersist && (
        <p className="nf-card nf-body-sm mt-group p-card leading-relaxed text-[var(--nf-content-secondary)]">
          {copy.wizard.unconfiguredNotice}
        </p>
      )}

      {notice && (
        <p
          className="nf-body-sm mt-group rounded-[var(--nf-radius-md)] p-row font-medium"
          style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="nf-card mt-group p-card sm:p-cell">
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
              hint={copy.basics.titleHint}
              error={fieldErrors.title}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={copy.basics.titlePlaceholder}
              maxLength={80}
            />

            <div>
              <span className="nf-label">{copy.basics.propertyTypeLabel}</span>
              <div className="grid grid-cols-2 gap-inline">
                {TYPE_ORDER.map((type) => {
                  const active = values.propertyType === type;
                  const card = copy.propertyTypes[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("propertyType", type)}
                      aria-pressed={active}
                      /* `nf-option`, not `nf-card`. This grid sits INSIDE the
                         step's own glass surface, and eight cards inside a card
                         is the one nesting rule the surface language has no
                         exceptions to. The selected look moved out of an inline
                         style object and onto `[aria-pressed="true"]`, so the
                         ARIA this control already carried is what paints it and
                         the two grids on this screen cannot drift apart. */
                      className="nf-option"
                    >
                      <span className="nf-body block font-semibold">{card.label}</span>
                      <span className="nf-body-sm mt-inline-tight block leading-snug text-[var(--nf-content-muted)]">
                        {card.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              {rental && (
                <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">
                  {copy.basics.rentalNote}
                </p>
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

            {/*
              Bedrooms and bathrooms, then the four facts a Nigerian listing is
              expected to state and never could.

              Guests and beds are gone with the short-stay model: `max_guests`
              and `beds` are no longer columns, and asking for a number nothing
              stores is asking somebody to type into a void. Toilets, parking,
              floor and size took their place, which is what a person reading a
              listing here actually asks after the rent.
            */}
            <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-row">
              <Counter
                label={copy.basics.counters.bedrooms}
                fewerLabel={counterAria("fewer", copy.basics.counters.bedrooms)}
                moreLabel={counterAria("more", copy.basics.counters.bedrooms)}
                value={values.bedrooms}
                min={0}
                max={20}
                onChange={(v) => set("bedrooms", v)}
              />
              <Counter
                label={copy.basics.counters.bathrooms}
                fewerLabel={counterAria("fewer", copy.basics.counters.bathrooms)}
                moreLabel={counterAria("more", copy.basics.counters.bathrooms)}
                value={values.bathrooms}
                min={0}
                max={20}
                onChange={(v) => set("bathrooms", v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-row">
              <Field label="Toilets" error={fieldErrors.toilets}>
                <input
                  className="nf-field"
                  inputMode="numeric"
                  value={values.toilets}
                  onChange={(e) => set("toilets", digitsOnly(e.target.value, 2))}
                  placeholder="3"
                />
              </Field>
              <Field label="Parking spaces" error={fieldErrors.parkingSpaces}>
                <input
                  className="nf-field"
                  inputMode="numeric"
                  value={values.parkingSpaces}
                  onChange={(e) => set("parkingSpaces", digitsOnly(e.target.value, 2))}
                  placeholder="2"
                />
              </Field>
              <Field
                label="Floor"
                hint="Ground is 0."
                error={fieldErrors.floor}
              >
                <input
                  className="nf-field"
                  inputMode="numeric"
                  value={values.floor}
                  onChange={(e) => set("floor", digitsOnly(e.target.value, 3))}
                  placeholder="2"
                />
              </Field>
              <Field label="Floors in the building" error={fieldErrors.totalFloors}>
                <input
                  className="nf-field"
                  inputMode="numeric"
                  value={values.totalFloors}
                  onChange={(e) => set("totalFloors", digitsOnly(e.target.value, 3))}
                  placeholder="5"
                />
              </Field>
            </div>

            <Field
              label="Size in square metres"
              hint={`Optional, and the only figure here that may carry a decimal. Up to ${MAX_FLOORS} floors are accepted above.`}
              error={fieldErrors.sizeSqm}
            >
              <input
                className="nf-field"
                inputMode="decimal"
                value={values.sizeSqm}
                onChange={(e) => set("sizeSqm", e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))}
                placeholder="120"
              />
            </Field>
          </div>
        )}

        {/* -------------------------------------------------------- 2 photos */}
        {step === 1 && (
          <div className="space-y-group">
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {fill(copy.photos.intro, { min: MIN_PHOTOS, max: MAX_PHOTOS })}{" "}
              {fill(copy.photos.tooNarrow, { width: MIN_PHOTO_WIDTH })}
            </p>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button
              variant="secondary"
              full
              leadingIcon="grid"
              onClick={() => fileInput.current?.click()}
              loading={uploading}
            >
              {photos.length > 0 ? copy.photos.addMore : copy.photos.choose}
            </Button>

            {photoNotice && (
              <p
                className="nf-body-sm rounded-[var(--nf-radius-md)] p-row font-medium"
                style={{
                  background: "var(--nf-state-warning-surface)",
                  color: "var(--nf-state-warning)",
                }}
                role="status"
              >
                {photoNotice}
              </p>
            )}

            <p className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
              {fill(copy.photos.progress, { count: photos.length, min: MIN_PHOTOS })}
            </p>

            {photos.length === 0 ? (
              <div className="rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-subtle)] p-cell text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
                {copy.photos.empty}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-md">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="overflow-hidden rounded-[var(--nf-radius-md)]">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--nf-surface-raised)]">
                      {/* Storage serves these straight from its public URL, so
                          they render without the image optimiser. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      {index === 0 && (
                        <span className="nf-badge nf-badge--brand absolute left-2 top-2">
                          {copy.photos.cover}
                        </span>
                      )}
                    </div>
                    <div className="mt-inline-tight flex items-center justify-between gap-inline">
                      <button
                        type="button"
                        /* `--nf-content-link`, not the palette value it happens to resolve
                           to. A component reaching past the semantic layer into
                           `--nf-electric-300` is the one thing ADR-002 forbids, and it
                           is why this control stayed the dark theme's blue on paper. */
                        className="nf-body-sm font-semibold text-[var(--nf-content-link)] disabled:opacity-40"
                        onClick={() => makeCover(index)}
                        disabled={index === 0}
                      >
                        {copy.photos.makeCover}
                      </button>
                      <button
                        type="button"
                        className="text-[0.75rem] font-semibold text-[var(--nf-content-muted)]"
                        onClick={() => dropPhoto(index)}
                      >
                        {copy.photos.remove}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
            <p className="nf-body-sm mb-group text-[var(--nf-content-secondary)]">
              {copy.amenities.intro}
            </p>
            {fieldErrors.amenities && (
              <p className="nf-body-sm mb-row font-medium text-[var(--nf-state-error)]">
                {fieldErrors.amenities}
              </p>
            )}
            <div className="flex flex-wrap gap-inline">
              {amenities.map((amenity) => {
                const active = chosenAmenities.includes(amenity.code);
                return (
                  <button
                    key={amenity.code}
                    type="button"
                    className="nf-chip min-h-11"
                    aria-pressed={active}
                    onClick={() =>
                      setChosenAmenities((prev) =>
                        prev.includes(amenity.code)
                          ? prev.filter((c) => c !== amenity.code)
                          : [...prev, amenity.code],
                      )
                    }
                  >
                    {active && <UiIcon name="verified" size={16} />}
                    {amenityNames[amenity.code] ?? amenity.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --------------------------------------------- 5 light and water */}
        {step === 4 && (
          <div className="space-y-heading">
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Is there light, is there water, and will they let a guest through
              the gate. These are the first three questions every guest here asks,
              and answering them honestly wins bookings from the listings that do
              not.
            </p>

            <fieldset className="space-y-row">
              <legend className="nf-label mb-inline-tight">Grid supply</legend>
              <div className="flex flex-wrap gap-inline">
                {POWER_GRID_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className="nf-chip min-h-11"
                    aria-pressed={values.powerGrid === choice.value}
                    title={choice.blurb}
                    onClick={() =>
                      set("powerGrid", values.powerGrid === choice.value ? "" : choice.value)
                    }
                  >
                    {values.powerGrid === choice.value && (
                      <UiIcon name="verified" size={16} />
                    )}
                    {choice.label}
                  </button>
                ))}
              </div>
              <p className="text-[0.75rem] text-[var(--nf-content-muted)]">
                {POWER_GRID_CHOICES.find((c) => c.value === values.powerGrid)?.blurb ??
                  "What the distribution company actually gives this address."}
              </p>
            </fieldset>

            <fieldset className="space-y-row">
              <legend className="nf-label mb-inline-tight">Backup</legend>
              <div className="flex flex-wrap gap-inline">
                {POWER_BACKUP_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className="nf-chip min-h-11"
                    aria-pressed={values.powerBackup === choice.value}
                    onClick={() => {
                      const next = values.powerBackup === choice.value ? "" : choice.value;
                      set("powerBackup", next);
                      /* Hours against a backup that does not exist is refused by
                         the database, so choosing "no backup" clears them here
                         rather than letting the save bounce. */
                      if (next === "NONE" || next === "") set("powerBackupHours", "");
                    }}
                  >
                    {values.powerBackup === choice.value && (
                      <UiIcon name="verified" size={16} />
                    )}
                    {choice.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {values.powerBackup !== "" && values.powerBackup !== "NONE" && (
              <Field
                label="Hours a day the backup actually runs"
                hint={`0 to ${MAX_BACKUP_HOURS}. "Generator" on its own tells a guest nothing; the hours are the answer.`}
                error={fieldErrors.powerBackupHours}
              >
                <input
                  className="nf-field"
                  inputMode="numeric"
                  value={values.powerBackupHours}
                  onChange={(e) =>
                    set("powerBackupHours", e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                  }
                  placeholder="8"
                />
              </Field>
            )}

            <fieldset className="space-y-row">
              <legend className="nf-label mb-inline-tight">Water</legend>
              <div className="flex flex-wrap gap-inline">
                {WATER_SUPPLY_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className="nf-chip min-h-11"
                    aria-pressed={values.waterSupply === choice.value}
                    title={choice.blurb}
                    onClick={() =>
                      set("waterSupply", values.waterSupply === choice.value ? "" : choice.value)
                    }
                  >
                    {values.waterSupply === choice.value && (
                      <UiIcon name="verified" size={16} />
                    )}
                    {choice.label}
                  </button>
                ))}
              </div>
              <p className="text-[0.75rem] text-[var(--nf-content-muted)]">
                {WATER_SUPPLY_CHOICES.find((c) => c.value === values.waterSupply)?.blurb ??
                  "Where the water in the taps comes from."}
              </p>
            </fieldset>

            <label className="flex items-center justify-between gap-md border-y border-[var(--nf-border-subtle)] py-row">
              <span>
                <span className="block text-[0.9375rem] font-medium text-[var(--nf-content-primary)]">
                  Prepaid meter
                </span>
                <span className="nf-body-sm mt-inline-tight block text-[var(--nf-content-muted)]">
                  Say so, because it decides whether a guest can be asked to buy units.
                </span>
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 shrink-0 accent-[var(--nf-brand-primary)]"
                checked={values.prepaidMeter}
                onChange={(e) => set("prepaidMeter", e.target.checked)}
              />
            </label>

            {/* ------------------------------------------------ the gate */}
            <div className="rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] p-card">
              <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
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
              <div className="grid grid-cols-2 gap-inline">
                {LISTING_INTENT_CHOICES.map((choice) => {
                  const active = values.intent === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => set("intent", choice.value)}
                      aria-pressed={active}
                      className="nf-option"
                    >
                      <span className="nf-body block font-semibold">{choice.label}</span>
                      <span className="nf-body-sm mt-inline-tight block leading-snug text-[var(--nf-content-muted)]">
                        {choice.blurb}
                      </span>
                    </button>
                  );
                })}
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

                <Toggle
                  title="The price is negotiable"
                  body="Say so and a buyer will open the conversation rather than scroll past."
                  checked={values.priceNegotiable}
                  onChange={(v) => set("priceNegotiable", v)}
                />

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
                  <Field label="Condition">
                    <select
                      className="nf-field"
                      value={values.condition}
                      onChange={(e) => set("condition", e.target.value as BuildCondition | "")}
                    >
                      <option value="">Not stated</option>
                      {CONDITION_CHOICES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
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

                <Toggle
                  title="The rent is negotiable"
                  body="Say so and somebody who is close will start the conversation."
                  checked={values.rentNegotiable}
                  onChange={(v) => set("rentNegotiable", v)}
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
                <div className="rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] p-card">
                  <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
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

                  {moveInMinor > 0 && (
                    <p className="nf-numeric nf-body mt-row font-bold text-[var(--nf-content-primary)]">
                      {formatMoney(moveInMinor, locale)}
                      <span className="nf-body-sm ml-inline-tight font-normal text-[var(--nf-content-muted)]">
                        {statedTotalMinor === null ? "from the parts above" : "as you stated it"}
                      </span>
                    </p>
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

                <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
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
                <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                  Set above, with the tenancy terms.
                </span>
              )}
            </Field>
          </div>
        )}

        {/* ---------------------------------------------------- 6 guest view */}
        {step === 6 && (
          <div>
            <p className="nf-body-sm mb-group text-[var(--nf-content-secondary)]">
              {copy.guestView.intro}
            </p>
            <article className="nf-card overflow-hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--nf-surface-raised)]">
                {photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[0.75rem] text-[var(--nf-content-muted)]">
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
                <h3 className="text-[0.9375rem] font-semibold leading-snug">
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
                  <span className="nf-numeric text-[1.0625rem] font-bold">
                    {price ?? copy.guestView.priceToSet}
                  </span>
                  <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
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
                      <span className="block text-[0.875rem] font-medium">{item.label}</span>
                      {problem && (
                        <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
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

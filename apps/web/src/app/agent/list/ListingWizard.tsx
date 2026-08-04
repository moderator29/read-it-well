"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
  countWords,
  isRental,
  parseNairaToKobo,
  POWER_BACKUP_CHOICES,
  POWER_GRID_CHOICES,
  submitRequirements,
  WATER_SUPPLY_CHOICES,
  type PowerBackup,
  type PowerGrid,
  type PropertyType,
  type WaterSupply,
} from "@/lib/agent/listings-schema";
import { UiIcon } from "@/design-system/icons/UiIcon";

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
const TYPE_ORDER: PropertyType[] = ["apartment", "shortlet", "home", "villa", "hotel", "rental"];

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
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  priceNaira: string;
  cleaningNaira: string;
  minStayNights: number;
  instantBook: boolean;
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

const EMPTY: Values = {
  title: "",
  description: "",
  propertyType: "apartment",
  stateCode: "",
  city: "",
  area: "",
  address: "",
  landmark: "",
  maxGuests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  priceNaira: "",
  cleaningNaira: "",
  minStayNights: 1,
  instantBook: false,
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
    maxGuests: draft.maxGuests,
    bedrooms: draft.bedrooms,
    beds: draft.beds,
    bathrooms: draft.bathrooms,
    priceNaira: draft.priceNaira,
    cleaningNaira: draft.cleaningNaira,
    minStayNights: draft.minStayNights,
    instantBook: draft.instantBook,
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
        <span className="mt-1.5 block text-[0.75rem] font-medium text-[var(--nf-state-error)]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[0.75rem] text-[var(--nf-content-muted)]">{hint}</span>
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
    <div className="flex items-center justify-between gap-3 border-b border-[var(--nf-border-subtle)] py-3 last:border-b-0">
      <span className="text-[0.9375rem] font-medium text-[var(--nf-content-primary)]">{label}</span>
      <span className="flex items-center gap-4">
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
  const priceMinor = parseNairaToKobo(values.priceNaira) ?? 0;
  const cleaningMinor = parseNairaToKobo(values.cleaningNaira) ?? 0;
  const words = countWords(values.description);
  const stepNames = STEP_KEYS.map((key) => copy.wizard.steps[key]);
  const amenityNames = copy.amenities.names as Record<string, string | undefined>;
  const pricePeriod = rental ? copy.pricing.perYear : copy.pricing.perNight;

  const unmet = useMemo(
    () =>
      submitRequirements({
        title: values.title,
        description: values.description,
        propertyType: values.propertyType,
        stateCode: values.stateCode,
        city: values.city,
        area: values.area,
        priceMinor,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        maxGuests: values.maxGuests,
        amenityCount: chosenAmenities.length,
        photoCount: photos.length,
        hasCover: photos.length > 0,
      }),
    [values, priceMinor, chosenAmenities.length, photos.length],
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
      case "price":
        return rental ? g.priceYear : g.priceNight;
      case "bedrooms":
        return g.bedrooms;
      case "bathrooms":
        return g.bathrooms;
      case "maxGuests":
        return g.maxGuests;
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

  // Restore a device draft once, and only when the platform did not hand us
  // one, so a stored listing always wins over whatever this browser remembers.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (initial) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { values?: Partial<Values>; amenities?: string[] };
      if (parsed.values) setValues((prev) => ({ ...prev, ...parsed.values }));
      if (parsed.amenities) setChosenAmenities(parsed.amenities);
    } catch {
      /* a malformed draft is not worth an error message */
    }
  }, [initial]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, amenities: chosenAmenities }));
    } catch {
      /* storage unavailable, the platform copy still holds */
    }
  }, [values, chosenAmenities]);

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
      maxGuests: values.maxGuests,
      bedrooms: values.bedrooms,
      beds: values.beds,
      bathrooms: values.bathrooms,
      priceNaira: values.priceNaira,
      cleaningNaira: values.cleaningNaira,
      minStayNights: values.minStayNights,
      instantBook: values.instantBook,
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
            <Link href="/agent/listings" className="nf-btn nf-btn--primary">
              {copy.submitted.goToListings}
            </Link>
            <Link href="/agent/list" className="nf-btn nf-btn--glass">
              {copy.submitted.another}
            </Link>
          </>
        }
      />
    );
  }

  const price = priceMinor > 0 ? formatMoney(priceMinor, locale) : null;
  const stateName = states.find((s) => s.code === values.stateCode)?.name ?? "";

  return (
    <div className="mx-auto max-w-2xl pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/* Step rail: seven dots stay legible at 390px, the name sits beneath. */}
      <ol className="flex items-center gap-1.5" aria-label={copy.wizard.stepsLabel}>
        {stepNames.map((name, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={name} className="flex-1">
              <button
                type="button"
                onClick={() => index <= step && go(index)}
                disabled={index > step}
                aria-current={current ? "step" : undefined}
                aria-label={fill(copy.wizard.stepAria, { number: index + 1, name })}
                className="block h-1.5 w-full rounded-full transition-colors"
                style={{
                  background:
                    done || current ? "var(--nf-gradient-agent)" : "var(--nf-border-subtle)",
                }}
              />
            </li>
          );
        })}
      </ol>
      {/* The step name is the page's heading: a seven step form needs a real
          document outline, and a screen reader announcing the step is how
          someone knows where they are. aria-live tells them it changed. */}
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h1 className="nf-h3" aria-live="polite">
          {stepNames[step]}
        </h1>
        <span className="nf-numeric shrink-0 text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.wizard.stepCounter, { current: step + 1, total: STEP_KEYS.length })}
        </span>
      </div>

      {!canPersist && (
        <p className="nf-card mt-4 p-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {copy.wizard.unconfiguredNotice}
        </p>
      )}

      {notice && (
        <p
          className="mt-4 rounded-[var(--nf-radius-md)] p-3 text-[0.8125rem] font-medium"
          style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="nf-card mt-4 p-4 sm:p-6">
        {/* ---------------------------------------------------- 1 basic info */}
        {step === 0 && (
          <div className="space-y-5">
            <Field
              label={copy.basics.titleLabel}
              hint={copy.basics.titleHint}
              error={fieldErrors.title}
            >
              <input
                className="nf-field"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={copy.basics.titlePlaceholder}
                maxLength={80}
                aria-invalid={fieldErrors.title ? "true" : undefined}
              />
            </Field>

            <div>
              <span className="nf-label">{copy.basics.propertyTypeLabel}</span>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_ORDER.map((type) => {
                  const active = values.propertyType === type;
                  const card = copy.propertyTypes[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("propertyType", type)}
                      aria-pressed={active}
                      className="nf-card nf-card--interactive p-3 text-left"
                      style={
                        active
                          ? { borderColor: "var(--nf-mode-agent)", boxShadow: "0 0 0 1px var(--nf-mode-agent)" }
                          : undefined
                      }
                    >
                      <span className="block text-[0.875rem] font-semibold">{card.label}</span>
                      <span className="mt-0.5 block text-[0.6875rem] leading-snug text-[var(--nf-content-muted)]">
                        {card.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              {rental && (
                <p className="mt-2 text-[0.75rem] text-[var(--nf-content-secondary)]">
                  {copy.basics.rentalNote}
                </p>
              )}
            </div>

            <Field
              label={copy.basics.descriptionLabel}
              error={fieldErrors.description}
              hint={fill(copy.basics.descriptionHint, {
                words,
                min: MIN_DESCRIPTION_WORDS,
              })}
            >
              <textarea
                className="nf-field min-h-[9rem]"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={copy.basics.descriptionPlaceholder}
                aria-invalid={fieldErrors.description ? "true" : undefined}
              />
            </Field>

            <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3">
              <Counter
                label={copy.basics.counters.guests}
                fewerLabel={counterAria("fewer", copy.basics.counters.guests)}
                moreLabel={counterAria("more", copy.basics.counters.guests)}
                value={values.maxGuests}
                min={1}
                max={30}
                onChange={(v) => set("maxGuests", v)}
              />
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
                label={copy.basics.counters.beds}
                fewerLabel={counterAria("fewer", copy.basics.counters.beds)}
                moreLabel={counterAria("more", copy.basics.counters.beds)}
                value={values.beds}
                min={1}
                max={30}
                onChange={(v) => set("beds", v)}
              />
              <Counter
                label={copy.basics.counters.bathrooms}
                fewerLabel={counterAria("fewer", copy.basics.counters.bathrooms)}
                moreLabel={counterAria("more", copy.basics.counters.bathrooms)}
                value={values.bathrooms}
                min={1}
                max={20}
                onChange={(v) => set("bathrooms", v)}
              />
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- 2 photos */}
        {step === 1 && (
          <div className="space-y-4">
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
            <button
              type="button"
              className="nf-btn nf-btn--glass w-full"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              <UiIcon name="grid" size={20} />
              {uploading
                ? copy.photos.uploading
                : photos.length > 0
                  ? copy.photos.addMore
                  : copy.photos.choose}
            </button>

            {photoNotice && (
              <p
                className="rounded-[var(--nf-radius-md)] p-3 text-[0.8125rem] font-medium"
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
              <div className="rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-subtle)] p-8 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
                {copy.photos.empty}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-4">
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
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-[0.75rem] font-semibold text-[var(--nf-electric-300)] disabled:opacity-40"
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
          <div className="space-y-5">
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
            <p className="mb-4 text-[0.8125rem] text-[var(--nf-content-secondary)]">
              {copy.amenities.intro}
            </p>
            {fieldErrors.amenities && (
              <p className="mb-3 text-[0.75rem] font-medium text-[var(--nf-state-error)]">
                {fieldErrors.amenities}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
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
          <div className="space-y-6">
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Is there light, is there water, and will they let a guest through
              the gate. These are the first three questions every guest here asks,
              and answering them honestly wins bookings from the listings that do
              not.
            </p>

            <fieldset className="space-y-3">
              <legend className="nf-label mb-1">Grid supply</legend>
              <div className="flex flex-wrap gap-2">
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

            <fieldset className="space-y-3">
              <legend className="nf-label mb-1">Backup</legend>
              <div className="flex flex-wrap gap-2">
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

            <fieldset className="space-y-3">
              <legend className="nf-label mb-1">Water</legend>
              <div className="flex flex-wrap gap-2">
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

            <label className="flex items-center justify-between gap-4 border-y border-[var(--nf-border-subtle)] py-3">
              <span>
                <span className="block text-[0.9375rem] font-medium text-[var(--nf-content-primary)]">
                  Prepaid meter
                </span>
                <span className="mt-0.5 block text-[0.75rem] text-[var(--nf-content-muted)]">
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
            <div className="rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] p-4">
              <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                Getting through the gate
              </p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
                Nobody can read any of this from your public page. It is released
                only to a guest whose booking is confirmed, and to nobody else,
                ever. The page will say the estate has a gate and that the
                details arrive on confirmation.
              </p>

              <div className="mt-4 space-y-4">
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
          <div className="space-y-5">
            <Field
              label={rental ? copy.pricing.priceYearLabel : copy.pricing.priceNightLabel}
              // The gate names this "price"; the draft schema names the raw
              // input "priceNaira". Either can arrive, and both mean this box.
              error={fieldErrors.price ?? fieldErrors.priceNaira}
              hint={
                price
                  ? fill(copy.pricing.priceWithPeriod, { price, period: pricePeriod })
                  : copy.pricing.priceHint
              }
            >
              <input
                className="nf-field"
                inputMode="decimal"
                value={values.priceNaira}
                onChange={(e) => set("priceNaira", e.target.value)}
                placeholder={
                  rental ? copy.pricing.priceYearPlaceholder : copy.pricing.priceNightPlaceholder
                }
              />
            </Field>

            {!rental && (
              <>
                <Field
                  label={copy.pricing.cleaningLabel}
                  error={fieldErrors.cleaningNaira}
                  hint={
                    cleaningMinor > 0
                      ? fill(copy.pricing.cleaningHintSet, {
                          amount: formatMoney(cleaningMinor, locale),
                        })
                      : copy.pricing.cleaningHint
                  }
                >
                  <input
                    className="nf-field"
                    inputMode="decimal"
                    value={values.cleaningNaira}
                    onChange={(e) => set("cleaningNaira", e.target.value)}
                    placeholder={copy.pricing.cleaningPlaceholder}
                  />
                </Field>

                <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3">
                  <Counter
                    label={copy.pricing.minStayLabel}
                    fewerLabel={counterAria("fewer", copy.pricing.minStayLabel)}
                    moreLabel={counterAria("more", copy.pricing.minStayLabel)}
                    value={values.minStayNights}
                    min={1}
                    max={365}
                    onChange={(v) => set("minStayNights", v)}
                  />
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-left"
                  aria-pressed={values.instantBook}
                  onClick={() => set("instantBook", !values.instantBook)}
                >
                  <span>
                    <span className="block text-[0.9375rem] font-medium">
                      {copy.pricing.instantTitle}
                    </span>
                    <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                      {copy.pricing.instantBody}
                    </span>
                  </span>
                  <span
                    className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                    style={{
                      background: values.instantBook
                        ? "var(--nf-gradient-agent)"
                        : "var(--nf-surface-raised)",
                    }}
                  >
                    <span
                      className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                      style={{ left: values.instantBook ? "1.625rem" : "0.25rem" }}
                    />
                  </span>
                </button>
              </>
            )}

            {rental && (
              <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {copy.pricing.rentalNote}
              </p>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- 6 guest view */}
        {step === 6 && (
          <div>
            <p className="mb-4 text-[0.8125rem] text-[var(--nf-content-secondary)]">
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
                  className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent"
                  aria-hidden="true"
                />
                {rental && (
                  <span className="nf-badge nf-badge--brand absolute left-3 top-3">
                    {copy.guestView.rentBadge}
                  </span>
                )}
                {values.instantBook && !rental && (
                  <span className="nf-badge nf-badge--warning absolute left-3 top-3">
                    {copy.guestView.instantBadge}
                  </span>
                )}
                <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/90">
                  <UiIcon name="location" size={12} className="shrink-0 text-white/70" />
                  <span className="truncate">
                    {[values.area, values.city, stateName].filter(Boolean).join(", ") ||
                      copy.guestView.locationPlaceholder}
                  </span>
                </p>
              </div>
              <div className="p-4">
                <h3 className="text-[0.9375rem] font-semibold leading-snug">
                  {values.title || copy.guestView.titlePlaceholder}
                </h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
                  {fill(copy.guestView.rooms, {
                    bedrooms: values.bedrooms,
                    bathrooms: values.bathrooms,
                    guests: values.maxGuests,
                  })}
                </p>
                <p className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="nf-numeric text-[1.0625rem] font-bold">
                    {price ?? copy.guestView.priceToSet}
                  </span>
                  <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                    {pricePeriod}
                  </span>
                </p>
                {chosenAmenities.length > 0 && (
                  <p className="mt-2 text-[0.75rem] text-[var(--nf-content-secondary)]">
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
            <p className="mt-4 whitespace-pre-line text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {values.description || copy.guestView.descriptionPlaceholder}
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- 7 submit */}
        {step === 7 && (
          <div>
            <h2 className="nf-h3">{copy.submit.title}</h2>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {copy.submit.body}
            </p>

            <ul className="mt-4 space-y-2.5">
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
                  <li key={item.field} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
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

            <button
              type="button"
              className="nf-btn nf-btn--primary mt-6 w-full"
              onClick={send}
              disabled={pending || unmet.length > 0}
            >
              {pending ? copy.submit.sending : copy.submit.action}
            </button>
            <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
              {copy.submit.note}
            </p>
          </div>
        )}
      </div>

      {savedAt && (
        <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
          {fill(copy.wizard.savedAt, { time: savedAt })}
        </p>
      )}

      {/* Sticky step footer: the way forward never moves. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:left-[var(--nf-rail-width)]">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            type="button"
            className="nf-btn nf-btn--glass flex-1"
            onClick={() => go(step - 1)}
            disabled={step === 0 || pending}
          >
            {copy.wizard.back}
          </button>
          {step < STEP_KEYS.length - 1 ? (
            <button
              type="button"
              className="nf-btn nf-btn--primary flex-1"
              onClick={() => go(step + 1)}
              disabled={pending}
            >
              {pending ? copy.wizard.saving : copy.wizard.next}
            </button>
          ) : (
            <Link href="/agent/listings" className="nf-btn nf-btn--glass flex-1">
              {copy.wizard.myListings}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

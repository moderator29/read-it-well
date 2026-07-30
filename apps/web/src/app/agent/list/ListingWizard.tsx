"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { createClient } from "@/lib/supabase/client";
import {
  addPhoto,
  removePhoto,
  reorderPhotos,
  saveDraft,
  setAmenities,
  submitListing,
} from "@/lib/agent/listings-actions";
import type { WizardDraft } from "@/lib/agent/listings-queries";
import {
  MAX_PHOTOS,
  MIN_DESCRIPTION_WORDS,
  MIN_PHOTOS,
  MIN_PHOTO_WIDTH,
  PHOTO_TOO_NARROW_MESSAGE,
  PROPERTY_TYPES,
  countWords,
  isRental,
  parseNairaToKobo,
  pricePeriodLabel,
  submitRequirements,
  type PropertyType,
} from "@/lib/agent/listings-schema";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The List Apartment wizard: seven steps, canon reference 03.
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
 */

const STEPS = [
  "Basic info",
  "Photos",
  "Location",
  "Amenities",
  "Pricing",
  "Preview",
  "Submit",
] as const;

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
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--nf-border-subtle)] py-3 last:border-b-0">
      <span className="text-[0.9375rem] font-medium text-[var(--nf-content-primary)]">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          className="nf-icon-btn"
          aria-label={`One fewer ${label.toLowerCase()}`}
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
          aria-label={`One more ${label.toLowerCase()}`}
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
  locale,
  userId,
  states,
  amenities,
  initial,
  canPersist,
}: {
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
    });

    if (!result.ok) {
      setNotice(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return listingId;
    }

    setNotice(null);
    setFieldErrors({});
    setListingId(result.data.id);
    setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));

    const amenityResult = await setAmenities({
      listingId: result.data.id,
      codes: chosenAmenities,
    });
    if (!amenityResult.ok) setNotice(amenityResult.error);

    return result.data.id;
  }, [canPersist, chosenAmenities, listingId, values]);

  function go(next: number) {
    const target = Math.min(STEPS.length - 1, Math.max(0, next));

    // The title is the one thing asked for before moving on, and the sentence
    // shown is the gate's own, so step one and the submit checklist never
    // phrase the same requirement two different ways. The draft is still saved
    // before we stop, because a refusal must never cost the agent their work.
    const titleIssue = unmet.find((item) => item.field === "title");
    if (target > step && step === 0 && titleIssue) {
      setFieldErrors((prev) => ({ ...prev, title: titleIssue.message }));
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
      setPhotoNotice(
        "Photos upload once the platform keys land. Everything else you have typed is saved.",
      );
      return;
    }

    setUploading(true);
    try {
      const id = listingId ?? (await persist());
      if (!id) {
        setPhotoNotice("Add a title on step one first, then your photos attach to this listing.");
        return;
      }

      const supabase = createClient();
      let slot = photos.length;

      for (const file of Array.from(files)) {
        if (slot >= MAX_PHOTOS) {
          setPhotoNotice(`A listing holds up to ${MAX_PHOTOS} photos.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setPhotoNotice("Photos need to be image files, for example JPG or PNG.");
          continue;
        }
        const width = await widthOf(file);
        if (width < MIN_PHOTO_WIDTH) {
          setPhotoNotice(PHOTO_TOO_NARROW_MESSAGE);
          continue;
        }

        // Strip location metadata before the photo leaves the device. The
        // re-encode always produces a JPEG, so the stored extension follows.
        const clean = await stripMetadata(file);
        if (!clean) {
          setPhotoNotice(
            "We could not prepare that photo safely, so it was not uploaded. Try a different photo.",
          );
          continue;
        }

        const path = `${userId}/${id}/${crypto.randomUUID()}.jpg`;

        const upload = await supabase.storage
          .from("listing-photos")
          .upload(path, clean, { contentType: "image/jpeg", upsert: false });
        if (upload.error) {
          setPhotoNotice("That photo did not finish uploading. Please try it again.");
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
        setNotice(
          canPersist
            ? "Add a title on step one first, then we can send this listing for review."
            : "Sending for review switches on the moment the platform keys land. Your work is saved on this device.",
        );
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
      <div className="mx-auto max-w-lg py-8 text-center">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-full"
          style={{ background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" }}
        >
          <UiIcon name="verified" size={32} strokeWidth={2.2} />
        </span>
        <h1 className="nf-h2 mt-5">Your listing is with our review team</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[var(--nf-content-secondary)]">
          We check every listing by hand so guests can trust what they book. Reviews take 24 to 48
          hours and you hear from us either way. If anything needs changing we will say exactly what.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/agent/listings" className="nf-btn nf-btn--primary">
            Go to my listings
          </Link>
          <Link href="/agent/list" className="nf-btn nf-btn--glass">
            List another property
          </Link>
        </div>
      </div>
    );
  }

  const price = priceMinor > 0 ? formatMoney(priceMinor, locale) : null;
  const stateName = states.find((s) => s.code === values.stateCode)?.name ?? "";

  return (
    <div className="mx-auto max-w-2xl pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/* Step rail: seven dots stay legible at 390px, the name sits beneath. */}
      <ol className="flex items-center gap-1.5" aria-label="Listing steps">
        {STEPS.map((name, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={name} className="flex-1">
              <button
                type="button"
                onClick={() => index <= step && go(index)}
                disabled={index > step}
                aria-current={current ? "step" : undefined}
                aria-label={`Step ${index + 1}, ${name}`}
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
      <p className="mt-3 flex items-baseline justify-between gap-3">
        <span className="nf-h3">{STEPS[step]}</span>
        <span className="nf-numeric shrink-0 text-[0.75rem] text-[var(--nf-content-muted)]">
          Step {step + 1} of {STEPS.length}
        </span>
      </p>

      {!canPersist && (
        <p className="nf-card mt-4 p-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          Publishing switches on the moment the platform keys land. Keep going: everything you type
          is kept on this device and will be waiting for you.
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
              label="Listing title"
              hint="What a guest sees first. Name the place and what makes it good."
              error={fieldErrors.title}
            >
              <input
                className="nf-field"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Bright 2 bedroom flat in Lekki Phase 1"
                maxLength={80}
                aria-invalid={fieldErrors.title ? "true" : undefined}
              />
            </Field>

            <div>
              <span className="nf-label">Property type</span>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPES.map((type) => {
                  const active = values.propertyType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => set("propertyType", type.value)}
                      aria-pressed={active}
                      className="nf-card nf-card--interactive p-3 text-left"
                      style={
                        active
                          ? { borderColor: "var(--nf-mode-agent)", boxShadow: "0 0 0 1px var(--nf-mode-agent)" }
                          : undefined
                      }
                    >
                      <span className="block text-[0.875rem] font-semibold">{type.label}</span>
                      <span className="mt-0.5 block text-[0.6875rem] leading-snug text-[var(--nf-content-muted)]">
                        {type.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
              {rental && (
                <p className="mt-2 text-[0.75rem] text-[var(--nf-content-secondary)]">
                  Rentals are the yearly market: you set the rent per year, guests message you,
                  inspect the property, then pay. There is no nightly booking on a rental.
                </p>
              )}
            </div>

            <Field
              label="Description"
              error={fieldErrors.description}
              hint={`${words} of ${MIN_DESCRIPTION_WORDS} words. Describe the rooms, the area and what is nearby.`}
            >
              <textarea
                className="nf-field min-h-[9rem]"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell guests about the space, the light, the kitchen, the neighbourhood and how to get around."
                aria-invalid={fieldErrors.description ? "true" : undefined}
              />
            </Field>

            <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3">
              <Counter
                label="Guests"
                value={values.maxGuests}
                min={1}
                max={30}
                onChange={(v) => set("maxGuests", v)}
              />
              <Counter
                label="Bedrooms"
                value={values.bedrooms}
                min={0}
                max={20}
                onChange={(v) => set("bedrooms", v)}
              />
              <Counter
                label="Beds"
                value={values.beds}
                min={1}
                max={30}
                onChange={(v) => set("beds", v)}
              />
              <Counter
                label="Bathrooms"
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
              Add at least {MIN_PHOTOS} photos, up to {MAX_PHOTOS}. The first one is the cover, so
              lead with the wide shot that sells the place. {PHOTO_TOO_NARROW_MESSAGE}
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
              <UiIcon name="grid" size={18} />
              {uploading ? "Uploading" : photos.length > 0 ? "Add more photos" : "Choose photos"}
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
              {photos.length} of {MIN_PHOTOS} needed
            </p>

            {photos.length === 0 ? (
              <div className="rounded-[var(--nf-radius-lg)] border border-dashed border-[var(--nf-border-subtle)] p-8 text-center text-[0.8125rem] text-[var(--nf-content-muted)]">
                No photos yet. Daylight, wide angles and a tidy room do most of the work.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="overflow-hidden rounded-[var(--nf-radius-md)]">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--nf-surface-raised)]">
                      {/* Storage serves these straight from its public URL, so
                          they render without the image optimiser. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      {index === 0 && (
                        <span className="nf-badge nf-badge--brand absolute left-2 top-2">Cover</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-[0.75rem] font-semibold text-[var(--nf-electric-300)] disabled:opacity-40"
                        onClick={() => makeCover(index)}
                        disabled={index === 0}
                      >
                        Make cover
                      </button>
                      <button
                        type="button"
                        className="text-[0.75rem] font-semibold text-[var(--nf-content-muted)]"
                        onClick={() => dropPhoto(index)}
                      >
                        Remove
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
            <Field label="State" error={fieldErrors.stateCode}>
              <select
                className="nf-field"
                value={values.stateCode}
                onChange={(e) => set("stateCode", e.target.value)}
              >
                <option value="">Choose a state</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City" error={fieldErrors.city}>
              <input
                className="nf-field"
                value={values.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Lagos"
              />
            </Field>
            <Field label="Area" error={fieldErrors.area} hint="The neighbourhood guests search for.">
              <input
                className="nf-field"
                value={values.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="Lekki Phase 1"
              />
            </Field>
            <Field
              label="Street address"
              hint="Kept private until a booking is confirmed or you share it in chat."
            >
              <input
                className="nf-field"
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="12 Admiralty Way"
              />
            </Field>
            <Field label="Landmark" hint="Something nearby that makes the place easy to find.">
              <input
                className="nf-field"
                value={values.landmark}
                onChange={(e) => set("landmark", e.target.value)}
                placeholder="Opposite the Lekki roundabout"
              />
            </Field>
          </div>
        )}

        {/* ----------------------------------------------------- 4 amenities */}
        {step === 3 && (
          <div>
            <p className="mb-4 text-[0.8125rem] text-[var(--nf-content-secondary)]">
              Choose everything a guest will actually find at the property. Honest lists earn better
              reviews than long ones.
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
                    {active && <UiIcon name="verified" size={14} strokeWidth={2.2} />}
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------- 5 pricing */}
        {step === 4 && (
          <div className="space-y-5">
            <Field
              label={rental ? "Yearly rent" : "Price per night"}
              // The gate names this "price"; the draft schema names the raw
              // input "priceNaira". Either can arrive, and both mean this box.
              error={fieldErrors.price ?? fieldErrors.priceNaira}
              hint={
                price
                  ? `${price} ${pricePeriodLabel(values.propertyType)}`
                  : "Enter the amount in naira, for example 85,000."
              }
            >
              <input
                className="nf-field"
                inputMode="decimal"
                value={values.priceNaira}
                onChange={(e) => set("priceNaira", e.target.value)}
                placeholder={rental ? "2,500,000" : "85,000"}
              />
            </Field>

            {!rental && (
              <>
                <Field
                  label="Cleaning"
                  error={fieldErrors.cleaningNaira}
                  hint={
                    cleaningMinor > 0
                      ? `${formatMoney(cleaningMinor, locale)} added once per stay.`
                      : "Optional. Added once per stay, not per night."
                  }
                >
                  <input
                    className="nf-field"
                    inputMode="decimal"
                    value={values.cleaningNaira}
                    onChange={(e) => set("cleaningNaira", e.target.value)}
                    placeholder="10,000"
                  />
                </Field>

                <div className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3">
                  <Counter
                    label="Shortest stay in nights"
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
                    <span className="block text-[0.9375rem] font-medium">Instant book</span>
                    <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                      Guests book without waiting for you to confirm.
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
                Rentals are priced per year. Guests message you inside RentMe, inspect the property,
                then pay. For your safety, keep every chat and payment inside RentMe.
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------- 6 preview */}
        {step === 5 && (
          <div>
            <p className="mb-4 text-[0.8125rem] text-[var(--nf-content-secondary)]">
              This is how your listing appears in search.
            </p>
            <article className="nf-card overflow-hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--nf-surface-raised)]">
                {photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[0.75rem] text-[var(--nf-content-muted)]">
                    Add photos to complete the card
                  </div>
                )}
                <div
                  className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 to-transparent"
                  aria-hidden="true"
                />
                {rental && (
                  <span className="nf-badge nf-badge--brand absolute left-3 top-3">Rent</span>
                )}
                {values.instantBook && !rental && (
                  <span className="nf-badge nf-badge--warning absolute left-3 top-3">Instant</span>
                )}
                <p className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-white/90">
                  <UiIcon name="location" size={13} className="shrink-0 text-white/70" />
                  <span className="truncate">
                    {[values.area, values.city, stateName].filter(Boolean).join(", ") ||
                      "Add a location on step three"}
                  </span>
                </p>
              </div>
              <div className="p-4">
                <h3 className="text-[0.9375rem] font-semibold leading-snug">
                  {values.title || "Your listing title"}
                </h3>
                <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-muted)]">
                  {values.bedrooms} bed &middot; {values.bathrooms} bath &middot; sleeps{" "}
                  {values.maxGuests}
                </p>
                <p className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="nf-numeric text-[1.0625rem] font-bold">
                    {price ?? "Price to set"}
                  </span>
                  <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                    {pricePeriodLabel(values.propertyType)}
                  </span>
                </p>
                {chosenAmenities.length > 0 && (
                  <p className="mt-2 text-[0.75rem] text-[var(--nf-content-secondary)]">
                    {chosenAmenities
                      .map((code) => amenities.find((a) => a.code === code)?.label ?? code)
                      .slice(0, 4)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </article>
            <p className="mt-4 whitespace-pre-line text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {values.description || "Your description appears on the listing page."}
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- 7 submit */}
        {step === 6 && (
          <div>
            <h2 className="nf-h3">Ready to send for review</h2>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              We check every listing by hand before it reaches guests. Clear that checklist and it
              goes straight into the queue.
            </p>

            <ul className="mt-4 space-y-2.5">
              {[
                { field: "title", label: "Title" },
                { field: "description", label: `Description of ${MIN_DESCRIPTION_WORDS} words or more` },
                { field: "photos", label: `${MIN_PHOTOS} photos or more, cover first` },
                { field: "stateCode", label: "State" },
                { field: "city", label: "City" },
                { field: "area", label: "Area" },
                { field: "amenities", label: "Amenities" },
                { field: "price", label: rental ? "Yearly rent" : "Price per night" },
                { field: "bathrooms", label: "Rooms and guests" },
              ].map((item) => {
                const problem = unmet.find((u) => u.field === item.field);
                return (
                  <li key={item.field} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                      style={{
                        background: problem
                          ? "var(--nf-state-warning-surface)"
                          : "var(--nf-state-success-surface)",
                        color: problem ? "var(--nf-state-warning)" : "var(--nf-state-success)",
                      }}
                    >
                      <UiIcon name="verified" size={12} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[0.875rem] font-medium">{item.label}</span>
                      {problem && (
                        <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                          {problem.message}
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
              {pending ? "Sending" : "Send for review"}
            </button>
            <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
              Reviews take 24 to 48 hours. You hear from us either way.
            </p>
          </div>
        )}
      </div>

      {savedAt && (
        <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
          Saved at {savedAt}
        </p>
      )}

      {/* Sticky step footer: the way forward never moves. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--nf-border-subtle)] bg-[var(--nf-surface-primary)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:left-[var(--nf-rail-width)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            className="nf-btn nf-btn--glass flex-1"
            onClick={() => go(step - 1)}
            disabled={step === 0 || pending}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="nf-btn nf-btn--primary flex-1"
              onClick={() => go(step + 1)}
              disabled={pending}
            >
              {pending ? "Saving" : "Next"}
            </button>
          ) : (
            <Link href="/agent/listings" className="nf-btn nf-btn--glass flex-1">
              My listings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

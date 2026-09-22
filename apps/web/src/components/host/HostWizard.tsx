"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@vallo/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { SegmentedProgress } from "@/components/ui/Progress";
import { TYPE } from "@/components/app/Screen";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  addAccommodationDraft,
  addRatePlanDraft,
  addRoomTypeDraft,
  addServiceWindowDraft,
  saveHostDraft,
  setRestaurantProfileDraft,
  submitHostApplication,
} from "@/lib/host/actions";
import {
  BUSINESS_SECTIONS,
  CONSENTS,
  HOST_TYPE_DEFINITIONS,
  HOST_TYPES,
  hostsAccommodation,
  missingFrom,
  progressLabel,
  stepsFor,
  type BusinessKind,
  type ConsentId,
  type HostDocumentKind,
  type HostDraft,
  type HostStepId,
  type HostType,
} from "@/lib/host/onboarding";
import type { StaysDoor } from "@/lib/host/doors";
import {
  addBankAccount,
  listBanks,
  resolveBankAccount,
} from "@/lib/payments/bank-accounts-actions";
import { HostDocumentUploader } from "./HostDocumentUploader";
import { AccommodationPhotoManager } from "./AccommodationPhotoManager";
import { FacilitiesPicker } from "./FacilitiesPicker";

/**
 * THE HOST WIZARD, ON `lib/host`.
 *
 * Ten steps at most and one task on each, the steps as data from
 * `lib/host/onboarding.ts` so the count is honest and branch-dependent.
 * The businesses row is created at step two by `saveHostDraft` and every
 * later step writes onto it through its own action; nothing here names a
 * table. What is typed is kept on this device between saves (`nf_host_draft`)
 * so a dropped connection loses nothing, and the server's draft wins on
 * arrival because it is what a reviewer will read.
 *
 * WHAT IS HONEST HERE. The property's photographs are uploaded on the
 * property step itself, through `AccommodationPhotoManager`, and the review
 * step names the gap until one is on record. That step used to say photo
 * upload for properties arrived with the next host release, while the
 * submission gate refused an accommodation with no photograph: nine steps
 * filled in and no way to press send. The map pin is two real
 * coordinates, filled from the device's own location on request. The bank
 * account is resolved with the bank before it is saved and the resolved
 * name is what is shown. Submission is `submitHostApplication`, which
 * refuses with the list of what is missing, printed word for word.
 */

export type PolicyOption = { id: string; name: string; summary: string };

type Notice = { tone: "ok" | "error"; text: string } | null;

const STORAGE_KEY = "nf_host_draft";

const KIND_LABEL: Record<BusinessKind, string> = {
  agency: "Agency",
  hotel: "Hotel",
  serviced_apartments: "Serviced apartments",
  guest_house: "Guest house",
  resort: "Resort",
  shortlet_operator: "Shortlet operator",
  restaurant: "Restaurant",
};

const TYPE_MARK: Record<HostType, BrandIconName> = {
  individual: "keys-home",
  business: "hotel",
  restaurant: "concierge-bell",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ROOM_CATEGORIES = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "twin", label: "Twin" },
  { value: "suite", label: "Suite" },
  { value: "family", label: "Family" },
  { value: "dorm", label: "Dorm" },
] as const;

const MEAL_PLANS = [
  { value: "room_only", label: "Room only" },
  { value: "breakfast", label: "Breakfast included" },
  { value: "half_board", label: "Half board" },
  { value: "full_board", label: "Full board" },
] as const;

/** The text fields of the draft, which is what the device keeps between saves. */
type TextKeys =
  | "name"
  | "description"
  | "phone"
  | "email"
  | "address"
  | "area"
  | "city"
  | "stateCode"
  | "registeredName"
  | "cacNumber"
  | "tin"
  | "representativeName"
  | "representativePhone";

type LocalDraft = Partial<Pick<HostDraft, TextKeys | "hostType" | "kind">>;

function readLocal(): LocalDraft {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as LocalDraft) : {};
  } catch {
    return {};
  }
}

function writeLocal(draft: LocalDraft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* Storage unavailable: the server draft still carries every save. */
  }
}

/** Naira typed in a box to integer kobo, once, at the boundary. */
function toKobo(naira: string): number {
  const value = Number.parseFloat(naira.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

export function HostWizard({
  initial,
  userId,
  policies,
  locale,
  door = null,
}: {
  initial: HostDraft;
  userId: string;
  policies: PolicyOption[];
  locale: Locale;
  /**
   * The stays door this host came through, from `/host/start`.
   *
   * IT ANSWERS THE FIRST STEP, IT DOES NOT REMOVE IT. The host type and the
   * business kind are filled in and the wizard opens on the second step, so
   * somebody who told us "we are a hotel" is not then asked whether they are a
   * registered hospitality business. Back still lands on that step with the
   * door's answer showing, because a hotel that turns out not to be registered
   * has to be able to say so.
   *
   * A DOOR NEVER OVERRIDES A DRAFT IN PROGRESS. Somebody returning to an
   * application they have already started keeps what they answered; the door
   * only fills a blank.
   */
  door?: StaysDoor | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<HostDraft>(() =>
    door && initial.hostType === null && initial.kind === null
      ? { ...initial, hostType: door.hostType, kind: door.kind }
      : initial,
  );
  const [at, setAt] = useState(
    door && initial.hostType === null && initial.kind === null ? 1 : 0,
  );
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* The device's copy of the typed fields, merged UNDER the server's: a
     field the server holds is the truth, a field it does not is what was
     typed before the last save failed. */
  useEffect(() => {
    const local = readLocal();
    setDraft((current) => {
      const merged = { ...current };
      for (const [key, value] of Object.entries(local)) {
        const k = key as keyof LocalDraft;
        if (typeof value === "string" && (merged[k] === "" || merged[k] === null)) {
          (merged as Record<string, unknown>)[k] = value;
        }
      }
      return merged;
    });
  }, []);

  const steps = useMemo(() => stepsFor(draft.hostType), [draft.hostType]);
  const step = steps[Math.min(at, steps.length - 1)]!;
  const submitted = draft.status === "SUBMITTED";

  const set = useCallback(<K extends keyof HostDraft>(key: K, value: HostDraft[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      const keep: LocalDraft = {};
      for (const k of [
        "hostType",
        "kind",
        "name",
        "description",
        "phone",
        "email",
        "address",
        "area",
        "city",
        "stateCode",
        "registeredName",
        "cacNumber",
        "tin",
        "representativeName",
        "representativePhone",
      ] as const) {
        (keep as Record<string, unknown>)[k] = next[k];
      }
      writeLocal(keep);
      return next;
    });
  }, []);

  /** Run a write, print its refusal, refresh on success. */
  const run = useCallback(
    (work: () => Promise<ActionResult<unknown>>, then?: (data: unknown) => void) => {
      setNotice(null);
      setFieldErrors({});
      start(async () => {
        const result = await work();
        if (!result.ok) {
          setNotice({ tone: "error", text: result.error });
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        then?.(result.data);
        router.refresh();
      });
    },
    [router],
  );

  /** Save the text of the draft, creating the row on the first call. */
  const saveText = useCallback(
    (extra: Record<string, unknown> = {}, then?: () => void) =>
      run(
        () =>
          saveHostDraft({
            ...(draft.hostType ? { hostType: draft.hostType } : {}),
            ...(draft.kind ? { kind: draft.kind } : {}),
            name: draft.name,
            description: draft.description,
            phone: draft.phone,
            email: draft.email,
            address: draft.address,
            area: draft.area,
            city: draft.city,
            stateCode: draft.stateCode,
            registeredName: draft.registeredName,
            cacNumber: draft.cacNumber,
            tin: draft.tin,
            representativeName: draft.representativeName,
            representativePhone: draft.representativePhone,
            ...extra,
          }),
        (data) => {
          const saved = data as { businessId: string; status: string };
          setDraft((current) => ({
            ...current,
            businessId: saved.businessId,
            status: saved.status as HostDraft["status"],
          }));
          then?.();
        },
      ),
    [draft, run],
  );

  const forward = () => setAt((i) => Math.min(steps.length - 1, i + 1));
  const back = () => {
    setNotice(null);
    setAt((i) => Math.max(0, i - 1));
  };

  /** What Next does on each step: save what the step holds, then move. */
  const next = () => {
    switch (step.id) {
      case "host-type":
        forward();
        return;
      case "business":
      case "registration":
      case "representative":
        saveText({}, forward);
        return;
      default:
        forward();
    }
  };

  const canAdvance = (() => {
    switch (step.id) {
      case "host-type":
        return draft.hostType !== null && draft.kind !== null;
      case "business":
        return BUSINESS_SECTIONS.every((section) =>
          section.fields.every(
            (field) => field.optional || (draft[field.name as TextKeys] ?? "").trim().length > 0,
          ),
        );
      case "consent":
        return CONSENTS.every((c) => Boolean(draft.consents[c.id]));
      default:
        return true;
    }
  })();

  if (submitted) return <Sent businessName={draft.name} />;

  return (
    <div>
      <p className="nf-host-step__count">{progressLabel(at, steps.length)}</p>
      <SegmentedProgress steps={steps.length} current={at + 1} label={progressLabel(at, steps.length)} />
      <h1 className="nf-host-step__title">{step.title}</h1>
      <p className="nf-host-step__hint">{step.hint}</p>

      <div className="mt-lg flex flex-col gap-md" key={step.id}>
        <StepBody
          step={step.id}
          draft={draft}
          set={set}
          userId={userId}
          policies={policies}
          locale={locale}
          pending={pending}
          fieldErrors={fieldErrors}
          run={run}
          saveText={saveText}
          setNotice={setNotice}
          goTo={(id) => {
            const index = steps.findIndex((s) => s.id === id);
            if (index >= 0) setAt(index);
          }}
        />
      </div>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-md nf-body-sm ${notice.tone === "error" ? "text-[var(--nf-state-error)]" : "text-[var(--nf-state-success)]"}`}
        >
          {notice.text}
        </p>
      )}

      <div className="nf-host-foot">
        {at > 0 && (
          <Button variant="secondary" size="lg" onClick={back} disabled={pending}>
            Back
          </Button>
        )}
        {step.id !== "review" && (
          <Button variant="primary" size="lg" onClick={next} disabled={!canAdvance || pending} loading={pending}>
            Next
          </Button>
        )}
      </div>
      <p className="nf-host-saved">
        <UiIcon name="verified" size={12} />
        {draft.businessId ? "Saved to your application as you go." : "Kept on this device until the business step saves."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- the steps */

type StepProps = {
  step: HostStepId;
  draft: HostDraft;
  set: <K extends keyof HostDraft>(key: K, value: HostDraft[K]) => void;
  userId: string;
  policies: PolicyOption[];
  locale: Locale;
  pending: boolean;
  fieldErrors: Record<string, string>;
  run: (work: () => Promise<ActionResult<unknown>>, then?: (data: unknown) => void) => void;
  saveText: (extra?: Record<string, unknown>, then?: () => void) => void;
  setNotice: (notice: Notice) => void;
  goTo: (id: HostStepId) => void;
};

function StepBody(props: StepProps) {
  switch (props.step) {
    case "host-type":
      return <HostTypeStep {...props} />;
    case "business":
      return <BusinessStep {...props} />;
    case "registration":
      return <RegistrationStep {...props} />;
    case "representative":
      return <RepresentativeStep {...props} />;
    case "property":
      return <PropertyStep {...props} />;
    case "rooms":
      return <RoomsStep {...props} />;
    case "service":
      return <ServiceStep {...props} />;
    case "payout":
      return <PayoutStep {...props} />;
    case "consent":
      return <ConsentStep {...props} />;
    case "review":
      return <ReviewStep {...props} />;
  }
}

function HostTypeStep({ draft, set }: StepProps) {
  const chosen = draft.hostType ? HOST_TYPE_DEFINITIONS[draft.hostType] : null;
  return (
    <>
      <div role="radiogroup" aria-label="What kind of host are you?" className="flex flex-col gap-xs">
        {HOST_TYPES.map((type) => {
          const definition = HOST_TYPE_DEFINITIONS[type];
          const on = draft.hostType === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={on}
              className="nf-host-choice"
              onClick={() => {
                set("hostType", type);
                /* A restaurant is a restaurant; the other branches pick. */
                set("kind", type === "restaurant" ? "restaurant" : definition.kinds.includes(draft.kind as BusinessKind) ? draft.kind : null);
              }}
            >
              <span className="nf-host-choice__mark" aria-hidden="true">
                <BrandIcon name={TYPE_MARK[type]} fill />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{definition.title}</span>
                <span className={`block ${TYPE.rowMeta}`}>{definition.meaning}</span>
              </span>
              <span className="nf-host-choice__ring" aria-hidden="true">
                {on && <UiIcon name="verified" size={14} />}
              </span>
            </button>
          );
        })}
      </div>
      {chosen && chosen.kinds.length > 1 && (
        <div className="nf-host-group">
          <p className="nf-host-group__title">What is it, exactly?</p>
          <div className="mt-sm flex flex-wrap gap-xs" role="group" aria-label="Kind of business">
            {chosen.kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={draft.kind === kind}
                className={`nf-chip${draft.kind === kind ? " nf-chip--active" : ""}`}
                onClick={() => set("kind", kind)}
              >
                {KIND_LABEL[kind]}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function BusinessStep({ draft, set, fieldErrors }: StepProps) {
  return (
    <>
      {BUSINESS_SECTIONS.map((section) => (
        <section key={section.heading} className="nf-host-group">
          <h2 className="nf-host-group__title">{section.heading}</h2>
          <p className="nf-host-group__note">{section.note}</p>
          <div className="mt-md flex flex-col gap-sm">
            {section.fields.map((field) => {
              const key = field.name as TextKeys;
              const value = draft[key] ?? "";
              const error = fieldErrors[field.name];
              if (field.type === "textarea") {
                return (
                  <TextArea
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    error={error}
                    optionalText={field.optional ? "(optional)" : undefined}
                    value={value}
                    onChange={(event) => set(key, event.target.value)}
                  />
                );
              }
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  hint={field.hint}
                  error={error}
                  optionalText={field.optional ? "(optional)" : undefined}
                  type={field.type ?? "text"}
                  value={value}
                  onChange={(event) => set(key, event.target.value)}
                  autoComplete={field.type === "tel" ? "tel" : field.type === "email" ? "email" : undefined}
                />
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function RegistrationStep({ draft, set, userId, fieldErrors }: StepProps) {
  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">As the CAC holds it</h2>
        <div className="mt-md flex flex-col gap-sm">
          <TextField
            label="Registered business name"
            value={draft.registeredName}
            error={fieldErrors.registeredName}
            onChange={(event) => set("registeredName", event.target.value)}
          />
          <TextField
            label="RC or BN number"
            hint="The one on your certificate, like RC 1234567."
            value={draft.cacNumber}
            error={fieldErrors.cacNumber}
            onChange={(event) => set("cacNumber", event.target.value)}
          />
          <TextField
            label="TIN"
            optionalText="(if you have one)"
            value={draft.tin}
            error={fieldErrors.tin}
            onChange={(event) => set("tin", event.target.value)}
          />
        </div>
      </section>
      <HostDocumentUploader
        kind="registration"
        businessId={draft.businessId}
        userId={userId}
        present={Boolean(draft.documents.registration)}
        onFiled={(kind) => set("documents", { ...draft.documents, [kind]: true })}
      />
    </>
  );
}

function RepresentativeStep({ draft, set, userId, fieldErrors }: StepProps) {
  const filed = (kind: HostDocumentKind) => set("documents", { ...draft.documents, [kind]: true });
  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">You</h2>
        <div className="mt-md flex flex-col gap-sm">
          <TextField
            label="Your full name"
            hint="As it appears on the ID you upload."
            value={draft.representativeName}
            error={fieldErrors.representativeName}
            onChange={(event) => set("representativeName", event.target.value)}
            autoComplete="name"
          />
          <TextField
            label="Your phone"
            type="tel"
            value={draft.representativePhone}
            error={fieldErrors.representativePhone}
            onChange={(event) => set("representativePhone", event.target.value)}
            autoComplete="tel"
          />
        </div>
      </section>
      <HostDocumentUploader
        kind="identity"
        businessId={draft.businessId}
        userId={userId}
        present={Boolean(draft.documents.identity)}
        onFiled={filed}
      />
      {draft.hostType === "business" && (
        <HostDocumentUploader
          kind="association"
          businessId={draft.businessId}
          userId={userId}
          present={Boolean(draft.documents.association)}
          onFiled={filed}
        />
      )}
    </>
  );
}

function PropertyStep({ draft, userId, policies, pending, fieldErrors, run, setNotice }: StepProps) {
  const [name, setName] = useState(draft.accommodation?.name ?? "");
  const [description, setDescription] = useState("");
  const [stars, setStars] = useState("");
  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("11:00");
  const [rules, setRules] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [policy, setPolicy] = useState(policies[0]?.id ?? "");

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setNotice({ tone: "error", text: "This device cannot share its location. Type the coordinates instead." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => setNotice({ tone: "error", text: "Location was not shared. Type the coordinates instead." }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const save = () =>
    run(
      () =>
        addAccommodationDraft({
          name,
          ...(description ? { description } : {}),
          starRating: stars ? Number(stars) : null,
          checkInFrom: checkIn,
          checkOutBy: checkOut,
          ...(rules ? { houseRules: rules } : {}),
          ...(lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : {}),
          ...(policy ? { cancellationPolicyId: policy } : {}),
        }),
      () => setNotice({ tone: "ok", text: "The property is saved." }),
    );

  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">The property</h2>
        {draft.accommodation && (
          <p className="nf-host-group__note">
            On record: {draft.accommodation.name}, {draft.accommodation.photos.length} photo
            {draft.accommodation.photos.length === 1 ? "" : "s"}, pin {draft.accommodation.hasPin ? "set" : "not set"}.
          </p>
        )}
        <div className="mt-md flex flex-col gap-sm">
          <TextField label="Property name" value={name} error={fieldErrors.name} onChange={(e) => setName(e.target.value)} />
          <TextArea label="Description" optionalText="(optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <SelectField label="Star rating" optionalText="(if claimed)" value={stars} onChange={(e) => setStars(e.target.value)}>
            <option value="">No star rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-sm">
            <TextField label="Check in from" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <TextField label="Check out by" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <TextArea label="House rules" optionalText="(optional)" value={rules} onChange={(e) => setRules(e.target.value)} />
          {policies.length > 0 && (
            <SelectField label="Cancellation policy" value={policy} onChange={(e) => setPolicy(e.target.value)}>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      </section>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">The pin on the map</h2>
        <p className="nf-host-group__note">Required before publish. Stand at the property and use your location, or type it.</p>
        <div className="mt-md grid grid-cols-2 gap-sm">
          <TextField label="Latitude" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
          <TextField label="Longitude" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <Button variant="secondary" className="mt-sm" leadingIcon="location" onClick={locate}>
          Use my location
        </Button>
      </section>
      {/*
        THE STEP THAT COULD NOT BE FINISHED, FINISHED.

        This section read "Photo upload for properties arrives with the next
        host release" while `missingFrom` refused to submit an accommodation
        with no photograph, so a hotel or a shortlet host filled in nine steps
        and could never press send. The manager below writes to
        `accommodation_photos`, which has had its table, its bucket, its RLS
        and its catalogue trigger since M3 and no writer until now.

        Photographs hang on the property row, so the upload appears only once
        the property has been saved: a drop target that could not name what it
        was attaching to would fail on the server after the file had already
        gone up.
      */}
      {draft.accommodation ? (
        <>
          {/* FACILITIES, the other half of GOVERNING-10 screen four, and the
              fourth table on this spine that had no writer at all:
              `accommodation_amenities` is read by the stay page, folded into
              the catalogue and filtered on by the stays shelf, and every one
              of those filters returned nothing for every hotel. */}
          <FacilitiesPicker
            accommodationId={draft.accommodation.id}
            chosen={draft.accommodation.facilities}
          />
          <AccommodationPhotoManager
            accommodationId={draft.accommodation.id}
            userId={userId}
            photos={draft.accommodation.photos}
          />
        </>
      ) : (
        <section className="nf-host-group">
          <h2 className="nf-host-group__title">Photographs of the property</h2>
          <p className="nf-host-group__note">
            Save the property first and the photographs hang on it. At least one is needed before
            you can send the application.
          </p>
        </section>
      )}
      <Button variant="primary" size="lg" full onClick={save} disabled={pending || name.trim().length < 2} loading={pending}>
        Save the property
      </Button>
    </>
  );
}

function RoomsStep({ draft, policies, pending, fieldErrors, run, setNotice, locale }: StepProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof ROOM_CATEGORIES)[number]["value"]>("double");
  const [sleeps, setSleeps] = useState("2");
  const [units, setUnits] = useState("1");
  const [rate, setRate] = useState("");
  const [plan, setPlan] = useState("Standard");
  const [meal, setMeal] = useState<(typeof MEAL_PLANS)[number]["value"]>("room_only");
  const [policy, setPolicy] = useState(policies[0]?.id ?? "");
  const rateKobo = toKobo(rate);

  if (!draft.accommodation) {
    return (
      <p className={TYPE.body}>Save the property first; rooms hang off it.</p>
    );
  }
  const accommodationId = draft.accommodation.id;

  const save = () =>
    run(
      async () => {
        const room = await addRoomTypeDraft({
          accommodationId,
          name,
          category,
          sleeps: Number(sleeps),
          unitsTotal: Number(units),
          baseRateMinor: rateKobo,
        });
        if (!room.ok) return room;
        return addRatePlanDraft({
          roomTypeId: room.data.roomTypeId,
          name: plan,
          mealPlan: meal,
          cancellationPolicyId: policy,
          rateMinor: rateKobo,
        });
      },
      () => {
        setNotice({ tone: "ok", text: `${name} is saved with its ${plan} rate.` });
        setName("");
        setRate("");
      },
    );

  return (
    <>
      {/*
        YOUR ROOM TYPES, as `GOVERNING-10` screen two lists them. This section
        printed two numbers and nothing else, so a host who had saved a Deluxe
        Double and moved on had no way to tell, from this screen, whether the
        one on record was the one they meant. The render lists them, and the
        commonest onboarding mistake it prevents is adding the same room twice.
      */}
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">Your room types</h2>
        <p className="nf-host-group__note">
          {draft.roomTypes.length === 0
            ? "None yet. At least one room type with a rate is needed before the property can go on the shelf."
            : "What guests can book. At least one needs a rate before the property can go on the shelf."}
        </p>
        {draft.roomTypes.length > 0 && (
          <ul className="mt-md flex flex-col gap-row">
            {draft.roomTypes.map((room) => (
              <li key={room.id} className="nf-host-choice">
                <span className="nf-host-choice__mark" aria-hidden="true">
                  <BrandIcon name="hotel" fill />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>{room.name}</span>
                  <span className={`block ${TYPE.rowMeta}`}>
                    {room.unitsTotal} room{room.unitsTotal === 1 ? "" : "s"} · sleeps {room.sleeps}
                    {room.rateCount === 0
                      ? " · no rate yet"
                      : ` · ${room.rateCount} rate${room.rateCount === 1 ? "" : "s"}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">A room type</h2>
        <div className="mt-md flex flex-col gap-sm">
          <TextField label="Name" hint="For example Deluxe Double." value={name} error={fieldErrors.name} onChange={(e) => setName(e.target.value)} />
          <SelectField label="Kind" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            {ROOM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-sm">
            <TextField label="Sleeps" type="number" min={1} max={20} value={sleeps} onChange={(e) => setSleeps(e.target.value)} />
            <TextField label="How many of this room" type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} />
          </div>
          <TextField
            label="Nightly rate (naira)"
            inputMode="decimal"
            value={rate}
            error={fieldErrors.baseRateMinor ?? fieldErrors.rateMinor}
            hint={rateKobo > 0 ? `Stored as ${formatMoney(rateKobo, locale)} a night.` : undefined}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </section>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">Its first rate</h2>
        <div className="mt-md flex flex-col gap-sm">
          <TextField label="Rate name" value={plan} onChange={(e) => setPlan(e.target.value)} />
          <SelectField label="Meals" value={meal} onChange={(e) => setMeal(e.target.value as typeof meal)}>
            {MEAL_PLANS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Cancellation policy" error={fieldErrors.cancellationPolicyId} value={policy} onChange={(e) => setPolicy(e.target.value)}>
            {policies.length === 0 && <option value="">No policies to choose from yet</option>}
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        </div>
      </section>
      <Button
        variant="primary"
        size="lg"
        full
        onClick={save}
        disabled={pending || name.trim().length < 2 || rateKobo <= 0 || !policy}
        loading={pending}
      >
        Save this room and rate
      </Button>
    </>
  );
}

function ServiceStep({ draft, pending, fieldErrors, run, setNotice, saveText }: StepProps) {
  const [cuisines, setCuisines] = useState("");
  const [band, setBand] = useState(String(draft.restaurant?.priceBand ?? ""));
  const [parking, setParking] = useState(false);
  const [power, setPower] = useState(false);
  const [outdoor, setOutdoor] = useState(false);
  const [weekday, setWeekday] = useState("5");
  const [opens, setOpens] = useState("12:00");
  const [last, setLast] = useState("21:30");
  const [closes, setCloses] = useState("22:00");
  const [covers, setCovers] = useState("40");

  const saveProfile = () =>
    run(
      () =>
        setRestaurantProfileDraft({
          cuisines: cuisines.split(",").map((c) => c.trim()).filter(Boolean),
          priceBand: band ? Number(band) : null,
          parking,
          powerBackup: power,
          outdoor,
        }),
      () => setNotice({ tone: "ok", text: "The restaurant's facts are saved." }),
    );

  const saveWindow = () =>
    run(
      () =>
        addServiceWindowDraft({
          weekday: Number(weekday),
          opens,
          lastSeating: last,
          closes,
          covers: Number(covers),
        }),
      () => setNotice({ tone: "ok", text: `${WEEKDAYS[Number(weekday)]} ${opens} to ${closes} is saved.` }),
    );

  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">The venue</h2>
        <p className="nf-host-group__note">
          On record: {draft.restaurant?.cuisineCount ?? 0} cuisine{(draft.restaurant?.cuisineCount ?? 0) === 1 ? "" : "s"},
          {" "}price band {draft.restaurant?.priceBand ?? "not set"}, {draft.serviceWindowCount} service window
          {draft.serviceWindowCount === 1 ? "" : "s"}.
        </p>
        <div className="mt-md flex flex-col gap-sm">
          <TextField label="Cuisines" hint="Separate with commas: Nigerian, Grill, Seafood." value={cuisines} onChange={(e) => setCuisines(e.target.value)} />
          <SelectField label="Price band" error={fieldErrors.priceBand} value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="">Choose a band</option>
            <option value="1">1, the cheapest</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4, the dearest</option>
          </SelectField>
          <div className="flex flex-wrap gap-xs" role="group" aria-label="What the venue has">
            {[
              ["Parking", parking, setParking],
              ["Power backup", power, setPower],
              ["Outdoor seating", outdoor, setOutdoor],
            ].map(([label, on, toggle]) => (
              <button
                key={label as string}
                type="button"
                aria-pressed={on as boolean}
                className={`nf-chip${on ? " nf-chip--active" : ""}`}
                onClick={() => (toggle as (v: boolean) => void)(!(on as boolean))}
              >
                {label as string}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={saveProfile} disabled={pending} loading={pending}>
            Save the venue
          </Button>
        </div>
      </section>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">A service window</h2>
        <div className="mt-md flex flex-col gap-sm">
          <SelectField label="Day" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            {WEEKDAYS.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-3 gap-sm">
            <TextField label="Opens" type="time" value={opens} onChange={(e) => setOpens(e.target.value)} />
            <TextField label="Last seating" type="time" error={fieldErrors.lastSeating} value={last} onChange={(e) => setLast(e.target.value)} />
            <TextField label="Closes" type="time" error={fieldErrors.closes} value={closes} onChange={(e) => setCloses(e.target.value)} />
          </div>
          <TextField label="Covers" type="number" min={1} error={fieldErrors.covers} value={covers} onChange={(e) => setCovers(e.target.value)} />
          <Button variant="secondary" onClick={saveWindow} disabled={pending} loading={pending}>
            Save this window
          </Button>
        </div>
      </section>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">Health permit</h2>
        <label className="mt-sm flex items-start gap-sm">
          <input
            type="checkbox"
            className="mt-3xs h-5 w-5"
            checked={Boolean(draft.hygieneAttestedAt)}
            disabled={pending}
            onChange={(e) => saveText({ hygieneAttested: e.target.checked })}
          />
          <span className={TYPE.body}>
            This venue holds a current Local Government health permit and its food handlers hold current medical certificates.
          </span>
        </label>
        {draft.hygieneAttestedAt && <p className="mt-2xs nf-caption">Attested and dated on your application.</p>}
      </section>
    </>
  );
}

function PayoutStep({ draft, pending, run, setNotice, set }: StepProps) {
  const [banks, setBanks] = useState<{ code: string; name: string }[] | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let live = true;
    void listBanks().then((result) => {
      if (!live) return;
      if (result.ok) setBanks(result.data.map((b) => ({ code: b.code, name: b.name })));
      else setBanksError(result.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const resolve = async () => {
    setResolving(true);
    setResolved(null);
    const result = await resolveBankAccount({ bankCode: bank, accountNumber: number });
    setResolving(false);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error });
      return;
    }
    setResolved(result.data.accountName);
  };

  const save = () =>
    run(
      () => addBankAccount({ bankCode: bank, accountNumber: number }),
      () => {
        set("hasBankAccount", true);
        setNotice({ tone: "ok", text: "The account is saved, in the name the bank gave." });
      },
    );

  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">Where payouts go</h2>
        <p className="nf-host-group__note">
          {draft.hasBankAccount
            ? "An account is on record. Add another only if payouts should go somewhere else."
            : "We confirm the account with the bank before it is saved, and show you the name it holds."}
        </p>
        <div className="mt-md flex flex-col gap-sm">
          {banksError ? (
            <p role="status" className="nf-body-sm text-[var(--nf-content-secondary)]">
              {banksError}
            </p>
          ) : (
            <SelectField label="Bank" value={bank} disabled={banks === null} onChange={(e) => { setBank(e.target.value); setResolved(null); }}>
              <option value="">{banks === null ? "Loading banks" : "Choose a bank"}</option>
              {(banks ?? []).map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          )}
          <TextField
            label="Account number"
            inputMode="numeric"
            maxLength={10}
            value={number}
            onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "")); setResolved(null); }}
          />
          {resolved ? (
            <div className="nf-host-drop nf-host-drop--done">
              <UiIcon name="verified" size={20} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block nf-body-sm font-semibold">{resolved}</span>
                <span className="block nf-caption">Is this you, or your business?</span>
              </span>
            </div>
          ) : (
            <Button variant="secondary" onClick={resolve} disabled={!bank || number.length !== 10 || resolving} loading={resolving}>
              Check with the bank
            </Button>
          )}
          {resolved && (
            <Button variant="primary" size="lg" full onClick={save} disabled={pending} loading={pending}>
              Yes, save this account
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

function ConsentStep({ draft, pending, saveText, set }: StepProps) {
  const toggle = (id: ConsentId, on: boolean) => {
    const consents = { ...draft.consents };
    if (on) consents[id] = new Date().toISOString();
    else delete consents[id];
    set("consents", consents);
    if (on) saveText({ consents: [id] });
  };
  return (
    <div className="flex flex-col gap-xs" role="group" aria-label="Permissions">
      {CONSENTS.map((consent) => {
        const on = Boolean(draft.consents[consent.id]);
        return (
          <label key={consent.id} className="nf-host-choice" aria-checked={on} role="checkbox">
            <input
              type="checkbox"
              className="sr-only"
              checked={on}
              disabled={pending}
              onChange={(e) => toggle(consent.id, e.target.checked)}
            />
            <span className="min-w-0 flex-1">
              <span className={`block ${TYPE.rowTitle}`}>{consent.label}</span>
              <span className={`block ${TYPE.rowMeta}`}>{consent.detail}</span>
              {consent.id === "terms" && (
                <span className="mt-2xs flex gap-sm nf-caption">
                  <Link href="/terms" target="_blank" className="text-[var(--nf-content-link)] underline">Host terms</Link>
                  <Link href="/privacy" target="_blank" className="text-[var(--nf-content-link)] underline">Privacy policy</Link>
                </span>
              )}
            </span>
            <span className="nf-host-choice__ring" aria-hidden="true">
              {on && <UiIcon name="verified" size={14} />}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ReviewStep({ draft, pending, run, goTo, set }: StepProps) {
  const missing = missingFrom(draft);
  const send = () =>
    run(
      () => submitHostApplication(),
      () => set("status", "SUBMITTED"),
    );
  const accommodation = hostsAccommodation(draft.hostType ?? "individual");
  return (
    <>
      <section className="nf-host-group">
        <h2 className="nf-host-group__title">{draft.name || "Your business"}</h2>
        <p className="nf-host-group__note">
          {draft.hostType ? HOST_TYPE_DEFINITIONS[draft.hostType].title : "Host type not chosen"}
          {draft.kind ? `, ${KIND_LABEL[draft.kind]}` : ""}
        </p>
        <dl className="mt-sm">
          <Fact label="Contact" value={[draft.phone, draft.email].filter(Boolean).join(", ")} onEdit={() => goTo("business")} />
          <Fact label="Address" value={[draft.address, draft.area, draft.city, draft.stateCode].filter(Boolean).join(", ")} onEdit={() => goTo("business")} />
          {draft.hostType === "business" && (
            <Fact label="Registration" value={[draft.registeredName, draft.cacNumber].filter(Boolean).join(", ")} onEdit={() => goTo("registration")} />
          )}
          <Fact label="Representative" value={[draft.representativeName, draft.representativePhone].filter(Boolean).join(", ")} onEdit={() => goTo("representative")} />
          {accommodation ? (
            <Fact
              label="Property"
              value={draft.accommodation ? `${draft.accommodation.name}, ${draft.roomTypeCount} room type${draft.roomTypeCount === 1 ? "" : "s"}, ${draft.ratePlanCount} rate${draft.ratePlanCount === 1 ? "" : "s"}` : ""}
              onEdit={() => goTo("property")}
            />
          ) : (
            <Fact label="Service" value={draft.serviceWindowCount > 0 ? `${draft.serviceWindowCount} window${draft.serviceWindowCount === 1 ? "" : "s"}` : ""} onEdit={() => goTo("service")} />
          )}
          <Fact label="Payouts" value={draft.hasBankAccount ? "Bank account on record" : ""} onEdit={() => goTo("payout")} />
        </dl>
      </section>

      <section className="nf-host-group" aria-live="polite">
        <h2 className="nf-host-group__title">
          {missing.length === 0 ? "Everything is here" : `Still missing (${missing.length})`}
        </h2>
        {missing.length > 0 ? (
          <ul className="mt-xs">
            {missing.map((item) => (
              <li key={item} className="nf-host-missing">
                <UiIcon name="close" size={16} className="mt-3xs shrink-0 text-[var(--nf-state-error)]" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="nf-host-group__note">A person on our team reads it next. We write to you when it has been read.</p>
        )}
      </section>

      <Button variant="primary" size="lg" full onClick={send} disabled={pending || missing.length > 0} loading={pending}>
        Send for review
      </Button>
    </>
  );
}

function Fact({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="nf-host-missing">
      <dt className="w-28 shrink-0 nf-caption font-semibold">{label}</dt>
      <dd className="min-w-0 flex-1">{value || <span className="text-[var(--nf-content-muted)]">Not given</span>}</dd>
      <button type="button" onClick={onEdit} className="nf-caption font-semibold text-[var(--nf-content-link)]">
        Edit
      </button>
    </div>
  );
}

function Sent({ businessName }: { businessName: string }) {
  return (
    <div className="flex flex-col items-center px-lg py-section text-center">
      <span className="block h-20 w-20" aria-hidden="true">
        <BrandIcon name="seal-pending" fill />
      </span>
      <p className={`mt-block ${TYPE.sectionTitle}`}>{businessName || "Your application"} is with our team</p>
      <p className={`mt-inline max-w-[42ch] ${TYPE.body}`}>
        A person reads it next. You will hear from us when it has been read, and you can see where it stands on your host page.
      </p>
      <Link href="/host" className="nf-btn nf-btn--primary nf-btn--lg mt-block">
        Your host page
      </Link>
    </div>
  );
}

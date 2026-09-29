"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBack } from "@/lib/nav/use-back";
import { countOf, getDictionary, type Locale } from "@vallo/i18n";
import { useClientLocale } from "@/lib/i18n/use-client-locale";
import { useMoneyStepUp } from "@/components/app/money/MoneyStepUp";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { successCopy } from "@/lib/ui/success-moments";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { TYPE } from "@/components/app/Screen";
import type { ActionResult } from "@/lib/actions/envelope";
import { saveHostDraft, submitHostApplication } from "@/lib/host/actions";
import {
  BUSINESS_SECTIONS,
  CONSENTS,
  HOST_TYPE_DEFINITIONS,
  HOST_TYPES,
  branchFor,
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
import { FacilitiesStep } from "./stays/FacilitiesStep";
import { HotelStep } from "./stays/HotelStep";
import { HouseRulesStep } from "./stays/HouseRulesStep";
import { PlaceStep } from "./stays/PlaceStep";
import { RatesStep } from "./stays/RatesStep";
import { RestaurantStep } from "./stays/RestaurantStep";
import { RoomTypesStep } from "./stays/RoomTypesStep";
import { StaysHead } from "./stays/StaysParts";
import { TablesStep } from "./stays/TablesStep";
import { IconPlate } from "@/components/ui/IconPlate";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

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

/**
 * A cancellation policy a rate or a property may name.
 *
 * `isFreeUntilHours` rides along because `GOVERNING-10` screen three draws a
 * switch called "Free cancellation" and a row that says how long it lasts, and
 * `cancellation_policies.is_free_until_hours` is the only thing in this
 * database that knows either. Null means a policy is never free.
 */
export type PolicyOption = {
  id: string;
  name: string;
  summary: string;
  isFreeUntilHours: number | null;
};

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

/*
 * THE WEEKDAYS, THE ROOM CATEGORIES AND THE MEAL PLANS HAVE MOVED OUT OF THIS
 * FILE. They were three lists typed into a component beside three forms that
 * `GOVERNING-10` and `GOVERNING-11` replace; the lists themselves are now in
 * `lib/host/stays-setup.ts`, pure and tested, beside the note saying which
 * database enum each one has to agree with.
 */

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

export function HostWizard({
  initial,
  userId,
  policies,
  locale,
  door = null,
  initialStep = null,
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
  /**
   * THE FIXTURE HARNESS'S WAY IN TO A LATER STEP, and nothing else passes it.
   *
   * Moving forward is a write (`saveHostDraft` creates the business at step
   * two), so a proof of the later steps cannot click its way there. With a
   * step named here the wizard opens on it, over whatever draft it was given;
   * an id the draft's branch does not have is ignored. The routes never pass
   * it (the second audit, S9).
   */
  initialStep?: HostStepId | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<HostDraft>(() =>
    door && initial.hostType === null && initial.kind === null
      ? { ...initial, hostType: door.hostType, kind: door.kind }
      : initial,
  );
  const [at, setAt] = useState(() => {
    const opened = initialStep
      ? stepsFor(initial.hostType, initial.kind).findIndex((candidate) => candidate.id === initialStep)
      : -1;
    if (opened >= 0) return opened;
    return door && initial.hostType === null && initial.kind === null ? 1 : 0;
  });
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /*
   * THE HOTEL'S STATED TOTAL, WHICH HAS NO COLUMN ANYWHERE IN THIS DATABASE.
   *
   * `GOVERNING-10` screen one asks a hotelier how many rooms they have, and
   * `accommodations` has nowhere to put the answer: the only room count this
   * platform holds is the sum of `room_types.units_total`, which does not
   * exist until screen two. So the number is held here, for the length of the
   * flow, and SPENT on screen two as the first room type's unit count. Both
   * screens say so on the screen itself rather than leaving somebody to find
   * out. It is deliberately not written to the device's draft either: a number
   * that survives a reload but never reaches the server is the worst of the
   * three states, because it looks saved.
   */
  const [expectedRooms, setExpectedRooms] = useState(1);

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

  /*
   * THE STEP LIST NOW DEPENDS ON THE KIND AS WELL AS THE HOST TYPE, because a
   * shortlet operator and a hotelier are both accommodation hosts and
   * `GOVERNING-10` and `GOVERNING-11` ask them entirely different questions.
   */
  const steps = useMemo(() => stepsFor(draft.hostType, draft.kind), [draft.hostType, draft.kind]);
  const step = steps[Math.min(at, steps.length - 1)]!;
  const submitted = draft.status === "SUBMITTED";
  /*
   * The success sheet opens on the TRANSITION to submitted, which only
   * `submitHostApplication`'s ok makes (ReviewStep sets the status in its
   * `then`). A host who opens the wizard already submitted gets no sheet.
   */
  const [celebrate, setCelebrate] = useState(false);
  const [wasSubmitted, setWasSubmitted] = useState(submitted);
  if (wasSubmitted !== submitted) {
    setWasSubmitted(submitted);
    if (submitted) setCelebrate(true);
  }
  /* This wizard already carries the dictionary for its locale. */
  const successWords = getDictionary(useClientLocale()).success;

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
  /*
   * ONE BACK CONTROL, AND IT WALKS OUT OF THE FLOW AT THE TOP OF IT.
   *
   * The drawn head carries the only way back on these screens, so on the first
   * step it cannot simply be absent: a person who opened the wizard by mistake
   * would have nothing to press. It leaves for the host's own landing, which
   * is the declared parent of this route, rather than calling history back.
   */
  const leave = useBack("/host");
  const back = () => {
    setNotice(null);
    if (at === 0) {
      /* Leave the way the person came in (the Create sheet, the host
         landing), not by stacking a second `/host` on top. */
      leave();
      return;
    }
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

  /*
   * THE HEAD IS THE RENDER'S, FOR EVERY STEP AND NOT ONLY THE DRAWN ONES.
   *
   * `GOVERNING-09` through `GOVERNING-11` draw one head on every stays screen:
   * the way back at the left, the progress segments on the SAME LINE beside
   * it, then the question in display type and one sentence under it. What was
   * here was a "Step 4 of 9" caption over a full width bar, with Back at the
   * very bottom of the page under the fold. Two heads in one flow would be
   * worse than either, so the drawn one is used throughout.
   *
   * THE SEGMENT COUNT IS `steps.length` AND NEVER THE RENDER'S FOUR. Each
   * image shows a four-screen set-up; the real application also asks for an
   * identity document, a payout account and three consents. Drawing four
   * segments would promise a shorter flow than the person is going to get.
   */
  const drawn = DRAWN_STAYS_STEPS.has(step.id);
  const applied = successCopy(successWords, "hostApplied");

  return (
    <div>
      <SuccessSheet
        open={celebrate}
        onOpenChange={setCelebrate}
        variant={applied.variant}
        title={applied.title}
        body={applied.body}
        primary={{ label: successWords.continue }}
      />
      <StaysHead
        /*
         * `GOVERNING-11` screen three is the one drawn screen whose heading is
         * beside the glass object rather than over the fields, so the panel
         * draws its own and the head draws only the way back and the segments.
         */
        title={step.id === "restaurant" ? undefined : step.title}
        hint={step.id === "restaurant" ? undefined : step.hint}
        steps={steps.length}
        current={at + 1}
        label={progressLabel(at, steps.length)}
        onBack={back}
      />

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
          expectedRooms={expectedRooms}
          onExpectedRooms={setExpectedRooms}
          advance={forward}
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

      {/*
        THE FOOT IS ONLY FOR THE STEPS THAT ARE NOT DRAWN. Every drawn panel
        ends in its own Continue, inside the screen, because that is where the
        render puts it and because a save and an advance are one act to the
        person pressing it. Drawing a second forward control under one of them
        would be two buttons for one intention.
      */}
      {!drawn && (
        <div className="nf-host-foot">
          {step.id !== "review" && (
            <Button
              variant="primary"
              size="lg"
              full
              trailingIcon="chevron-right"
              onClick={next}
              disabled={!canAdvance || pending}
              loading={pending}
            >
              Continue
            </Button>
          )}
        </div>
      )}
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
  /** Move on. Every drawn panel owns its own Continue and calls this. */
  advance: () => void;
  /** The hotel's stated total, held by the wizard. See its declaration. */
  expectedRooms: number;
  onExpectedRooms(next: number): void;
};

/**
 * THE EIGHT STEPS `GOVERNING-10` AND `GOVERNING-11` DRAW.
 *
 * A set rather than a list of cases, because two things have to agree about
 * it: `StepBody` renders the drawn panel, and the wizard's foot must NOT then
 * draw a second forward control under a panel that already has one.
 */
const DRAWN_STAYS_STEPS = new Set<HostStepId>([
  "hotel",
  "room-types",
  "rates",
  "place",
  "house-rules",
  "facilities",
  "restaurant",
  "tables",
]);

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
    case "hotel":
      return <HotelStep {...props} />;
    case "room-types":
      return <RoomTypesStep {...props} />;
    case "rates":
      return <RatesStep {...props} />;
    case "place":
      return <PlaceStep {...props} />;
    case "house-rules":
      return <HouseRulesStep {...props} />;
    case "facilities":
      return <FacilitiesStep {...props} />;
    case "restaurant":
      return (
        <>
          <RestaurantStep {...props} />
          <HygieneAttestation {...props} />
        </>
      );
    case "tables":
      return <TablesStep {...props} />;
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
              className="nf-panel nf-panel--card nf-host-choice"
              onClick={() => {
                set("hostType", type);
                /* A restaurant is a restaurant; the other branches pick. */
                set("kind", type === "restaurant" ? "restaurant" : definition.kinds.includes(draft.kind as BusinessKind) ? draft.kind : null);
              }}
            >
              <IconPlate size="sm" className="nf-host-choice__mark">
                <UiIcon name={lineGlyphFor(TYPE_MARK[type])} size={20} />
              </IconPlate>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{definition.title}</span>
                <span className={`block ${TYPE.rowMeta}`}>{definition.meaning}</span>
              </span>
              <span className="nf-host-choice__ring" aria-hidden="true">
                {on && <UiIcon name="verified" size={16} />}
              </span>
            </button>
          );
        })}
      </div>
      {chosen && chosen.kinds.length > 1 && (
        <div className="nf-panel nf-panel--card block nf-host-group">
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
        <section key={section.heading} className="nf-panel nf-panel--card block nf-host-group">
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
      <section className="nf-panel nf-panel--card block nf-host-group">
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
      <section className="nf-panel nf-panel--card block nf-host-group">
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

/**
 * THE HEALTH PERMIT ATTESTATION.
 *
 * It lived at the foot of the old "Service and seating" step, which
 * `GOVERNING-11` replaces with two screens that do not draw it. It could not
 * simply go: `missingFrom` refuses to submit a restaurant without it, so
 * deleting the control would have left every restaurant application
 * unsubmittable, which is the exact shape of the defect this build has spent
 * the week removing. It sits under "Your restaurant", which is the screen
 * about the venue rather than the screen about its week.
 */
function HygieneAttestation({ draft, pending, saveText }: StepProps) {
  return (
    <section className="nf-stays-plate">
      <span className="nf-stays-plate__label">Health permit</span>
      <label className="mt-sm flex items-start gap-sm">
        <input
          type="checkbox"
          className="mt-3xs h-5 w-5"
          checked={Boolean(draft.hygieneAttestedAt)}
          disabled={pending}
          onChange={(e) => saveText({ hygieneAttested: e.target.checked })}
        />
        <span className={TYPE.body}>
          This venue holds a current Local Government health permit and its food handlers hold
          current medical certificates.
        </span>
      </label>
      {draft.hygieneAttestedAt && (
        <p className="nf-stays-plate__note">Attested and dated on your application.</p>
      )}
    </section>
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

  /* V-81: a new account to be paid into asks for the phone lock, when there is one. */
  const viewerLocale = useClientLocale();
  const lock = useMoneyStepUp(viewerLocale);
  const save = () =>
    run(
      async () => {
        const result = await lock.guard({ kind: "bank_add", target: `${bank}:${number.replace(/\D/g, "")}` }, (stepUp) =>
          addBankAccount({ bankCode: bank, accountNumber: number, stepUp }),
        );
        return result ?? { ok: false as const, error: getDictionary(viewerLocale).platform.moneyLock.notConfirmed };
      },
      () => {
        set("hasBankAccount", true);
        setNotice({ tone: "ok", text: "The account is saved, in the name the bank gave." });
      },
    );

  return (
    <>
      {lock.sheet}
      <section className="nf-panel nf-panel--card block nf-host-group">
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
            <div className="nf-panel nf-panel--card nf-host-drop nf-host-drop--done">
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
          <label key={consent.id} className="nf-panel nf-panel--card nf-host-choice" aria-checked={on} role="checkbox">
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
              {on && <UiIcon name="verified" size={16} />}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function ReviewStep({ draft, pending, run, goTo, set, locale }: StepProps) {
  const missing = missingFrom(draft);
  const send = () =>
    run(
      () => submitHostApplication(),
      () => set("status", "SUBMITTED"),
    );
  const accommodation = hostsAccommodation(draft.hostType ?? "individual");
  return (
    <>
      <section className="nf-panel nf-panel--card block nf-host-group">
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
              value={draft.accommodation ? `${draft.accommodation.name}, ${countOf(draft.roomTypeCount, "roomTypes", locale)}, ${countOf(draft.ratePlanCount, "ratePlans", locale)}` : ""}
              /* The property's first drawn screen, whichever branch this
                 host is on: a hotelier lands on "Your hotel" and a shortlet
                 operator on "Your place". */
              onEdit={() => goTo(branchFor(draft.kind) === "shortlet" ? "place" : "hotel")}
            />
          ) : (
            <Fact label="Service" value={draft.serviceWindowCount > 0 ? countOf(draft.serviceWindowCount, "windows", locale) : ""} onEdit={() => goTo("tables")} />
          )}
          <Fact label="Payouts" value={draft.hasBankAccount ? "Bank account on record" : ""} onEdit={() => goTo("payout")} />
        </dl>
      </section>

      <section className="nf-panel nf-panel--card block nf-host-group" aria-live="polite">
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
      <IconPlate size="lg" tone="brand">
        <UiIcon name="hourglass" size={24} />
      </IconPlate>
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

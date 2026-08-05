"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  saveInterestsAction,
  skipInterests,
  type InterestsSaved,
} from "@/lib/interests/actions";
import { INTEREST_COPY, PROPERTY_TYPES, type PropertyType } from "@/lib/interests/schema";

/**
 * The one question worth asking at the door.
 *
 * ONE SCREEN, NOT A WIZARD, AND THAT IS THE DESIGN.
 *
 * There is exactly one thing the product can act on the moment somebody
 * arrives: which markets to put in front of them. A budget cannot be honoured
 * without a city, a city already has a screen that owns it, and a travel date
 * is a booking, not a preference. Every extra step would have collected an
 * answer nothing reads, which is the polite version of wasting somebody's time.
 * So there is no `SegmentedProgress` here: a progress bar over a single step is
 * a promise of four more.
 *
 * There is also no location picker. `/settings/place` owns where somebody is,
 * together with the local government it has to agree with, and the note in
 * `lib/profile/actions.ts` records what the last duplicate of that question
 * cost: a second, simpler picker that wrote the state's NAME into a column
 * holding its CODE, so every save was refused by the database and reported as a
 * generic failure.
 *
 * The cards are toggles, not radios: somebody looking for a shortlet this month
 * and a rental next year is one person with two answers. Selection is a ring
 * plus a fill tint off the brand token - the same treatment `Chip` settled on,
 * for the same reason, which is that a hairline glow is not a state change on a
 * phone in daylight.
 *
 * Nothing is saved until Continue. Skip saves nothing at all and never asks
 * again, which is what makes it a real skip rather than a "later".
 */
export function InterestChoices({ initial }: { initial: PropertyType[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<PropertyType[]>(initial);
  const [skipping, startSkip] = useTransition();
  const [skipError, setSkipError] = useState("");
  const [state, formAction, saving] = useActionState<
    ActionResult<InterestsSaved> | null,
    FormData
  >(saveInterestsAction, null);

  useEffect(() => {
    if (!state?.ok) return;
    /*
     * Home is rendered per request and reads this row, so a replace rather than
     * a push: the welcome screen is answered once and must not sit in the back
     * stack waiting to be walked into again.
     */
    router.replace("/home");
    router.refresh();
  }, [state, router]);

  const toggle = (value: PropertyType) => {
    setChosen((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  };

  const onSkip = () => {
    setSkipError("");
    startSkip(async () => {
      const result = await skipInterests();
      if (!result.ok) {
        setSkipError(result.error);
        return;
      }
      router.replace("/home");
      router.refresh();
    });
  };

  const busy = saving || skipping;

  return (
    <form action={formAction} data-testid="welcome-form">
      {/*
        The choices ride as hidden inputs rather than as the cards' own
        checkboxes, so the control can be a real button with `aria-pressed` and
        a 44px target while the form still posts one repeated key. The server
        reads them with `getAll`.
      */}
      {chosen.map((value) => (
        <input key={value} type="hidden" name="interests" value={value} />
      ))}

      <div
        role="group"
        aria-label="What are you here for?"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {PROPERTY_TYPES.map((value) => {
          const selected = chosen.includes(value);
          const copy = INTEREST_COPY[value];
          return (
            <button
              key={value}
              type="button"
              data-testid={`interest-${value}`}
              aria-pressed={selected}
              disabled={busy}
              onClick={() => toggle(value)}
              className="nf-card nf-tap relative flex min-h-[5.5rem] flex-col items-start justify-center gap-1 p-4 text-left transition-transform active:scale-[0.97] disabled:opacity-60"
              style={
                selected
                  ? {
                      background:
                        "color-mix(in oklab, var(--nf-brand-primary) 20%, transparent)",
                      borderColor: "transparent",
                      boxShadow:
                        "0 0 0 2px var(--nf-brand-primary), inset 0 0 0 1px color-mix(in oklab, var(--nf-brand-primary) 45%, transparent)",
                    }
                  : undefined
              }
            >
              {selected && (
                <UiIcon
                  name="verified"
                  size={16}
                  className="absolute right-3 top-3 shrink-0"
                />
              )}
              <span className="pr-5 text-[0.9375rem] font-semibold leading-tight text-[var(--nf-content-primary)]">
                {copy.label}
              </span>
              <span className="text-[0.75rem] leading-snug text-[var(--nf-content-muted)]">
                {copy.hint}
              </span>
            </button>
          );
        })}
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          data-testid="welcome-error"
          className="mt-5 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
        >
          {state.error}
        </p>
      )}

      {skipError && (
        <p
          role="alert"
          data-testid="welcome-skip-error"
          className="mt-5 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
        >
          {skipError}
        </p>
      )}

      {/*
        Continue is enabled with nothing chosen, and saving an empty list is a
        real save: it states no intent and records that the question was asked,
        which is the same outcome as Skip. A disabled primary button that gives
        no reason is how a first-run screen becomes a dead end.
      */}
      <Button
        type="submit"
        variant="primary"
        full
        loading={saving}
        disabled={skipping}
        data-testid="welcome-save"
        className="mt-6"
      >
        Continue
      </Button>

      <Button
        type="button"
        variant="ghost"
        full
        onClick={onSkip}
        loading={skipping}
        disabled={saving}
        data-testid="welcome-skip"
        className="mt-2"
      >
        Skip
      </Button>

      {/*
        Says exactly what the answer does and nothing more. It does not promise
        a screen to change it on, because there is not one yet: this is the
        first-run question, and inventing a "you can edit this in Settings" for
        a surface nobody has built is the kind of copy that turns into a support
        ticket.
      */}
      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        This only changes what we show first. Any search or filter you set
        yourself always wins.
      </p>
    </form>
  );
}

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
import type { Dictionary } from "@naijafinds/i18n";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/interests/schema";

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
 *
 * TWO MOUNTS, ONE COMPONENT.
 *
 * The same cards answer the same question on `/welcome` and on
 * `/settings/interests`, and they are the same component on purpose. A second
 * copy for the settings screen is how the two drift: the enum grows, one screen
 * gets the new card, and a person who edits their answer later silently loses
 * an option they were offered at the door. `mode` changes three things and
 * nothing else - where a save lands, what the primary button says, and whether
 * Skip is offered.
 *
 * Skip belongs to the first run only. Somebody who deliberately opened the
 * settings screen cannot "skip" a question they went looking for; the way to
 * state nothing there is to take every card off, which saves an empty list,
 * which is a real answer the schema already accepts.
 */
export function InterestChoices({
  initial,
  mode = "welcome",
  t,
}: {
  initial: PropertyType[];
  /* The nine market names and every word around them. `INTEREST_COPY` in
     lib/interests/schema.ts stays as the English source the dictionary was
     written from, but nothing renders it now. */
  t: Dictionary;
  /** `welcome` is the first run. `settings` is somebody changing their mind. */
  mode?: "welcome" | "settings";
}) {
  const router = useRouter();
  const firstRun = mode === "welcome";
  const [chosen, setChosen] = useState<PropertyType[]>(initial);
  const [saved, setSaved] = useState(false);
  const [skipping, startSkip] = useTransition();
  const [skipError, setSkipError] = useState("");
  const [state, formAction, saving] = useActionState<
    ActionResult<InterestsSaved> | null,
    FormData
  >(saveInterestsAction, null);

  useEffect(() => {
    if (!state?.ok) return;
    if (!firstRun) {
      /*
       * Settings stays where it is. Bouncing somebody to home the moment they
       * adjust a preference takes the screen away before they can see that it
       * worked, and takes away the chance to adjust it again.
       */
      setSaved(true);
      router.refresh();
      return;
    }
    /*
     * Home is rendered per request and reads this row, so a replace rather than
     * a push: the welcome screen is answered once and must not sit in the back
     * stack waiting to be walked into again.
     */
    router.replace("/home");
    router.refresh();
  }, [state, router, firstRun]);

  const toggle = (value: PropertyType) => {
    // Any change makes a previous confirmation stale, so it goes.
    setSaved(false);
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
        aria-label={t.interests.question}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {PROPERTY_TYPES.map((value) => {
          const selected = chosen.includes(value);

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
                {t.interests.markets[value]}
              </span>
              <span className="text-[0.75rem] leading-snug text-[var(--nf-content-muted)]">
                {t.interests.hints[value]}
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

      {saved && !firstRun && (
        <p
          role="status"
          data-testid="interests-saved"
          className="mt-5 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-success)_45%,transparent)] px-3.5 py-2.5 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-state-success)]"
        >
          {chosen.length === 0
            ? t.interests.savedNothing
            : t.interests.savedSomething}
        </p>
      )}

      {/*
        The primary is enabled with nothing chosen, and saving an empty list is
        a real save: it states no intent and records that the question was
        asked, which on the first run is the same outcome as Skip and in
        settings is how somebody takes their answer back. A disabled primary
        button that gives no reason is how a screen becomes a dead end.
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
        {firstRun ? t.common.continue : t.interests.save}
      </Button>

      {firstRun && (
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
          {t.interests.skip}
        </Button>
      )}

      {/*
        Says exactly what the answer does and nothing more. On the first run it
        now also names the screen this can be changed on, which it could not do
        before that screen existed - the note it replaces recorded exactly that,
        and the rule it was keeping was never to promise a surface nobody had
        built.
      */}
      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        {t.interests.note}
        {firstRun ? t.interests.noteFirstRun : ""}
      </p>
    </form>
  );
}

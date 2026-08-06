"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { AuthFormState } from "@/lib/auth/actions";
import { HEAR_ABOUT_OPTIONS } from "@/lib/auth/signup-options";
import { PlaceFields, type PlaceValues } from "@/components/app/place/PlaceFields";
import type { StateOption } from "@/lib/places/reference";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Field, FormGroup, PasswordField, SelectField, StrengthMeter } from "./fields";

const EMPTY: AuthFormState = { ok: false };

/**
 * The email form, on its own screen.
 *
 * It has the panel to itself. Nothing sits under it competing for the tap that
 * finishes the account, and the only other control is the way back to the three
 * choices - which the browser's back button also does now that this is a real
 * route rather than a piece of component state.
 *
 * Sign-up collects the full profile; sign-in stays lean with email and password
 * only. Every word either of them draws comes out of the dictionary under
 * `signUp` or `auth`; there is nothing English left inline, which is what the
 * note that used to sit here was waiting for.
 *
 * The sign-up form is grouped rather than stacked. Nine fields in one unbroken
 * column is a wall, and a wall is where people abandon. Four headed groups with
 * air between them, each answering one question: who you are, how you sign in,
 * where you stay and what you do, and how you found us. The two long lists
 * (774 local governments, 749 occupations) are searchable pickers that fetch
 * themselves when opened, so the page weighs the same as it did before them.
 */
export function EmailAuthForm({
  mode,
  t,
  action,
  states = [],
  next,
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** The 37 states, read on the server. Sign-in does not need them. */
  states?: StateOption[];
  /** Where to land afterwards. Re-validated in the action, never trusted. */
  next?: string | undefined;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [place, setPlace] = useState<PlaceValues>({
    stateCode: "",
    lgaCode: "",
    occupationCode: "",
  });
  const isSignUp = mode === "sign-up";

  /*
   * "1 of 4" is a sentence, not a format. Yoruba, Hausa and Igbo do not all
   * put the two numbers either side of one word, so the whole thing is a
   * dictionary string with two slots rather than a template assembled here.
   */
  const step = (current: number) =>
    t.signUp.stepOf.replace("{current}", String(current)).replace("{total}", "4");

  /*
   * The word shown and the value posted, apart.
   *
   * `HEAR_ABOUT_OPTIONS` carries the English value the server validates and the
   * database stores - frozen, because every row written before this form spoke
   * four languages holds one of those six words - alongside the key its label
   * lives under. Translating in place would have quietly stopped the validator
   * matching answers already saved.
   */
  const hearAbout = HEAR_ABOUT_OPTIONS.map((option) => ({
    value: option.value,
    label: t.signUp.hearAbout[option.labelKey],
  }));

  // Live mismatch feedback on the confirm field; the server re-checks it.
  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmError = mismatch
    ? t.signUp.passwordMismatch
    : state.fieldErrors?.confirmPassword;

  return (
    <div className="w-full">
      {/* The way back sits above the heading, where a screen reader and a thumb
          both find it first, and it names where it goes rather than saying
          "back" to somebody who arrived here on a deep link. */}
      <Link
        href={isSignUp ? "/sign-up" : "/sign-in"}
        className="nf-tap -ml-1 mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-secondary)]"
      >
        <UiIcon name="arrow-left" size={16} />
        {t.auth.otherWays}
      </Link>

      <h1 className="nf-h2 text-center">{isSignUp ? t.auth.createAccount : t.auth.welcomeBack}</h1>
      <p className="mb-6 mt-1.5 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
        {isSignUp ? t.auth.signUpToStart : t.auth.signInToContinue}
      </p>

      <form
        action={formAction}
        className={isSignUp ? "text-left" : "space-y-3.5 text-left"}
        noValidate
      >
        {/* Where the middleware was sending them before it asked them to sign
            in. A hidden field is an input like any other, so the action
            re-checks it rather than trusting the round trip. */}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isSignUp ? (
          <>
            <FormGroup title={t.signUp.groups.identity} step={step(1)}>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  t={t}
                  id="firstName"
                  name="firstName"
                  type="text"
                  label={t.signUp.firstNameLabel}
                  placeholder={t.signUp.firstNamePlaceholder}
                  autoComplete="given-name"
                  error={state.fieldErrors?.firstName}
                />
                <Field
                  t={t}
                  id="surname"
                  name="surname"
                  type="text"
                  label={t.signUp.surnameLabel}
                  placeholder={t.signUp.surnamePlaceholder}
                  autoComplete="family-name"
                  error={state.fieldErrors?.surname}
                />
              </div>
              <Field
                t={t}
                id="nickname"
                name="nickname"
                type="text"
                label={t.signUp.nicknameLabel}
                optional
                placeholder={t.signUp.nicknamePlaceholder}
                autoComplete="nickname"
                error={state.fieldErrors?.nickname}
              />
            </FormGroup>

            <FormGroup title={t.signUp.groups.credentials} step={step(2)}>
              <Field
                t={t}
                id="email"
                name="email"
                type="email"
                label={t.auth.emailLabel}
                placeholder={t.auth.emailPlaceholder}
                autoComplete="email"
                error={state.fieldErrors?.email}
              />
              <PasswordField
                t={t}
                id="password"
                label={t.auth.passwordLabel}
                placeholder={t.auth.passwordPlaceholder}
                autoComplete="new-password"
                error={state.fieldErrors?.password}
                value={password}
                onChange={setPassword}
              />
              <StrengthMeter password={password} t={t} />
              <PasswordField
                t={t}
                id="confirmPassword"
                label={t.auth.confirmPasswordLabel}
                placeholder={t.auth.confirmPasswordPlaceholder}
                autoComplete="new-password"
                error={confirmError}
                value={confirm}
                onChange={setConfirm}
              />
            </FormGroup>

            <FormGroup
              title={t.signUp.groups.place}
              step={step(3)}
              note={t.signUp.placeNote}
            >
              <PlaceFields
                t={t}
                states={states}
                value={place}
                onChange={setPlace}
                fieldErrors={state.fieldErrors as Record<string, string> | undefined}
              />
            </FormGroup>

            <FormGroup title={t.signUp.groups.discovery} step={step(4)}>
              <SelectField
                id="hearAbout"
                name="hearAbout"
                label={t.signUp.hearAboutLabel}
                placeholder={t.signUp.hearAboutPlaceholder}
                options={hearAbout}
                error={state.fieldErrors?.hearAbout}
              />
              <Field
                t={t}
                id="referralCode"
                name="referralCode"
                type="text"
                label={t.signUp.referralLabel}
                optional
                placeholder={t.signUp.referralPlaceholder}
                autoComplete="off"
                error={state.fieldErrors?.referralCode}
              />
            </FormGroup>
          </>
        ) : (
          <>
            <Field
              t={t}
              id="email"
              name="email"
              type="email"
              label={t.auth.emailLabel}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              error={state.fieldErrors?.email}
            />
            <PasswordField
              t={t}
              id="password"
              label={t.auth.passwordLabel}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete="current-password"
              error={state.fieldErrors?.password}
              value={password}
              onChange={setPassword}
            />
          </>
        )}

        {state.message && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-warning)_35%,transparent)] bg-[var(--nf-state-warning-surface)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
          >
            {state.message}
          </p>
        )}

        {/*
          The label no longer swaps to "Loading" while pending. It stays and
          dims behind a spinner, so the button keeps its width and the user
          keeps their place. Height, radius, press feedback and haptics all
          come from the primitive.
        */}
        <div className={isSignUp ? "mt-7" : ""}>
          <Button type="submit" variant="primary" size="lg" full loading={pending}>
            {isSignUp ? t.common.signUp : t.common.signIn}
          </Button>
        </div>

        {!isSignUp && (
          <p className="text-center">
            <Link
              href="/forgot-password"
              className="text-[0.8125rem] text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-[0.875rem] text-[var(--nf-content-secondary)]">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline"
        >
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        {t.auth.termsNotice}
      </p>
    </div>
  );
}

"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AcceptTerms } from "./AcceptTerms";
import { withNext } from "@/lib/auth/next-link";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import type { AuthFormState, EmailStatus } from "@/lib/auth/form-state";
import { HEAR_ABOUT_OPTIONS } from "@/lib/auth/signup-options";
import { PlaceFields, type PlaceValues } from "@/components/app/place/PlaceFields";
import type { StateOption } from "@/lib/places/reference";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Field, FormGroup, PasswordField, SelectField, StrengthMeter } from "./fields";
import { EmailTakenNotice } from "./EmailTakenNotice";
import { signUpMethodForEmail, startGoogleOAuth } from "@/lib/auth/actions";

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
  initialEmail = "",
  accountMethod = "unknown",
  googleReady = false,
  initialState = EMPTY,
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** The 37 states, read on the server. Sign-in does not need them. */
  states?: StateOption[];
  /** Where to land afterwards. Re-validated in the action, never trusted. */
  next?: string | undefined;
  /**
   * The address typed on the chooser, carried here in a short-lived cookie
   * (`continueWithEmail`, or `?email=` on a link that carries it) so the
   * email-first flow of the governing render holds: the first screen
   * takes the address, this one takes the password, and nobody types their
   * email twice. Anything not shaped like an address is ignored.
   */
  initialEmail?: string;
  /**
   * Sign-in only: how the address typed on the chooser signs in, read on the
   * server by the page. "google" means there is no password to ask for, so
   * the screen says so and offers the Google door instead of a password field
   * that can only ever answer "do not match". "none" draws the same password
   * step as "unknown", so the screen never says whether an account exists.
   * "unknown" (the default, and the answer whenever the lookup is refused or
   * unavailable) draws the ordinary password step.
   */
  accountMethod?: EmailStatus;
  /** Whether the Google door is switched on, from `getProviderStates`. */
  googleReady?: boolean;
  /** The form's state before any submit. Only the preview harness passes it,
      to draw a refusal without a live account. */
  initialState?: AuthFormState;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  /*
   * F-12: A REFUSED SUBMIT PUTS THE CURSOR ON THE FIRST THING TO FIX. The
   * sign-up form is several screens tall on a phone, and a refusal used to
   * leave focus on the button at the bottom with the first error scrolled out
   * of sight. Every field marks itself `aria-invalid` when it carries an
   * error, so the first one in document order is the one to fix first;
   * focusing it also scrolls it into view and has a screen reader read it.
   */
  const formRef = useRef<HTMLFormElement>(null);
  const [refusedLocally, setRefusedLocally] = useState(0);
  useEffect(() => {
    const refusedByServer =
      state !== initialState && Object.keys(state.fieldErrors ?? {}).length > 0;
    if (!refusedByServer && refusedLocally === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, initialState, refusedLocally]);
  /*
   * EVERY TEXT FIELD IS CONTROLLED, AND IT HAS TO BE.
   *
   * THE BUG: filling the whole sign-up form, submitting, and getting one
   * validation error back wiped fields that were already correct. It took
   * several attempts to get through, because each attempt cleared more than it
   * complained about.
   *
   * THE CAUSE is not our validation. React RESETS AN UNCONTROLLED FORM WHEN THE
   * ACTION PASSED TO `<form action>` COMPLETES - on failure exactly as on
   * success, because from React's side an action that returned is an action
   * that finished. Password and confirm were already controlled, which is why
   * those two survived and the rest did not; that inconsistency is what made it
   * look intermittent.
   *
   * So the values live here. The form re-renders after the action with the
   * state intact, the inputs read from it, and nothing a person typed is thrown
   * away by a message telling them to fix one thing.
   *
   * PASSWORDS ARE NOT IN THIS OBJECT. They have their own state above and are
   * kept out of the generic bag deliberately, so that anything added later
   * which logs, serialises or inspects `values` cannot reach them.
   */
  const [values, setValues] = useState<Record<string, string>>(
    initialEmail ? { email: initialEmail } : {},
  );
  const bind = (field: string) => ({
    value: values[field] ?? "",
    onChange: (next: string) => setValues((v) => ({ ...v, [field]: next })),
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [place, setPlace] = useState<PlaceValues>({
    stateCode: "",
    lgaCode: "",
    occupationCode: "",
  });
  const isSignUp = mode === "sign-up";
  /*
   * THE ACCEPTANCE, AND WHY IT IS STATE RATHER THAN A `required` ATTRIBUTE.
   *
   * The form is `noValidate`, deliberately, because every other refusal on
   * this screen is a sentence this product wrote rather than a browser
   * bubble. A `required` checkbox would be the one exception and it would look
   * like one. So the tick is held here, the submit is refused here, and the
   * sentence comes from the dictionary like every other sentence.
   */
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const [adult, setAdult] = useState(false);
  const [adultError, setAdultError] = useState(false);

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
    /* Sign in is the render's card and takes its measured width (ledger
       R-C); the nine-field sign-up form keeps the wider card. */
    <div className={isSignUp ? "w-full" : "nf-auth--narrow w-full"}>
      {/* The way back sits above the heading, where a screen reader and a thumb
          both find it first, and it names where it goes rather than saying
          "back" to somebody who arrived here on a deep link. */}
      <Link
        href={withNext(isSignUp ? "/sign-up" : "/sign-in", next)}
        className="nf-tap nf-auth__aside -ml-1 mb-sm inline-flex items-center gap-xs text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-secondary)]"
      >
        <UiIcon name="arrow-left" size={16} />
        {t.auth.otherWays}
      </Link>

      <h1 className="nf-auth__title">{isSignUp ? t.auth.createAccount : t.auth.welcomeBack}</h1>
      <p className="nf-auth__sub mb-lg">
        {isSignUp ? t.auth.signUpToStart : t.auth.signInToContinue}
      </p>

      {!isSignUp && accountMethod === "google" && (
        <div className="nf-auth__notice mb-md" role="status">
          <p>{googleReady ? t.auth.accountUsesGoogle : t.auth.accountUsesGoogleOff}</p>
          {googleReady && (
            <form action={startGoogleOAuth} className="mt-sm">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <input type="hidden" name="intent" value="sign-in" />
              <button type="submit" className="nf-btn nf-btn--primary nf-btn--full">
                {t.auth.continueWithGoogle}
              </button>
            </form>
          )}
        </div>
      )}
      {/* No "no account uses this address" notice here any more (F-08): it
          contradicted the "do not match" refusal and told anyone which
          addresses have accounts. "none" draws the plain password step. */}

      <form
        action={formAction}
        ref={formRef}
        onSubmit={(e) => {
          /* UX-14: the action is dispatched here rather than by `<form
             action>`, because React resets a form after a `<form action>`
             submission completes, refusal included. Controlled text fields
             survive that; the terms tick and the "where did you hear" select
             did not, so a person fixing one named error was refused again on
             two answers they had given. A dispatch from here is not followed
             by a reset, so every answer stays. `action` above still serves a
             submit made before the page has hydrated. */
          e.preventDefault();
          /* Sign up only. Signing in is not the moment somebody agrees to
             anything: they agreed when they made the account. The refusal
             is drawn here without a round trip, and the cursor goes to the
             first unticked box (F-12), once the error has rendered. */
          if (isSignUp && (!accepted || !adult)) {
            setAcceptError(!accepted);
            setAdultError(!adult);
            setRefusedLocally((n) => n + 1);
            return;
          }
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        className={isSignUp ? "text-left" : "space-y-md text-left"}
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
                  {...bind("firstName")}
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
                  {...bind("surname")}
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
                {...bind("nickname")}
                type="text"
                label={t.signUp.nicknameLabel}
                optional
                placeholder={t.signUp.nicknamePlaceholder}
                autoComplete="nickname"
                error={state.fieldErrors?.nickname}
              />
            </FormGroup>

            <FormGroup title={t.signUp.groups.credentials} step={step(2)}>
              {/* The address is checked as the field loses focus, so an
                  account that already exists is named here rather than
                  discovered after four groups of questions and a submit. */}
              <EmailTakenNotice
                t={t}
                error={state.fieldErrors?.email}
                check={signUpMethodForEmail}
                initialEmail={initialEmail}
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
                {...bind("referralCode")}
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
              {...bind("email")}
              type="email"
              label={t.auth.emailLabel}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              error={state.fieldErrors?.email}
            />
            {/* The address arrived from the chooser, so the cursor goes to
                the one thing left to type. */}
            <PasswordField
              t={t}
              id="password"
              label={t.auth.passwordLabel}
              placeholder={t.auth.passwordPlaceholder}
              autoComplete="current-password"
              error={state.fieldErrors?.password}
              value={password}
              onChange={setPassword}
              autoFocus={Boolean(initialEmail)}
            />
          </>
        )}

        {state.message && (
          <p role="alert" className="nf-auth__alert">
            {state.message}
            {/*
              THE WAY OUT, when the refusal has one and it is somewhere else.
              Inside the alert rather than under it, so a screen reader that
              has just been handed the sentence is handed the link with it
              rather than reaching it only by moving on. Nothing renders when
              no action is set, which is every refusal but one.
            */}
            {state.action && (
              <>
                {" "}
                <Link href={state.action.href} className="nf-auth__notice-link">
                  {state.action.label}
                </Link>
              </>
            )}
          </p>
        )}

        {/*
          The label no longer swaps to "Loading" while pending. It stays and
          dims behind a spinner, so the button keeps its width and the user
          keeps their place. Height, radius, press feedback and haptics all
          come from the primitive.
        */}
        {isSignUp && (
          <AcceptTerms
            t={t}
            accepted={accepted}
            onChange={(next) => {
              setAccepted(next);
              if (next) setAcceptError(false);
            }}
            /* The browser's refusal OR the server's. The server refuses a
               sign-up that carries no current terms version, and that refusal
               has to land on this control rather than vanish, because a form
               that comes back unchanged with no visible reason reads as
               broken. */
            showError={acceptError || Boolean(state.fieldErrors?.acceptTerms)}
            adult={adult}
            onAdultChange={(next) => {
              setAdult(next);
              if (next) setAdultError(false);
            }}
            showAdultError={adultError || Boolean(state.fieldErrors?.ageConfirmed)}
          />
        )}

        <div className={isSignUp ? "mt-7" : ""}>
          <Button type="submit" variant="primary" size="lg" full loading={pending}>
            {isSignUp ? t.common.signUp : t.common.signIn}
          </Button>
        </div>

        {!isSignUp && (
          <p className="text-center">
            <Link
              href="/forgot-password"
              className="nf-tap nf-auth__aside text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </p>
        )}
      </form>

      <p className="nf-auth__swap">
        {isSignUp ? t.auth.haveAccount : t.auth.newToVallo}{" "}
        <Link href={withNext(isSignUp ? "/sign-in" : "/sign-up", next)}>
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      {/* The passive notice for sign in now sits under the plinth in the
          auth layout, for every auth screen alike. On sign up it is the tick
          above, which is the whole point. */}
    </div>
  );
}

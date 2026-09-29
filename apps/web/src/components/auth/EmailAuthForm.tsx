"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AcceptTerms } from "./AcceptTerms";
import { withNext } from "@/lib/auth/next-link";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import type { AuthFormState, EmailStatus } from "@/lib/auth/form-state";
import type { SignInSurface } from "@/lib/auth/providers";
import { HEAR_ABOUT_OPTIONS } from "@/lib/auth/signup-options";
import { PlaceFields, type PlaceValues } from "@/components/app/place/PlaceFields";
import type { StateOption } from "@/lib/places/reference";
import { BackControl } from "@/components/ui/BackControl";
import { Field, PasswordField, SelectField, StrengthMeter } from "./fields";
import { EmailTakenNotice } from "./EmailTakenNotice";
import { SocialDoors } from "./SocialDoors";
import { AuthPillButton } from "./slate";
import { signUpMethodForEmail, startGoogleOAuth } from "@/lib/auth/actions";
import {
  asksForStepTwo,
  hrefForStep,
  isStepTwoEntry,
  stepAfterTraversal,
  stepTwoState,
} from "@/lib/auth/signup-step-history";

const EMPTY: AuthFormState = { ok: false };

/* Sign up's address for a step, in place (see `goNext`). */
function replaceStepUrl(to: 1 | 2) {
  try {
    window.history.replaceState(to === 2 ? stepTwoState() : {}, "", hrefForStep(window.location, to));
  } catch {
    /* A sandbox that refuses history still changes step. */
  }
}

/* The same shape the server checks (`lib/auth/actions.ts`); the server is
   still the judge, this only stops Next moving on with an obvious gap. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * WHICH STEP OWNS WHICH ANSWER. Step one is the account (name, email,
 * password), step two is everything else. A refusal from the server on any
 * step-one field brings the form back to step one, so the cursor can land on
 * the thing to fix rather than on a field that is hidden.
 */
const STEP_ONE_FIELDS = new Set(["firstName", "surname", "email", "password", "confirmPassword"]);

type StepOneErrors = Partial<
  Record<"firstName" | "surname" | "email" | "password" | "confirmPassword", string>
>;

/**
 * The email form, on its own screen, in the Slate dress.
 *
 * SIGN IN is the reference screen itself, ON ONE SCREEN (B-1, the founder,
 * 29 September; refs 12 and 14): the big title, the email and password cards
 * together, "Forgot password?" on the right, the pill, the "Or" rule, the
 * round Google and Apple doors and the line to sign up. It is what `/sign-in`
 * draws; the old second step, `/sign-in/email`, now forwards here. Nothing
 * about the door's safety moved with it: the same `signInWithEmail` action,
 * its two rate limits, its one neutral refusal, its `next` check.
 *
 * SIGN UP IS TWO STEPS ON ONE PAGE (the founder, 29 September). Step one is
 * the account: first name and surname, email, password and its confirmation,
 * then Next, with Google and Apple under it as the quicker way. Step two is
 * the rest: nickname, where you stay and what you do, how you found us, the
 * referral code, the 18+ tick and the terms, then Create account. A step
 * indicator names where you are, and a back arrow returns to step one with
 * every answer kept.
 *
 * IT IS STILL ONE FORM POSTING ONE ACTION. Both steps are inside the same
 * `<form>`; the step that is not showing is `hidden`, not unmounted, so its
 * inputs keep their values and are posted with the rest. The server contract
 * (`signUpWithEmail`, the field names, its validation) is exactly what it
 * was. Next runs only the early checks a person would otherwise meet after
 * the whole second step (a name left empty, a short password, two passwords
 * that differ), and the server checks everything again.
 *
 * Every word either mode draws comes out of the dictionary under `signUp` or
 * `auth`. The two long lists (774 local governments, 749 occupations) are
 * searchable pickers that fetch themselves when opened.
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
  appleReady = false,
  surface = "web",
  initialState = EMPTY,
  notice,
  emailReady = true,
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
   * email-first flow holds: the first screen takes the address, this one
   * takes the password, and nobody types their email twice. Anything not
   * shaped like an address is ignored.
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
  /** Whether the Google door is switched on, from `resolveProviderStates`. */
  googleReady?: boolean;
  /** Whether the Apple door is switched on for this surface. */
  appleReady?: boolean;
  /** Which surface the server rendered for (the doors differ inside a shell). */
  surface?: SignInSurface;
  /** The form's state before any submit. Only the preview harness passes it,
      to draw a refusal without a live account. */
  initialState?: AuthFormState;
  /**
   * Sign-in only: a sentence from the callback, the wall or the passcode lock
   * (`?notice=` looked up in the dictionary by the page, own keys only), drawn
   * under the title as a status.
   */
  notice?: string | undefined;
  /** False when accounts cannot be reached at all: the pill gives way to
      the sentence that says so, as the chooser used to. */
  emailReady?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignUp = mode === "sign-up";
  const [step, setStep] = useState<1 | 2>(1);
  /*
   * F-12: A REFUSED SUBMIT PUTS THE CURSOR ON THE FIRST THING TO FIX. Every
   * field marks itself `aria-invalid` when it carries an error, so the first
   * one showing is the one to fix first; focusing it also scrolls it into
   * view and has a screen reader read it.
   *
   * THE FOCUS WAITS FOR THE STEP. A refusal can arrive for a field on the
   * step that is not showing, so the request is held in a ref and served
   * after the render that shows the right step. The same ref moves focus to
   * a step's heading when Next or the back arrow changes step.
   */
  const formRef = useRef<HTMLFormElement>(null);
  const focusWanted = useRef<"invalid" | "heading" | null>(null);
  const [refusedLocally, setRefusedLocally] = useState(0);
  /* A new answer from the server picks the step before anything paints:
     the step that holds the first refused field. Adjusting state from a
     changed value during render, rather than in an effect, is what spares
     the extra paint of the wrong step. */
  const [answered, setAnswered] = useState(state);
  if (answered !== state) {
    setAnswered(state);
    const refused = Object.keys(state.fieldErrors ?? {});
    if (isSignUp && refused.length > 0) {
      setStep(refused.some((key) => STEP_ONE_FIELDS.has(key)) ? 1 : 2);
    }
  }
  useEffect(() => {
    const refusedByServer =
      state !== initialState && Object.keys(state.fieldErrors ?? {}).length > 0;
    if (!refusedByServer && refusedLocally === 0) return;
    focusWanted.current = "invalid";
  }, [state, initialState, refusedLocally]);
  useEffect(() => {
    const want = focusWanted.current;
    if (!want) return;
    focusWanted.current = null;
    const scope = formRef.current?.closest(".nf-auth__screen") ?? formRef.current;
    if (want === "heading") {
      scope?.querySelector<HTMLElement>(`[data-step-heading="${step}"]`)?.focus();
      return;
    }
    const invalid = Array.from(scope?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []);
    invalid.find((el) => !el.closest("[hidden]"))?.focus();
  });
  /*
   * EVERY TEXT FIELD IS CONTROLLED, AND IT HAS TO BE.
   *
   * React RESETS AN UNCONTROLLED FORM WHEN THE ACTION PASSED TO `<form
   * action>` COMPLETES, on failure exactly as on success, which wiped answers
   * that were already correct. So the values live here, the inputs read from
   * this state, and nothing a person typed is thrown away by a message
   * telling them to fix one thing. It is also what keeps step one's answers
   * when a person goes to step two and back.
   *
   * PASSWORDS ARE NOT IN THIS OBJECT. They have their own state below and are
   * kept out of the generic bag deliberately, so that anything added later
   * which logs, serialises or inspects `values` cannot reach them.
   */
  const [values, setValues] = useState<Record<string, string>>(
    initialEmail ? { email: initialEmail } : {},
  );
  const [localErrors, setLocalErrors] = useState<StepOneErrors>({});
  const bind = (field: string) => ({
    value: values[field] ?? "",
    onChange: (next: string) => {
      setValues((v) => ({ ...v, [field]: next }));
      if (field in localErrors) setLocalErrors((e) => ({ ...e, [field]: undefined }));
    },
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [place, setPlace] = useState<PlaceValues>({
    stateCode: "",
    lgaCode: "",
    occupationCode: "",
  });
  /*
   * THE ACCEPTANCE, AND WHY IT IS STATE RATHER THAN A `required` ATTRIBUTE.
   *
   * The form is `noValidate`, deliberately, because every other refusal on
   * this screen is a sentence this product wrote rather than a browser
   * bubble. So the tick is held here, the submit is refused here, and the
   * sentence comes from the dictionary like every other sentence.
   */
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const [adult, setAdult] = useState(false);
  const [adultError, setAdultError] = useState(false);

  /* "Step 1 of 2" is a sentence, not a format: a dictionary string with two
     slots, because not every language puts the numbers either side of a word. */
  const stepLabel = (current: number) =>
    t.signUp.stepIndicator.replace("{current}", String(current)).replace("{total}", "2");

  /*
   * The word shown and the value posted, apart. `HEAR_ABOUT_OPTIONS` carries
   * the English value the server validates and the database stores, frozen,
   * alongside the key its label lives under.
   */
  const hearAbout = HEAR_ABOUT_OPTIONS.map((option) => ({
    value: option.value,
    label: t.signUp.hearAbout[option.labelKey],
  }));

  // Live mismatch feedback on the confirm field; the server re-checks it.
  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmError = mismatch
    ? t.signUp.passwordMismatch
    : (localErrors.confirmPassword ?? state.fieldErrors?.confirmPassword);

  /* The early checks for step one. The address is read from the form
     because its field is owned by `EmailTakenNotice`. */
  function stepOneErrors(): StepOneErrors {
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    const email = String(data.get("email") ?? "").trim();
    const errors: StepOneErrors = {};
    if (!(values.firstName ?? "").trim()) errors.firstName = t.signUp.firstNameRequired;
    if (!(values.surname ?? "").trim()) errors.surname = t.signUp.surnameRequired;
    if (!email) errors.email = t.signUp.emailRequired;
    else if (!EMAIL_SHAPE.test(email)) errors.email = t.signUp.emailInvalid;
    if (password.length < 8) errors.password = t.signUp.passwordShort;
    else if (!confirm) errors.confirmPassword = t.signUp.confirmRequired;
    else if (confirm !== password) errors.confirmPassword = t.signUp.passwordMismatch;
    return errors;
  }

  /*
   * STEP TWO IS A HISTORY ENTRY (`lib/auth/signup-step-history.ts`). Next
   * pushes `?step=2` on this same page, so the browser's Back returns to step
   * one with every answer kept, Forward returns to step two, and Android's
   * hardware back does the same (`lib/nav/in-page-step.ts`). Before this, Back
   * left the page and every answer with it.
   */
  /* Next: the early checks for step one, then step two. */
  function goNext() {
    const errors = stepOneErrors();
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0) {
      setRefusedLocally((n) => n + 1);
      return;
    }
    try {
      if (!isStepTwoEntry(window.history.state)) {
        window.history.pushState(stepTwoState(), "", hrefForStep(window.location, 2));
      }
    } catch {
      /* A sandbox that refuses history still changes step. */
    }
    focusWanted.current = "heading";
    setStep(2);
  }

  /* The drawn back arrow is the browser's Back when step two is the entry
     this form pushed, so both leave history in the same shape; the
     `popstate` listener below then shows step one. */
  function goBack() {
    if (isStepTwoEntry(window.history.state)) {
      window.history.back();
      return;
    }
    focusWanted.current = "heading";
    setStep(1);
  }

  /* The traversal listener reads the answers as they are now, not as they
     were when it was bound. */
  const stepOneReady = useRef<() => boolean>(() => false);
  useEffect(() => {
    stepOneReady.current = () => Object.keys(stepOneErrors()).length === 0;
  });

  useEffect(() => {
    if (!isSignUp) return;
    /* A reload or a pasted address on `?step=2` has no step one in memory
       (the password is never stored), so it opens on step one. */
    if (asksForStepTwo(window.location.search)) replaceStepUrl(1);
    const onPop = (e: PopStateEvent) => {
      const to = stepAfterTraversal(e.state, stepOneReady.current());
      /* Forward onto step two with an answer since removed: stay on step
         one and take the stamp off the entry. */
      if (to === 1 && isStepTwoEntry(e.state)) replaceStepUrl(1);
      focusWanted.current = "heading";
      setStep(to);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isSignUp]);

  /* A server refusal on a step-one field brings step one back while the
     address still says step two; the entry is brought into line. */
  useEffect(() => {
    if (isSignUp && step === 1 && isStepTwoEntry(window.history.state)) replaceStepUrl(1);
  }, [isSignUp, step]);

  const stepOneError = (field: keyof StepOneErrors) =>
    localErrors[field] ?? state.fieldErrors?.[field];

  return (
    <div className={isSignUp ? "nf-auth__screen nf-auth__screen--form" : "nf-auth__screen"}>
      <div className="nf-slate-stagger">
        {isSignUp ? (
          <div className="nf-slate-head">
            {step === 2 ? (
              <BackControl onBack={goBack} label={t.signUp.backToStep} className="nf-slate-head__back" />
            ) : null}
            <h1 className="nf-auth__title">{t.common.signUp}</h1>
          </div>
        ) : (
          <h1 className="nf-auth__title">{t.common.signIn}</h1>
        )}

        {!isSignUp && notice ? (
          <p role="status" className="nf-auth__notice">
            {notice}
          </p>
        ) : null}

        {isSignUp && (
          <div className="nf-slate-steps">
            <p className="nf-slate-steps__label" aria-live="polite">
              {stepLabel(step)}
              <span className="nf-slate-steps__name">
                {step === 1 ? t.signUp.stepAccount : t.signUp.stepAbout}
              </span>
            </p>
            <div className="nf-slate-steps__track" aria-hidden="true">
              <span className="nf-slate-steps__seg is-on" />
              <span className={step === 2 ? "nf-slate-steps__seg is-on" : "nf-slate-steps__seg"} />
            </div>
          </div>
        )}

        {!isSignUp && accountMethod === "google" && (
          <div className="nf-auth__notice" role="status">
            <p>{googleReady ? t.auth.accountUsesGoogle : t.auth.accountUsesGoogleOff}</p>
            {googleReady && (
              <form action={startGoogleOAuth} className="mt-sm">
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <input type="hidden" name="intent" value="sign-in" />
                <AuthPillButton type="submit">{t.auth.continueWithGoogle}</AuthPillButton>
              </form>
            )}
          </div>
        )}
        {/* No "no account uses this address" notice here any more (F-08): it
            contradicted the "do not match" refusal and told anyone which
            addresses have accounts. "none" draws the plain password step. */}
      </div>

      <form
        action={formAction}
        ref={formRef}
        onKeyDown={(e) => {
          /* THE RETURN KEY SAYS "NEXT", SO IT GOES TO THE NEXT FIELD. On a
             phone the keyboard's return key is labelled by `enterKeyHint`;
             where it reads "next" and a later field in view is still empty,
             it moves the cursor there instead of submitting half a form.
             On the last field it submits (sign in) or is Next (sign up). */
          if (
            e.key === "Enter" &&
            !e.nativeEvent.isComposing &&
            e.target instanceof HTMLInputElement &&
            e.target.enterKeyHint === "next"
          ) {
            const fields = Array.from(
              e.currentTarget.querySelectorAll<HTMLInputElement>(
                'input:not([type=hidden]):not([type=checkbox]):not([type=radio])',
              ),
            ).filter((el) => !el.disabled && !el.closest("[hidden]"));
            const after = fields.slice(fields.indexOf(e.target) + 1).find((el) => el.value === "");
            if (after) {
              e.preventDefault();
              after.focus();
              return;
            }
          }
          /* Enter in a step-one field is Next. Step one has no submit button
             (Next is `type="button"`), so the browser's implicit submission
             never fires there and Enter would otherwise do nothing. */
          if (
            isSignUp &&
            step === 1 &&
            e.key === "Enter" &&
            !e.nativeEvent.isComposing &&
            e.target instanceof HTMLInputElement
          ) {
            e.preventDefault();
            goNext();
          }
        }}
        onSubmit={(e) => {
          /* UX-14: the action is dispatched here rather than by `<form
             action>`, because React resets a form after a `<form action>`
             submission completes, refusal included. A dispatch from here is
             not followed by a reset, so every answer stays. `action` above
             still serves a submit made before the page has hydrated. */
          e.preventDefault();
          /* Enter on step one is Next, not a submit with half the answers. */
          if (isSignUp && step === 1) {
            goNext();
            return;
          }
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
        className={
          isSignUp
            ? "nf-auth__form nf-auth__form--steps"
            : "nf-auth__form nf-auth__form--fields nf-slate-stagger"
        }
        noValidate
      >
        {/* Where the middleware was sending them before it asked them to sign
            in. A hidden field is an input like any other, so the action
            re-checks it rather than trusting the round trip. */}
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isSignUp ? (
          <>
            {/* STEP ONE: the account. */}
            <section
              data-step="1"
              hidden={step !== 1}
              aria-labelledby="signup-step-1"
              className="nf-slate-step nf-slate-stagger"
            >
              <h2 id="signup-step-1" data-step-heading="1" tabIndex={-1} className="sr-only">
                {stepLabel(1)}: {t.signUp.stepAccount}
              </h2>
              <div className="nf-slate-pair">
                <Field
                  t={t}
                  id="firstName"
                  name="firstName"
                  {...bind("firstName")}
                  type="text"
                  label={t.signUp.firstNameLabel}
                  placeholder={t.signUp.firstNamePlaceholder}
                  autoComplete="given-name"
                  enterKeyHint="next"
                  error={stepOneError("firstName")}
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
                  enterKeyHint="next"
                  error={stepOneError("surname")}
                />
              </div>
              {/* The address is checked as the field loses focus, so an
                  account that already exists is named here rather than
                  discovered after the second step and a submit. */}
              <EmailTakenNotice
                t={t}
                error={stepOneError("email")}
                check={signUpMethodForEmail}
                initialEmail={initialEmail}
              />
              <div>
                <PasswordField
                  t={t}
                  id="password"
                  label={t.auth.passwordLabel}
                  placeholder={t.auth.passwordPlaceholder}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  error={stepOneError("password")}
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    if (localErrors.password) setLocalErrors((e) => ({ ...e, password: undefined }));
                  }}
                />
                <div className="mt-sm">
                  <StrengthMeter password={password} t={t} />
                </div>
              </div>
              <PasswordField
                t={t}
                id="confirmPassword"
                label={t.auth.confirmPasswordLabel}
                placeholder={t.auth.confirmPasswordPlaceholder}
                autoComplete="new-password"
                enterKeyHint="next"
                error={confirmError}
                value={confirm}
                onChange={(value) => {
                  setConfirm(value);
                  if (localErrors.confirmPassword) {
                    setLocalErrors((e) => ({ ...e, confirmPassword: undefined }));
                  }
                }}
              />
            </section>

            {/* STEP TWO: everything else. */}
            <section
              data-step="2"
              hidden={step !== 2}
              aria-labelledby="signup-step-2"
              className="nf-slate-step nf-slate-stagger"
            >
              <h2 id="signup-step-2" data-step-heading="2" tabIndex={-1} className="sr-only">
                {stepLabel(2)}: {t.signUp.stepAbout}
              </h2>
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
              <div className="nf-slate-note-group">
                <p className="nf-slate-note">{t.signUp.placeNote}</p>
                <PlaceFields
                  t={t}
                  states={states}
                  value={place}
                  onChange={setPlace}
                  fieldErrors={state.fieldErrors as Record<string, string> | undefined}
                />
              </div>
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
              <AcceptTerms
                t={t}
                accepted={accepted}
                onChange={(next) => {
                  setAccepted(next);
                  if (next) setAcceptError(false);
                }}
                /* The browser's refusal OR the server's. The server refuses a
                   sign-up that carries no current terms version, and that
                   refusal has to land on this control rather than vanish. */
                showError={acceptError || Boolean(state.fieldErrors?.acceptTerms)}
                adult={adult}
                onAdultChange={(next) => {
                  setAdult(next);
                  if (next) setAdultError(false);
                }}
                showAdultError={adultError || Boolean(state.fieldErrors?.ageConfirmed)}
              />
            </section>
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
              inputMode="email"
              enterKeyHint="next"
              error={state.fieldErrors?.email}
            />
            {/* Email and password on one screen (B-1). When the address
                arrived already filled in (a link carrying it, or an old
                chooser post), the cursor goes to the one thing left to type. */}
            <div>
              <PasswordField
                t={t}
                id="password"
                label={t.auth.passwordLabel}
                placeholder={t.auth.signInPasswordPlaceholder}
                autoComplete="current-password"
                enterKeyHint="go"
                error={state.fieldErrors?.password}
                value={password}
                onChange={setPassword}
                autoFocus={Boolean(initialEmail)}
              />
              <p className="nf-slate-forgot">
                <Link href="/forgot-password" className="nf-tap nf-auth__aside">
                  {t.auth.forgotPassword}
                </Link>
              </p>
            </div>
          </>
        )}

        {state.message && (
          <p role="alert" className="nf-auth__alert">
            {state.message}
            {/*
              THE WAY OUT, when the refusal has one and it is somewhere else.
              Inside the alert rather than under it, so a screen reader that
              has just been handed the sentence is handed the link with it.
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

        {/* On sign up the pill rides a bar pinned to the foot of the screen,
            so the one primary action is in view from the first field to the
            last without scrolling to find it. The label stays and dims
            behind a spinner while pending, so the pill keeps its width. */}
        <div className={isSignUp ? "nf-auth__actions nf-auth__actions--sticky" : "nf-auth__actions"}>
          {isSignUp && step === 1 ? (
            /* Keyed apart from the submit below: React commits the step
               change before the click's default action runs, and the same
               element turned `type="submit"` would then submit step one. */
            <AuthPillButton
              key="next"
              type="button"
              onClick={goNext}
              className="nf-auth__cta"
              trailingIcon="arrow-right"
            >
              {t.common.next}
            </AuthPillButton>
          ) : !isSignUp && !emailReady ? (
            <p className="nf-auth__notice">{t.auth.providerUnavailable}</p>
          ) : (
            <AuthPillButton key="submit" type="submit" loading={pending} className="nf-auth__cta">
              {isSignUp ? t.signUp.createAccountCta : t.common.signIn}
            </AuthPillButton>
          )}
        </div>
      </form>

      {/* Google and Apple, round, under the rule: on sign in, and on step
          one of sign up, where they are the quicker way to the same place. */}
      {(!isSignUp || step === 1) && (
        <div className="nf-slate-stagger">
          <SocialDoors
            t={t}
            googleReady={googleReady}
            appleReady={appleReady}
            surface={surface}
            next={next}
            intent={mode}
          />
        </div>
      )}

      <p className="nf-auth__swap">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link href={withNext(isSignUp ? "/sign-in" : "/sign-up", next)}>
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      {/* What Vallo is, a quiet door under the swap on step one, with this
          form as the way back (request W2). It opens the slides (`tour=1`):
          a bare `/welcome` with a sign-up door is the intro, whose Get
          started only leads back round to the options page. */}
      {isSignUp && step === 1 && (
        <p className="nf-auth__swap nf-auth__swap--quiet">
          <Link
            href={`/welcome?tour=1&next=${encodeURIComponent(withNext("/sign-up/email", next))}`}
            prefetch={false}
            className="nf-tap"
          >
            {t.welcomeCards.label}
          </Link>
        </p>
      )}
    </div>
  );
}

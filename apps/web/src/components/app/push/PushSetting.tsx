"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { currentPermission, enrol } from "./enrol";
import { PushPrompt } from "./PushPrompt";
import { offerVerdict, readMemory, rememberSystemAsked, writeMemory } from "./moments";

/**
 * THE NOTIFICATION CONTROL ON THE SETTINGS SCREEN.
 *
 * ===========================================================================
 * A SETTINGS SCREEN IS NOT A MOMENT, AND THAT DISTINCTION IS WHY THIS FILE
 * EXISTS RATHER THAN A BARE `<PushPrompt moment="settings_opened" />`.
 *
 * `moments.ts` is about INTERRUPTIONS. It will not offer twice in thirty days
 * and will not offer a third time ever, which is exactly right for a prompt
 * that appears over something a person was already doing. It applies those
 * rules to every moment including `settings_opened`.
 *
 * On `/settings/notifications` that is the wrong answer and it is wrong in a
 * costly direction. Nobody arrives here by accident. A person who said Not
 * now twice and then came looking for the switch a week later would find the
 * screen silent, with no way to turn notifications on and nothing saying why.
 * That is a dead end built out of politeness.
 *
 * So the rules still decide whether the PROMPT is shown, with its careful
 * copy about what will be sent. When they say no, a plain control is shown
 * instead. A person who came to ask us can always say yes.
 *
 * This is recorded as a defect in the inherited design rather than fixed in
 * `moments.ts`, because the four moments are a closed contract with 41 tests
 * behind them and the fault is not in the rules, it is in applying rules
 * about interruption to a screen that is not one.
 *
 * ===========================================================================
 * THE THREE STATES THAT ARE NOT "ASK".
 *
 * GRANTED: there is nothing to ask for, but there may still be something to
 * do. A device whose row was retired from the list below still has the
 * browser permission, so the control stays and re-enrolling is one tap.
 * `/api/push/register` upserts on the token and clears `revoked_at`, so it is
 * safe to press repeatedly and never makes a second row.
 *
 * DENIED: THE SYSTEM PROMPT IS SPENT. On iOS a refusal is effectively
 * permanent and on the web a denied permission cannot be re-prompted from the
 * page at all. Offering a button that leads nowhere would be worse than
 * saying nothing, so the screen says where the only remaining route is: their
 * own browser or phone settings.
 *
 * UNSUPPORTED: an older Android browser, or iOS Safari on a site that has not
 * been added to the home screen, where web push does not exist. Named
 * plainly, with the one thing that would change it.
 */

type Phase =
  /* Before hydration. Nothing is rendered: both inputs are per device and
     neither exists on the server, so rendering anything else here would be a
     hydration mismatch. */
  | "deciding"
  | "prompt"
  | "control"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * What this device says right now, read as an external system.
 *
 * `useSyncExternalStore` rather than an effect, and the choice is not
 * stylistic. The browser's permission state and the prompt memory in
 * `localStorage` are external systems: they exist on the client and not on
 * the server, and React has one supported way to read such a thing without
 * either a hydration mismatch or a set-state-in-effect that triggers a
 * cascading render. `getServerSnapshot` answers "deciding", the client's
 * answer arrives on the hydration pass, and no lint rule has to be disabled
 * to get there.
 *
 * It returns a plain string because `getSnapshot` must return the same value
 * for the same state; a fresh object every call is the documented way to make
 * this hook loop for ever.
 */
function readPhase(): Exclude<Phase, "deciding"> {
  const permission = currentPermission();
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  if (permission === "unsupported") return "unsupported";

  const verdict = offerVerdict({
    moment: "settings_opened",
    permission,
    memory: readMemory(),
    now: Date.now(),
  });
  return verdict.show ? "prompt" : "control";
}

/* Nothing to subscribe to: a permission change that happens behind the page's
   back arrives on the next load, and a listener that fired on it would have
   nothing more to offer than this screen already does. */
function subscribe(): () => void {
  return () => {};
}

/**
 * THE CONTROL MAY NOT READ ON UNLESS A ROW EXISTS. THIS IS WHY.
 *
 * On 23 September the founder tried to register the first device this platform
 * has ever had. `/api/push/key` answered 401 because the route was gated, the
 * subscribe never happened, `push_tokens` stayed at zero rows, and **the
 * control still presented as allowed**, because the phase was read from
 * `Notification.permission` alone. Permission had genuinely been granted: that
 * is a fact about the BROWSER and it says nothing whatever about whether Vallo
 * holds a subscription.
 *
 * So a control that reads permission is a control that reports the wrong
 * thing at exactly the moment it matters, and it reported success over a
 * failure. Two things stop it now.
 *
 * ONE, `registeredDevices` comes from the database, server rendered by the
 * page that also draws the device list underneath. Zero rows means this
 * account has registered nothing, whatever the browser says.
 *
 * TWO, a failed attempt always settles the phase itself rather than leaving
 * the browser to drive it. Before, `setNote` was called and `setSettled` was
 * not, so the next render read permission, found "granted", and drew the
 * granted copy with the failure note beneath it. One said allowed and the
 * other said not switched on, about the same device, at the same moment.
 */
export function PushSetting({ registeredDevices = 0 }: { registeredDevices?: number } = {}) {
  const router = useRouter();
  const observed = useSyncExternalStore<Phase>(subscribe, readPhase, () => "deciding");
  /* What the person has since done on this screen, which outranks what the
     browser said when the page loaded. */
  const [settled, setSettled] = useState<Phase | null>(null);
  const phase = settled ?? observed;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);


  /* NOT AWAITED BEFORE THE CALL. `enrol` requests the permission on its first
     line precisely so the user activation from this click is still live when
     it does; an await before it loses the gesture in some browsers and the
     system prompt never appears. */
  const turnOn = useCallback(() => {
    setBusy(true);
    setNote(null);
    void enrol().then((outcome) => {
      writeMemory(rememberSystemAsked(readMemory()));
      setBusy(false);
      if (outcome.ok) {
        setSettled("granted");
        setNote("This device is on the list below.");
        /* The list is server-rendered from the database, so it is refreshed
           rather than patched. A client-side copy of the devices would be one
           stale render away from telling somebody a device is off when it is
           not. */
        router.refresh();
        return;
      }
      if (outcome.reason === "permission_denied") {
        setSettled("denied");
        return;
      }
      /* THE PHASE IS SETTLED ON EVERY FAILURE, not just on a refusal. Leaving
         it unset let `Notification.permission` decide, and permission was
         granted, so the screen drew the allowed copy over a failed attempt. */
      setSettled("control");
      setNote(
        outcome.reason === "sign_in_required"
          ? "Your session did not reach us, so this device was not registered. Sign in again and try once more. On an iPhone, the app you added to your home screen signs in separately from Safari."
          : outcome.reason === "not_configured"
            ? "Notifications are not switched on for this version of Vallo yet. Nothing for you to do."
            : outcome.reason === "unsupported"
              ? "This browser cannot show notifications. Add Vallo to your home screen and try again."
              : "That did not work. This device was not registered. Try again in a moment.",
      );
    });
  }, [router]);

  if (phase === "deciding") return null;

  if (phase === "prompt") {
    return (
      <PushPrompt
        moment="settings_opened"
        onSettled={(outcome) => {
          if (outcome === "enrolled") {
            setSettled("granted");
            router.refresh();
            return;
          }
          /* A No here is honoured as a No, and the plain control stays so the
             screen is not a dead end. */
          setSettled(outcome === "unavailable" ? readPhase() : "control");
        }}
      />
    );
  }

  if (phase === "unsupported") {
    return (
      <p className="nf-body-sm text-content-2" data-push-setting="unsupported">
        This browser cannot show notifications. On an iPhone, add Vallo to your home screen and
        open it from there, and the option will appear.
      </p>
    );
  }

  if (phase === "denied") {
    return (
      <p className="nf-body-sm text-content-2" data-push-setting="denied">
        Notifications are blocked for Vallo on this device. We cannot ask again from here: the
        only way back is your own settings. In a browser, open the padlock or the site settings
        beside the address and allow notifications. On a phone, find Vallo in the system settings
        and switch notifications on.
      </p>
    );
  }

  /*
   * `allowed` is a browser fact. `registered` is a database fact. They are
   * kept apart on purpose, and the control only ever reads ON when BOTH are
   * true. A device the browser has allowed but that we hold no row for is the
   * exact state the founder hit, and it now says so in as many words.
   */
  const allowed = phase === "granted";
  const registered = allowed && registeredDevices > 0;

  return (
    <div
      className="space-y-row"
      data-push-setting={registered ? "granted" : "control"}
      data-push-allowed={allowed ? "yes" : "no"}
      data-push-registered={registered ? "yes" : "no"}
    >
      <p className="nf-body-sm text-content-2">
        {registered
          ? "Notifications are allowed on this device. If it is not in the list below, switch it back on."
          : allowed
            ? "You have allowed notifications on this device, but it is not registered yet, so nothing will reach it. Switch it on below."
            : "Get told when a host answers, when somebody writes back, and when money moves. Nothing at night unless it is about your money."}
      </p>
      {note && (
        <p role="status" className="nf-body-sm text-content">
          {note}
        </p>
      )}
      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        data-testid="push-turn-on"
        className="nf-btn nf-btn--sm nf-btn--glass w-full"
      >
        {busy ? "Just a moment" : registered ? "Switch this device back on" : "Turn on for this device"}
      </button>
    </div>
  );
}

export default PushSetting;

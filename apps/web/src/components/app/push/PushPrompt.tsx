"use client";

import { useCallback, useEffect, useState } from "react";

import { currentPermission, enrol } from "./enrol";
import {
  offerVerdict,
  readMemory,
  rememberDecline,
  rememberSystemAsked,
  writeMemory,
  type PushMoment,
} from "./moments";

/**
 * THE SCREEN THAT COMES BEFORE THE SYSTEM PROMPT.
 *
 * ===========================================================================
 * WHY THERE IS A SCREEN AT ALL, WHEN THE SYSTEM ALREADY HAS ONE.
 *
 * Because the system's can only be shown once. On iOS a refusal is effectively
 * permanent; on the web a denied permission cannot be re-prompted from the
 * page. So the expensive question is asked only after a cheap one has already
 * been answered yes. A No here costs nothing and can be asked again in a
 * month. A No there costs the channel for the life of the install.
 *
 * ===========================================================================
 * THREE THINGS THIS COMPONENT WILL NOT DO.
 *
 * IT WILL NOT APPEAR ON A COLD START. It takes a `moment`, and the four
 * moments in `moments.ts` are all immediately after something has gone right
 * for the person. A caller that mounts this on a home screen has misused it,
 * and the moments are a closed union so that misuse has to be deliberate.
 *
 * IT WILL NOT ASK TWICE IN A MONTH, OR THREE TIMES EVER. `offerVerdict`
 * decides, this only renders.
 *
 * IT WILL NOT TOUCH THE SYSTEM PROMPT EXCEPT FROM THE YES HANDLER, in the
 * same tick as the click. `Notification.requestPermission()` is gated on user
 * activation and an await before it can lose the gesture, so `enrol` is
 * called directly from `onClick` with nothing awaited first.
 */

export type PushPromptProps = {
  /** Why now. See `moments.ts`; there are exactly four legitimate answers. */
  moment: PushMoment;
  /** Told what happened, so a caller can say thank you in its own words. */
  onSettled?: (outcome: "enrolled" | "declined" | "unavailable") => void;
};

export function PushPrompt({ moment, onSettled }: PushPromptProps) {
  /* One piece of state rather than three, so deciding to show the prompt is
     a single transition and cannot half apply. `null` means "not decided
     yet", which is distinct from "decided not to show". */
  const [shown, setShown] = useState<{ offer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    /* DECIDED AFTER MOUNT, ON THE CLIENT, AND THERE IS NO OTHER OPTION.
       Both inputs are per device and neither exists on the server: the
       permission state is a browser or operating system fact, and the memory
       is in `localStorage`. Computing this during render would make the
       server produce "unsupported" and the client produce something else,
       which is a hydration mismatch. The lint rule's suggested alternatives
       are for state that could be derived during render; this cannot be. */
    const verdict = offerVerdict({
      moment,
      permission: currentPermission(),
      memory: readMemory(),
      now: Date.now(),
    });
    if (verdict.show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setShown({ offer: verdict.offer });
    } else {
      onSettled?.(verdict.because === "granted" ? "enrolled" : "unavailable");
    }
    /* `onSettled` is deliberately not a dependency: a caller passing an
       inline function would otherwise re-run this on every render and could
       re-show a prompt that was just dismissed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  const accept = useCallback(() => {
    setBusy(true);
    setFailed(null);
    /* NOT AWAITED BEFORE THE CALL. `enrol` requests the permission on its
       first line precisely so the user activation from this click is still
       live when it does. */
    void enrol().then((outcome) => {
      writeMemory(rememberSystemAsked(readMemory()));
      setBusy(false);
      if (outcome.ok) {
        setShown(null);
        onSettled?.("enrolled");
        return;
      }
      if (outcome.reason === "permission_denied") {
        /* The system prompt is now spent. Saying so plainly is better than
           a cheerful dismissal, because the only way back is their own
           settings and they should know that now rather than wonder later
           why nothing arrives. */
        setShown(null);
        onSettled?.("declined");
        return;
      }
      setFailed(
        outcome.reason === "not_configured"
          ? "Notifications are not switched on for this version of Vallo yet. Nothing for you to do."
          : outcome.reason === "unsupported"
            ? "This browser cannot show notifications. Add Vallo to your home screen and try again."
            : "That did not work. You can try again from Settings.",
      );
    });
  }, [onSettled]);

  const decline = useCallback(() => {
    writeMemory(rememberDecline(readMemory(), Date.now()));
    setShown(null);
    onSettled?.("declined");
  }, [onSettled]);

  if (!shown) return null;

  return (
    <section className="nf-glass nf-glass--card" aria-live="polite" data-push-prompt={moment}>
      <h2>Get told, not left guessing</h2>
      {/* The specific thing they will stop missing, in the words for this
          moment. A generic "enable notifications" converts at a fraction of
          this and deserves to. */}
      <p>{shown.offer}</p>
      {/* EXACTLY WHAT WILL BE SENT, BEFORE THE PROMPT AND NOT AFTER.
          A person who knows what they are agreeing to says yes more often
          and regrets it less. */}
      <ul>
        <li>Bookings, messages and money.</li>
        <li>Nothing at night unless it is about your money.</li>
        <li>Off again whenever you like, in Settings.</li>
      </ul>
      {failed ? <p role="status">{failed}</p> : null}
      <div>
        <button type="button" className="nf-btn nf-btn--primary" onClick={accept} disabled={busy}>
          {busy ? "Just a moment" : "Yes, tell me"}
        </button>
        {/* Not now, never Cancel. It is a real answer and it is honoured for
            thirty days. */}
        <button type="button" className="nf-btn nf-btn--ghost" onClick={decline} disabled={busy}>
          Not now
        </button>
      </div>
    </section>
  );
}

export default PushPrompt;

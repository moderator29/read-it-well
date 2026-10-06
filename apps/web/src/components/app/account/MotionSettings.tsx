"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { MotionCopy } from "./settings-copy";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandAssemble } from "@/components/motion/BrandAssemble";
import { STARTUP_SCRIPT } from "@/components/startup/startup-script";
import {
  DEFAULT_MOTION,
  MOTION_EVENT,
  applyMotion,
  readMotion,
  serializeMotion,
  parseMotion,
  writeMotion,
  type MotionLevel,
  type MotionPref,
} from "@/lib/motion/motion-pref";
import { RowButton, RowSwitch, SettingsGroup } from "./rows";
import { IconPlate } from "@/components/ui/IconPlate";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(MOTION_EVENT, onChange);
  return () => window.removeEventListener(MOTION_EVENT, onChange);
}
/* A string snapshot, so React compares by value and never loops. */
const snapshot = () => serializeMotion(readMotion());
const serverSnapshot = () => serializeMotion(DEFAULT_MOTION);

/* The platform's glass objects, not line glyphs (the founder, Track M). */
const LEVEL_ICON: Record<MotionLevel, UiIconName> = {
  cinematic: "sparkle",
  standard: "circle-play",
  calm: "clock",
  off: "circle-pause",
};

/**
 * SETTINGS > APPEARANCE > MOTION (Track M, 25 September 2026).
 *
 * The founder asked for motion settings "with different options". Four
 * levels as a radio group (one tab stop, arrows move and select, the same
 * contract as the theme control), three switches, a live preview that plays
 * the brand assembling at the chosen level, and a way to see the opening
 * again. Everything applies at once and is kept on this device; see
 * lib/motion/motion-pref.ts for what each level does.
 */
export function MotionSettings({ t }: { t: MotionCopy }) {
  const copy = t.settings.appearance;
  const pref = parseMotion(useSyncExternalStore(subscribe, snapshot, serverSnapshot));
  const [take, setTake] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  /* The root may still carry what the server painted from an older cookie,
     or nothing if this device only had the legacy switch: settle it once. */
  useEffect(() => {
    applyMotion(readMotion());
  }, []);

  const levels: { value: MotionLevel; label: string; sub: string }[] = [
    { value: "cinematic", label: copy.motionCinematic, sub: copy.motionCinematicSub },
    { value: "standard", label: copy.motionStandard, sub: copy.motionStandardSub },
    { value: "calm", label: copy.motionCalm, sub: copy.motionCalmSub },
    { value: "off", label: copy.motionOff, sub: copy.motionOffSub },
  ];
  const index = Math.max(0, levels.findIndex((l) => l.value === pref.level));
  const quiet = pref.level === "calm" || pref.level === "off";

  const update = (next: Partial<MotionPref>) => {
    writeMotion({ ...pref, ...next });
    if (next.level) setTake((n) => n + 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = levels.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % levels.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index + last) % levels.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    update({ level: levels[next]!.value });
    refs.current[next]?.focus();
  };

  /* THE OPENING, AGAIN (F1). The sequence is CSS keyed on the root's
     `data-splash="on"`: raising it starts every beat afresh, the door on the
     stylesheet's own clock. But the script that moves the door for a tap
     or a key, and that releases the flag when the door is done
     (`STARTUP_SCRIPT`), ran once at page load and has finished, and the
     page still carries the last run's `data-startup="open"`. So the replay
     does what a first load does: clear the startup flag, raise the splash
     flag, and run the script again.

     The script is inline, and the page's Content Security Policy runs an
     inline script only if it carries the request's nonce. React never hands
     the nonce to a client component (it renders it on the server and blanks
     it on the client), but the browser keeps it on the DOM element's `nonce`
     property for same-origin script to read, so the new script borrows it
     from one of the page's own nonce-carrying scripts. With none on the page
     there is no nonce policy to satisfy and the script runs plainly. The
     script then releases the flag itself (door end, tap, key or its own
     ceiling), so nothing here needs a timer. */
  const replay = () => {
    const root = document.documentElement;
    delete root.dataset.startup;
    root.dataset.splash = "on";
    const script = document.createElement("script");
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
    if (nonce) script.nonce = nonce;
    script.textContent = STARTUP_SCRIPT;
    document.body.appendChild(script);
    script.remove();
  };

  return (
    <SettingsGroup label={copy.motion} note={copy.motionNote}>
      <div className="nf-motion-set">
        {/* The picture is the image; the replay button sits beside it, not
            inside it (axe nested-interactive: an img role may hold nothing
            focusable). */}
        <div className="nf-motion-preview" data-level={pref.level}>
          <span role="img" aria-label={copy.motionPreview} className="inline-flex">
            <BrandAssemble key={`${pref.level}-${take}`} size={44} />
          </span>
          <button
            type="button"
            className="nf-motion-preview__again nf-tap"
            onClick={() => setTake((n) => n + 1)}
            aria-label={copy.motionPreview}
          >
            <UiIcon name="repost" size={16} />
          </button>
        </div>
        <div
          role="radiogroup"
          aria-label={copy.motion}
          onKeyDown={onKeyDown}
          className="nf-motion-levels"
          data-testid="motion-levels"
        >
          {levels.map((level, i) => {
            const on = level.value === pref.level;
            return (
              <button
                key={level.value}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => update({ level: level.value })}
                className="nf-motion-level"
                data-level={level.value}
              >
                <span className="nf-motion-level__glyph" aria-hidden="true">
                  <IconPlate size="sm">
                    <UiIcon name={LEVEL_ICON[level.value]} size={20} />
                  </IconPlate>
                </span>
                <span className="nf-motion-level__name">{level.label}</span>
                <span className="nf-motion-level__sub">{level.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
      <RowSwitch
        icon="sparkle"
        label={copy.motionSplash}
        sub={quiet ? copy.motionNeedsMore : copy.motionSplashSub}
        checked={pref.splash && !quiet}
        disabled={quiet}
        onChange={(next) => update({ splash: next })}
        testId="motion-splash"
      />
      <RowSwitch
        icon="door"
        label={copy.motionDoors}
        sub={quiet ? copy.motionNeedsMore : copy.motionDoorsSub}
        checked={pref.doors && !quiet}
        disabled={quiet}
        onChange={(next) => update({ doors: next })}
        testId="motion-doors"
      />
      <RowSwitch
        icon="sun"
        label={copy.motionAmbient}
        sub={copy.motionAmbientSub}
        checked={pref.ambient}
        onChange={(next) => update({ ambient: next })}
        testId="motion-ambient"
      />
      <RowButton
        icon="repost"
        label={copy.motionReplay}
        onClick={replay}
        disabled={quiet || !pref.splash}
        testId="motion-replay"
      />
    </SettingsGroup>
  );
}

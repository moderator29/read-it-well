"use client";

import { ringBuzz } from "@/lib/ui/feedback";

/**
 * THE RING, while an incoming call screen is open. No audio file: two soft
 * tones drawn with Web Audio every three seconds, so nothing is downloaded
 * for a call that may never come.
 *
 * Silent means silent. Where the browser exposes the audio session (Safari
 * and WKWebView, `navigator.audioSession`), the ring is declared "ambient",
 * which is the category the iPhone's ring/silent switch mutes. Elsewhere the
 * page plays at the media volume the person set. A browser that blocks
 * audio until a tap simply rings without sound: the screen is the ring.
 *
 * Vibration where the device has it (Android), through `lib/ui/feedback.ts`
 * like every other buzz, and not under reduced motion, which asks for less
 * sensory movement, a buzz included. The visual pulse round the avatar
 * follows the same setting in CSS.
 */
export function startRing(opts: { sound?: boolean; vibrate?: boolean } = {}): () => void {
  if (typeof window === "undefined") return () => {};
  let stopped = false;
  let ctx: AudioContext | null = null;

  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  try {
    if (session) session.type = "ambient";
  } catch {
    /* Read-only on some builds. */
  }

  const tone = (at: number, freq: number) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.06, at + 0.04);
    gain.gain.setValueAtTime(0.06, at + 0.36);
    gain.gain.linearRampToValueAtTime(0, at + 0.42);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.45);
  };

  const ring = () => {
    if (stopped) return;
    if (opts.sound !== false) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          ctx ??= new AC();
          void ctx.resume().catch(() => undefined);
          const t = ctx.currentTime + 0.02;
          tone(t, 660);
          tone(t + 0.5, 880);
        }
      } catch {
        /* No audio on this device: the screen is the ring. */
      }
    }
    if (opts.vibrate !== false) ringBuzz(true);
  };

  ring();
  const timer = window.setInterval(ring, 3000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    ringBuzz(false);
    void ctx?.close().catch(() => undefined);
    ctx = null;
  };
}

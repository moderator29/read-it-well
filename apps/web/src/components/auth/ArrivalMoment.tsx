"use client";
import "@/app/css/auth.css";

import Image from "next/image";
import type { Dictionary } from "@vallo/i18n/core";
import { focalSrc } from "./focal-art";

/**
 * THE MOMENT AFTER THE CODE IS ACCEPTED (A17, 30 September).
 *
 * Replaces the plain "Verifying your email" panel on the code path: the
 * account exists now, so the screen says so, by name when the sign-up gave
 * one. The 3D verified seal rises in on its own light, and the line
 * "You're in, Ada."
 * arrives under it. It lasts under a second (`VerifyCodeForm` holds it,
 * then goes through the door to where the person was going).
 *
 * A status for a screen reader (`role="status"`), with the art hidden. Motion
 * is transform, opacity and a stroke drawing in (auth.css, "THE ARRIVAL");
 * reduced motion, Calm and Off show the finished picture at once.
 */
export function ArrivalMoment({ t, name }: { t: Dictionary; name?: string | undefined }) {
  const a = t.authFlow;
  const first = name?.trim();
  return (
    <div className="nf-arrival" role="status" aria-live="polite" data-testid="arrival-moment">
      <div className="nf-arrival__art" aria-hidden="true">
        <span className="nf-arrival__glow" />
        {/* The founder's 3D verified seal (30 September): success in the
            doors' 3D language. It carries its own tick, so the drawn tick
            that stood beside the old glass house is gone. */}
        <span className="nf-arrival__house">
          <Image src={focalSrc("verified")} alt="" width={256} height={256} sizes="160px" priority />
        </span>
      </div>
      <h1 className="nf-auth__title nf-arrival__title">
        {first ? a.youreIn.replace("{name}", first) : a.youreInNoName}
      </h1>
      <p className="nf-auth__sub nf-arrival__body">{a.arrivalBody}</p>
    </div>
  );
}

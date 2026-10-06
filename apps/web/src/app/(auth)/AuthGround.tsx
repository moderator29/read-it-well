"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { groundForPath } from "@/components/auth/ground";

/**
 * THE PICTURE IN THE BOWL (W11, 6 October 2026; reference 7044).
 *
 * The layout draws the bowl once and keeps it across every step, so it cannot
 * be told which page is inside it; the path can (`ground.ts`, with its own
 * test). Decorative: the wrapper is `aria-hidden` in `AuthCap`, and the
 * screen's title names the place.
 *
 * ONE IMAGE AT A TIME, `priority` BECAUSE IT IS THE LARGEST THING ON A SCREEN
 * THAT IS ONLY EVER A FORM. `quality` is low on purpose: the picture sits under
 * a navy scrim and a 70 is indistinguishable from 90 there (the quality the platform allows), at a
 * third of the bytes on a Nigerian mobile connection. `sizes` is the width of
 * the screen because the bowl is full bleed at every width. The key is the
 * ground's name, so moving from the sign-in tower to the sign-up villa
 * crossfades (auth.css, `nf-auth-ground`) rather than swapping.
 */
export function AuthGround() {
  const ground = groundForPath(usePathname() ?? "");
  return (
    <Image
      key={ground.name}
      src={ground.src}
      alt=""
      fill
      priority
      quality={70}
      sizes="100vw"
      draggable={false}
      className="nf-auth-ground"
      data-ground={ground.name}
      style={{ objectPosition: ground.position }}
    />
  );
}

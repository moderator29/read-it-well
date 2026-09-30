"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon3D } from "@/components/ui/Icon3D";

/**
 * THE OBJECT ACROSS THE CURVE (30 September, the founder's 3D glass door).
 * The passcode lock has the member's face in a glowing ring there; the doors
 * have one object in the same ring, chosen by the screen (the layout draws
 * the block once, so the path decides, as `AuthHeroLine` does):
 *
 *   sign up (and its steps)   the house and key, a new place to start
 *   everything else           the Vallo mark
 *
 * Decorative: the ring is `aria-hidden` in `AuthCurveBlock`, and the title
 * under it names the screen.
 */
export function AuthFocal() {
  const path = usePathname() ?? "";
  if (path.startsWith("/sign-up") && !path.startsWith("/sign-up/verify")) {
    return <Icon3D name="rent" size={64} priority className="nf-slate-focal__icon" />;
  }
  return (
    <Image
      src="/brand/vallo-mark.png"
      alt=""
      width={614}
      height={587}
      sizes="48px"
      priority
      className="nf-slate-focal__mark"
    />
  );
}

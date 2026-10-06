"use client";

import { useAuthPath } from "./useAuthPath";
import { ObjectArt } from "@/components/auth/ObjectArt";
import { focalForPath } from "@/components/auth/focal-art";
import "@/app/css/auth.css";

/**
 * THE OBJECT ACROSS THE EDGE OF THE ISLAND on every door (the founder's 3D
 * door of 30 September, kept; its material is the two-tier set since D29). The
 * layout draws the island once, so the path decides which object sits on it
 * (`focal-art.ts`, with its own test). Decorative: it is `aria-hidden` in the
 * layout, and the title under it names the screen.
 *
 * Keyed by the object's name so a step that changes it (the password to the
 * envelope) lands the new one with the settle rather than swapping in place.
 */
export function AuthFocal() {
  const art = focalForPath(useAuthPath());
  return (
    <span key={art.name} className="nf-auth-focal__object" data-focal={art.name}>
      <ObjectArt name={art.name} size={art.size * 2} priority />
    </span>
  );
}

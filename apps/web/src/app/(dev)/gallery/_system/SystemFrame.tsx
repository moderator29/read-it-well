"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { Segmented } from "@/components/ui/Segmented";
import { applyMotion, DEFAULT_MOTION, type MotionLevel } from "@/lib/motion/motion-pref";
import { GALLERY_FAMILIES } from "./families";
import "./gallery-system.css";

/**
 * THE FRAME EVERY SYSTEM-GALLERY ROUTE SITS IN (B-33).
 *
 * A title, a way back to `/gallery`, the other families, and the two switches a
 * reviewer needs to judge a primitive honestly: the THEME (Dark is the default;
 * Light is the member's choice) and the MOTION level (Full, or Calm and Off,
 * which are what reduced motion collapses to; the operating system's own
 * setting cannot be forced from a page, so this is the honest stand-in).
 *
 * BOTH SWITCHES ONLY TOUCH THIS TAB'S ROOT ELEMENT. Nothing is written to the
 * `nf_theme` cookie or the motion cookie, so the real preference is never
 * changed by looking at a board, and a reload returns to it.
 *
 * It reads the root back through `useSyncExternalStore` rather than keeping its
 * own copy, so the switch always says what the page actually is, including
 * after something else changes the attribute.
 */

function subscribeRoot(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
  return () => observer.disconnect();
}

export type RootTheme = "dark" | "light";

/** The page's theme as the root element says it. Dark on the server. */
export function useRootTheme(): RootTheme {
  return useSyncExternalStore(
    subscribeRoot,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

function useRootMotion(): MotionLevel {
  return useSyncExternalStore(
    subscribeRoot,
    () => {
      const level = document.documentElement.dataset.motion;
      return level === "calm" || level === "off" || level === "cinematic" ? level : "standard";
    },
    () => "standard",
  );
}

export function setRootTheme(theme: RootTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function SystemFrame({
  slug,
  title,
  lede,
  children,
}: {
  /** The family's directory name, to mark it in the navigation. */
  slug: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const theme = useRootTheme();
  const motion = useRootMotion();
  return (
    <main className="nf-sg">
      <p className="nf-sg-note">
        <Link href="/gallery">All galleries</Link>
      </p>
      <h1 className="nf-h2">{title}</h1>
      <p className="nf-sg-lede">{lede}</p>

      <div className="nf-sg-bar">
        <div className="nf-sg-bar__group">
          <span className="nf-sg-label">Theme</span>
          <Segmented
            size="sm"
            semantics="radio"
            label="Theme for this tab"
            value={theme}
            onChange={setRootTheme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </div>
        <div className="nf-sg-bar__group">
          <span className="nf-sg-label">Motion</span>
          <Segmented
            size="sm"
            semantics="radio"
            label="Motion level for this tab"
            value={motion === "cinematic" ? "standard" : motion}
            onChange={(level) => applyMotion({ ...DEFAULT_MOTION, level })}
            options={[
              { value: "standard", label: "Full" },
              { value: "calm", label: "Calm" },
              { value: "off", label: "Off" },
            ]}
          />
        </div>
      </div>

      <nav aria-label="Gallery families">
        <ul className="nf-sg-nav">
          {GALLERY_FAMILIES.map((family) => (
            <li key={family.slug}>
              <Link href={`/gallery/${family.slug}`} aria-current={family.slug === slug ? "page" : undefined}>
                {family.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </main>
  );
}

/** One titled block of the board: what it shows, then the specimens. */
export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="nf-sg-section">
      <h2 className="nf-h3">{title}</h2>
      {note ? <p className="nf-sg-note">{note}</p> : null}
      {children}
    </section>
  );
}

/** A labelled specimen: a structural caption above the thing itself. */
export function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={["nf-sg-spec", className ?? ""].filter(Boolean).join(" ")}>
      <p className="nf-sg-label">{label}</p>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";

/**
 * THE CODE A PERSON READS OUT OVER THE PHONE.
 *
 * `VL-` plus six characters, minted by the database the moment a listing goes
 * live. GOVERNING-08 screen four draws the panel and GOVERNING-12 screen four
 * draws the same string as the thing a searcher typed.
 *
 * TWO THINGS ARE TRANSLATED RATHER THAN COPIED FROM THE RENDER, and both are
 * recorded rather than quietly changed:
 *
 * 1. The render prints `VL-7K4M-92`, which is eight body characters with an
 *    inner hyphen. Ours is six characters and one hyphen, because the brief
 *    fixes the format and a render is not a specification.
 * 2. The render puts the code on the SENT FOR REVIEW screen. Ours does not
 *    exist yet at that moment: a code is a public handle and a listing in
 *    review has no public existence. The wizard says when it arrives instead
 *    of drawing an empty box, which is the honest version of the same panel.
 *
 * The copy control is `Button`, which is a rounded rectangle on
 * `--nf-radius-control` and has no capsule variant, so the shape law holds
 * here by construction rather than by inspection.
 */

type Copy = Dictionary["listingReference"];

/**
 * The code itself, set the way a code should be set: wide, monospaced digits,
 * and never wrapped. `/profile/application` already prints the agent
 * reference this way and this is the same house style one size up.
 */
export function ListingCodeText({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span className={`nf-numeric whitespace-nowrap tracking-[0.18em] ${className}`} data-testid="listing-code">
      {code}
    </span>
  );
}

/**
 * The compact form, for a page that is about the property rather than about
 * the code: one line, a label, the code, and a way to take it with you.
 */
export function ListingCodeRow({ code, copy }: { code: string; copy: Copy }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The code is on screen and can be read straight off. */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-sm" data-testid="listing-code-row">
      <span className="nf-caption text-[var(--nf-content-muted)]">{copy.label}</span>
      <ListingCodeText code={code} className="nf-body font-semibold" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leadingIcon="document"
        onClick={() => void onCopy()}
        data-testid="listing-code-row-copy"
      >
        {copied ? copy.copied : copy.copy}
      </Button>
    </div>
  );
}

/**
 * The full panel: the label, the code, what it is for, and a copy control.
 *
 * `heading` chooses between "Your listing ID" on the lister's own surfaces and
 * "Listing ID" on a surface a stranger is reading.
 */
export function ListingCodePanel({
  code,
  copy,
  heading = "yours",
}: {
  code: string;
  copy: Copy;
  heading?: "yours" | "neutral";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* A refused clipboard is not an error worth a sentence: the code is on
         the screen in the largest type on it and can be read straight off. */
    }
  };

  return (
    <div className="nf-card flex flex-col items-center gap-sm p-lg text-center" data-testid="listing-code-panel">
      <p className="nf-caption text-[var(--nf-content-muted)]">
        {heading === "yours" ? copy.yours : copy.label}
      </p>
      <ListingCodeText code={code} className="nf-h3" />
      <p className="nf-body-sm text-[var(--nf-content-muted)]">{copy.explain}</p>
      <Button
        type="button"
        variant="secondary"
        leadingIcon="document"
        onClick={() => void onCopy()}
        data-testid="listing-code-copy"
      >
        {copied ? copy.copied : copy.copy}
      </Button>
    </div>
  );
}

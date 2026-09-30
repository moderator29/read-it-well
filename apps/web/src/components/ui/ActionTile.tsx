"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The action tile (reference 55, kind 15): a tinted rounded square holding a
 * glyph, with its word underneath. Call, Share, Download, Delete: the row of
 * direct actions on a listing, a booking or a document. The tone's soft fill
 * at rest; hover and press fill the plate with the tone and turn the glyph
 * white (`.nf-action-tile`, controls.css). `danger` is the red one and is
 * only ever the destructive action.
 *
 * A link when it has `href`, a button otherwise. The whole tile is the
 * target (at least 64 by 76), and the word is its accessible name.
 */
export type ActionTileTone = "brand" | "success" | "danger";

type Common = {
  icon: UiIconName;
  label: string;
  tone?: ActionTileTone;
  className?: string;
  "data-testid"?: string;
};

export type ActionTileProps =
  | (Common & { href: string; onClick?: never; disabled?: never; external?: boolean })
  | (Common & { href?: never; onClick?: MouseEventHandler<HTMLButtonElement>; disabled?: boolean; external?: never });

export function actionTileClass(tone: ActionTileTone = "brand", className?: string) {
  return ["nf-action-tile", tone === "brand" ? "" : `nf-action-tile--${tone}`, className ?? ""].filter(Boolean).join(" ");
}

export function ActionTile(props: ActionTileProps) {
  const { icon, label, tone = "brand", className } = props;
  const inner = (
    <>
      <span className="nf-action-tile__plate" aria-hidden="true">
        <UiIcon name={icon} size={24} />
      </span>
      <span>{label}</span>
    </>
  );
  if (props.href !== undefined) {
    return props.external ? (
      <a href={props.href} className={actionTileClass(tone, className)} data-testid={props["data-testid"]} rel="noopener noreferrer" target="_blank">
        {inner}
      </a>
    ) : (
      <Link href={props.href} className={actionTileClass(tone, className)} data-testid={props["data-testid"]}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={actionTileClass(tone, className)}
      data-testid={props["data-testid"]}
    >
      {inner}
    </button>
  );
}

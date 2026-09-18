"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, Surface, TYPE } from "@/components/app/Screen";
import { MAX_MOVE_KOBO, MIN_MOVE_KOBO, parseNairaToKobo } from "@/lib/wallet/schema";
import { useClientMount } from "@/lib/ui/client-mount";
import { RollingAmount } from "./RollingAmount";

/**
 * RECEIVE: who you are, where money lands, and a request to share.
 *
 * A send on Vallo goes to the email on the recipient's account, so the one
 * fact a person needs in order to be paid is that email, said plainly. The
 * handle sits above it because it is how people know each other here; it is
 * not the address, and the card does not pretend it is.
 *
 * The request is a link into /wallet/send with the recipient and, if given,
 * the amount and note already in the form. Nothing is created on the server:
 * a request is a message between two people, and the money only moves when
 * the other person confirms it on their own screen. Web Share where the
 * browser has it, the clipboard otherwise, and the link itself is shown so
 * neither is the only way.
 */

type ReceiveCopy = Dictionary["walletReceive"];

export function ReceiveCard({
  email,
  handle,
  locale,
  copy,
}: {
  email: string;
  /** The claimed handle without its @, or null when none is claimed. */
  handle: string | null;
  locale: Locale;
  copy: ReceiveCopy;
}) {
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  /* The page's own origin, read on the client once it has mounted. Rendering
     the link on the server would need the host from a header, and a link
     built from the wrong host is worse than a relative one shown late. The
     mount latch is the platform's shared one, so server and first client
     render agree and nothing mismatches on hydration. */
  const mounted = useClientMount();
  const origin = mounted ? window.location.origin : "";

  const kobo = parseNairaToKobo(amountText);
  const amountOk = kobo !== null && kobo >= MIN_MOVE_KOBO && kobo <= MAX_MOVE_KOBO;
  const amountGiven = amountText.trim().length > 0;

  const params = new URLSearchParams({ to: email });
  if (amountOk && kobo !== null) params.set("amount", String(Math.round(kobo / 100)));
  if (note.trim()) params.set("note", note.trim().slice(0, 140));
  const link = `${origin}/wallet/send?${params.toString()}`;

  const text =
    amountOk && kobo !== null
      ? copy.shareText.replace("{amount}", formatMoney(kobo, locale)).replace("{link}", link)
      : copy.shareTextNoAmount.replace("{link}", link);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard refused. The link is drawn `user-select: all` below, so
         there is still a way to take it and nothing here needs to shout. */
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Vallo", text });
      } catch {
        /* Dismissed the share sheet, which is not an error. */
      }
      return;
    }
    await copyLink();
  };

  return (
    <div>
      <Surface>
        <p className={TYPE.label}>{copy.handleLabel}</p>
        {handle ? (
          <p className={`mt-inline-tight ${TYPE.sectionTitle}`}>@{handle}</p>
        ) : (
          <p className={`mt-inline-tight ${TYPE.rowTitle}`}>
            {copy.noHandle}{" "}
            <Link
              href="/profile"
              className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
            >
              {copy.claimHandle}
            </Link>
          </p>
        )}

        <p className={`mt-block ${TYPE.label}`}>{copy.emailLabel}</p>
        <p className={`mt-inline-tight ${TYPE.rowTitle} [overflow-wrap:anywhere] [user-select:all]`}>
          {email}
        </p>
        <p className={`mt-inline ${TYPE.rowMeta}`}>{copy.where.replace("{email}", email)}</p>
      </Surface>

      <Surface className="mt-group">
        <p className={TYPE.sectionTitle}>{copy.requestTitle}</p>

        {amountGiven && (
          <p className="mt-row text-center">
            <RollingAmount
              minor={kobo ?? 0}
              locale={locale}
              className="nf-h1 nf-odometer-figure tracking-tight"
              koboClassName="text-[0.5em] font-semibold text-[var(--nf-content-muted)]"
            />
          </p>
        )}

        <div className="mt-row space-y-row">
          <TextField
            label={copy.amountLabel}
            optionalText={copy.amountOptional}
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            error={amountGiven && !amountOk ? "Enter a valid naira amount, e.g. 5,000." : undefined}
            clearable="Clear the amount"
            onClear={() => setAmountText("")}
          />
          <TextField
            label={copy.noteLabel}
            optionalText={copy.amountOptional}
            name="note"
            type="text"
            autoComplete="off"
            maxLength={140}
            placeholder={copy.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <div className="mt-block grid grid-cols-2 gap-row">
          <Button
            type="button"
            variant="primary"
            leadingIcon="share"
            disabled={amountGiven && !amountOk}
            onClick={() => void share()}
          >
            {copy.share}
          </Button>
          <Button
            type="button"
            variant="secondary"
            leadingIcon="link"
            disabled={amountGiven && !amountOk}
            onClick={() => void copyLink()}
          >
            {copied ? copy.copied : copy.copy}
          </Button>
        </div>

        {/* The link itself, so a person who cannot share or copy can still
            read it out or select it. One tap takes the whole string. */}
        <p className="mt-row flex items-start gap-inline-tight">
          <UiIcon name="link" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-content-muted)]" />
          <span className="nf-caption min-w-0 font-mono text-[var(--nf-content-muted)] [overflow-wrap:anywhere] [user-select:all]">
            {link}
          </span>
        </p>
      </Surface>
    </div>
  );
}

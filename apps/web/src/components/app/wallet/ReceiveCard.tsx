"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import { MAX_MOVE_KOBO, MIN_MOVE_KOBO, parseNairaToKobo } from "@/lib/wallet/schema";
import { useClientMount } from "@/lib/ui/client-mount";
import { RollingAmount } from "./RollingAmount";
import { walletRequestLink } from "@/lib/wallet/request-link";
import { panelClass } from "@/components/ui/Panel";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";

/**
 * RECEIVE: who you are, where money lands, and a request to share.
 *
 * In the send register: glass sections with a glyph head each, the same
 * anatomy as the send page's recipient and amount blocks, so the two halves
 * of one movement read as one design.
 *
 * A send on Vallo goes to the email on the recipient's account, so the one
 * fact a person needs in order to be paid is that email, said plainly, to its
 * owner on this screen. The request is a link into /wallet/send with the
 * requester's handle (never the email) and, if given, the amount and note
 * already in the form. Nothing is created on the server: a
 * request is a message between two people, and the money only moves when
 * the other person confirms it on their own screen.
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
  /* The page's own origin, read on the client once it has mounted, so the
     server and first client render agree and nothing mismatches. */
  const mounted = useClientMount();
  const origin = mounted ? window.location.origin : "";

  const kobo = parseNairaToKobo(amountText);
  const amountOk = kobo !== null && kobo >= MIN_MOVE_KOBO && kobo <= MAX_MOVE_KOBO;
  const amountGiven = amountText.trim().length > 0;

  /* The requester's handle, never their email: the link is pasted into
     groups. See lib/wallet/request-link.ts. */
  const link = walletRequestLink({
    origin,
    handle,
    amountNaira: amountOk && kobo !== null ? Math.round(kobo / 100) : null,
    note,
  });

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
      /* Clipboard refused. The link is drawn `user-select: all` below. */
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
    <div className="space-y-group">
      <section className={panelClass({ variant: "card", className: "p-card-sm" })} aria-labelledby="nf-receive-identity">
        <Head id="nf-receive-identity" icon="user" title={copy.identityTitle} sub={copy.identitySub} />
        <dl className="mt-row">
          <div className="flex items-baseline justify-between gap-md">
            <dt className={TYPE.label}>{copy.handleLabel}</dt>
            <dd className={`text-right ${TYPE.rowTitle}`}>
              {handle ? (
                `@${handle}`
              ) : (
                <>
                  <span className="text-[var(--nf-content-muted)]">{copy.noHandle}</span>{" "}
                  <Link
                    href="/profile"
                    className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                  >
                    {copy.claimHandle}
                  </Link>
                </>
              )}
            </dd>
          </div>
          <div className="mt-row border-t border-[var(--nf-divider)] pt-row">
            <dt className={TYPE.label}>{copy.emailLabel}</dt>
            <dd className={`mt-inline-tight ${TYPE.rowTitle} [overflow-wrap:anywhere] [user-select:all]`}>
              {email}
            </dd>
          </div>
        </dl>
        <p className={`mt-row ${TYPE.rowMeta}`}>{copy.where.replace("{email}", email)}</p>
      </section>

      <section className={panelClass({ variant: "card", className: "p-card-sm" })} aria-labelledby="nf-receive-request">
        <Head id="nf-receive-request" icon="share" title={copy.requestTitle} sub={copy.requestSub} />

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
      </section>
    </div>
  );
}

function Head({ id, icon, title, sub }: { id: string; icon: UiIconName; title: string; sub: string }) {
  return (
    <div className="nf-money-sec__head">
      <IconPlate size="md">
        <UiIcon name={icon} size={ICON_PLATE_GLYPH.md} />
      </IconPlate>
      <div className="min-w-0">
        <h2 id={id} className={TYPE.rowTitle}>
          {title}
        </h2>
        <p className={TYPE.rowMeta}>{sub}</p>
      </div>
    </div>
  );
}

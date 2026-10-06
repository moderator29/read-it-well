"use client";

import { useId, useRef, useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { loadBrowserClient } from "@/lib/supabase/load-client";
import { IconPlate } from "@/components/ui/IconPlate";
import { lineGlyphFor } from "@/design-system/icons/glass-to-line";

/**
 * ONE OF THE BIG UPLOAD CARDS ON `GOVERNING-04` SCREEN TWO AND `GOVERNING-05`
 * SCREEN TWO.
 *
 * A glass object on the left, a title, one supporting line, and a state that
 * changes as the file goes up. It is the door's anatomy at a taller height,
 * for the same reason the choice rows are the door's anatomy at a shorter one:
 * one object, one set of rules about how it is drawn.
 *
 * THE UPLOAD IS REAL AND IT GOES STRAIGHT FROM THE BROWSER INTO THE PRIVATE
 * BUCKET, under `<auth uid>/<batch>/<slot>.<ext>`, which storage RLS restricts
 * to this user's own folder. The slot counts as filled only once the object
 * exists and a real path came back, so nobody submits believing a document
 * went through when it did not. That rule and this path shape are
 * `ApplyWizard`'s, unchanged, because a second upload convention would be a
 * second set of objects a reviewer has to know how to find.
 *
 * THE PATH IS NEVER PRINTED AND NEVER LOGGED. The card says which FILE it is
 * holding, by the name the person's own device gave it, and nothing else.
 */

const DOCUMENT_BUCKET = "agent-documents";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** The file extension to store under, from the type rather than the name. */
function extensionFor(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

/** A stable folder per form session, so retries do not scatter objects. */
export function newBatchId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `b-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export type UploadState = {
  path: string;
  fileName: string;
};

export function UploadCard({
  t,
  object,
  title,
  body,
  slot,
  batchId,
  value,
  onChange,
  accept = "image/png,image/jpeg,application/pdf",
  error,
}: {
  t: Dictionary;
  object: BrandIconName;
  title: string;
  body: string;
  /** The slot's name, which becomes the object's file name in the bucket. */
  slot: string;
  batchId: string;
  value: UploadState | null;
  onChange(next: UploadState | null): void;
  accept?: string;
  error?: string | undefined;
}) {
  const copy = t.supply.register;
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setFailure(null);

    if (file.size > MAX_DOCUMENT_BYTES) {
      setFailure(copy.fileTooBig);
      return;
    }

    setBusy(true);
    try {
      const supabase = await loadBrowserClient();
      if (!supabase) {
        setFailure(copy.fileFailed);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFailure(copy.signInFirst);
        return;
      }
      /* A new path for every file chosen, never an overwrite (SEC-12): a filed
         document is fixed, so re-choosing is a new object and the submit files
         whichever path is current. */
      const path = `${user.id}/${batchId}/${slot}-${crypto.randomUUID()}.${extensionFor(file)}`;
      const upload = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) {
        setFailure(copy.fileFailed);
        return;
      }
      if (value?.path && value.path !== path) {
        /* Best effort: remove the slot's previous upload. The storage policy
           allows it only while that object has not been filed. */
        void supabase.storage.from(DOCUMENT_BUCKET).remove([value.path]);
      }
      onChange({ path, fileName: file.name });
    } catch {
      setFailure(copy.fileFailed);
    } finally {
      setBusy(false);
    }
  }

  const state = busy ? copy.uploading : value ? copy.fileReady : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="nf-door"
        data-on={value ? true : undefined}
        aria-describedby={`${inputId}-state`}
      >
        <IconPlate size="md" tone={value ? "success" : "neutral"} className="nf-door__mark">
          <UiIcon name={lineGlyphFor(object)} size={20} />
        </IconPlate>
        <span className="min-w-0 flex-1 text-left">
          <span className={`block ${TYPE.rowTitle}`}>{title}</span>
          <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{body}</span>
        </span>
        <UiIcon
          name={value ? "verified-badge" : "chevron-right"}
          size={value ? "md" : "sm"}
          className={
            value
              ? "shrink-0 text-[var(--nf-brand-primary)]"
              : "shrink-0 text-[var(--nf-content-muted)]"
          }
        />
      </button>

      <input
        ref={input}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      {/*
        THE STATE IN WORDS, ALWAYS, AND THE FILE NAME BESIDE IT.
        A tick on the card is not enough: "ready to send" and the name of the
        file are what tell somebody they chose the right one, and a person who
        cannot see the tick gets exactly the same news.
      */}
      <p id={`${inputId}-state`} className={`mt-xs ${TYPE.rowMeta}`} aria-live="polite">
        {state ? `${state}${value ? `: ${value.fileName}` : ""}` : copy.addFile}
      </p>

      {failure || error ? (
        <p role="alert" className="nf-arrive mt-xs text-[length:var(--nf-text-caption)] font-medium text-[var(--nf-state-error)]">
          {failure ?? error}
        </p>
      ) : null}
    </div>
  );
}

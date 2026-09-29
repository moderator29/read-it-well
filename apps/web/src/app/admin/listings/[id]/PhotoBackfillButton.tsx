"use client";

import { useState, useTransition } from "react";
import { getDictionary } from "@vallo/i18n";
import { runPhotoBackfill } from "@/lib/photo-hash/backfill-action";

const DESK = getDictionary("en").trustVisible.desk;

/** V-45: hash the next batch of old photographs, so the desk can compare them. */
export function PhotoBackfillButton() {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-xs">
      <button
        type="button"
        disabled={pending}
        className="nf-btn nf-btn--glass nf-btn--sm"
        onClick={() =>
          startTransition(async () => {
            const result = await runPhotoBackfill();
            setNote(
              result.ok
                ? { ok: true, text: DESK.photosBackfilled.replace("{count}", String(result.data.hashed)) }
                : { ok: false, text: result.error },
            );
          })
        }
      >
        {pending ? DESK.photosBackfilling : DESK.photosBackfill}
      </button>
      {note && (
        <span role={note.ok ? "status" : "alert"} className="nf-caption">
          {note.text}
        </span>
      )}
    </span>
  );
}

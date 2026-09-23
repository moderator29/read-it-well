"use client";

import { useRef, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";
import { fileHeldPaymentDocument, fileHeldPaymentFact } from "@/lib/escrow/actions";
import {
  ESCROW_FACTS,
  EVIDENCE_BUCKET,
  EVIDENCE_CAPTION_MAX,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  evidenceObjectPath,
  factNeeds,
  isEvidenceMimeType,
  nairaToKobo,
  type EscrowFact,
} from "@/lib/escrow/copy";

/**
 * THE CLIENT THAT PICKS A FILE AND UPLOADS IT, AND THE ONE THAT STATES A FACT.
 *
 * Everything behind this shipped on 22 September and none of it could be
 * reached: the server action, the private `escrow-evidence` bucket, the check
 * constraints and the append-only trigger all existed with nothing in front of
 * them. This is the front.
 *
 * EVIDENCE IS FILES AND FACTS, NEVER OPINIONS, and the shape of this component
 * is that sentence. There are exactly two things a person can add. A FILE,
 * which is a photograph or a PDF, with a caption capped at two hundred
 * characters whose label asks what the file SHOWS rather than what the person
 * thinks of it. A FACT, chosen from thirteen closed values that either
 * happened or did not, four of which carry the day they happened on and one of
 * which carries an amount. There is no free text field anywhere else on this
 * component, and that is not an omission.
 *
 * THE TWO HUNDRED CHARACTERS ARE WHERE AN OPINION WOULD OTHERWISE GO. It is
 * capped in the schema, capped in the database by a check constraint, and
 * capped here by `maxLength` so the person sees the limit rather than meets
 * it. The counter appears only in the last fifty characters, because a counter
 * that is always on is a counter that is asking for brevity rather than
 * reporting a limit.
 *
 * THE UPLOAD GOES STRAIGHT FROM THE BROWSER TO THE BUCKET and the row follows,
 * which is the pattern the message thread already uses. The bucket is private
 * and the storage policy limits writes to `<agreement>/<the person filing>/`,
 * so the path is the permission. The path is built by `evidenceObjectPath` and
 * the server action re-derives its prefix before it will let a row point at
 * it.
 *
 * A HALF-DONE UPLOAD IS SAID OUT LOUD. The upload and the row are two steps
 * and either can fail. When the bytes land and the row is refused, the person
 * is told the file was not filed, and the action removes the object it can
 * prove nothing points at. When the bytes do not land, nothing is claimed at
 * all. What is never done is reporting success because the first half worked.
 *
 * ONE ACTION AT A TIME, which is the same rule the controls above obey: two
 * taps is the shape of every duplicate ever filed, and the database answering
 * `duplicate` correctly is not a reason to let somebody send it twice.
 *
 * WHAT IS NOT OFFERED. No delete. Nothing filed can be withdrawn, by anybody,
 * including the person who filed it: the table is append-only by trigger and
 * the bucket carries no delete policy for any role. A dispute where evidence
 * can be taken back after the other side has seen it is not a record.
 */

const ACCEPT = EVIDENCE_MIME_TYPES.join(",");

export function EvidenceFiler({
  id,
  authorId,
}: {
  id: string;
  authorId: string;
}): React.ReactElement {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  const [fact, setFact] = useState<EscrowFact | "">("");
  const [happenedOn, setHappenedOn] = useState("");
  const [amount, setAmount] = useState("");

  const needs = fact ? factNeeds(fact) : "nothing";

  function reset(): void {
    setPicked(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function pick(file: File | undefined): void {
    setMessage(null);
    setDone(null);
    if (!file) return;
    if (!isEvidenceMimeType(file.type)) {
      setMessage("Attach a photograph or a PDF. Nothing was filed.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > EVIDENCE_MAX_BYTES) {
      setMessage("Keep it under 10MB. Nothing was filed.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPicked(file);
  }

  function sendFile(): void {
    const file = picked;
    if (!file || !isEvidenceMimeType(file.type)) return;
    const mimeType = file.type;

    setMessage(null);
    setDone(null);
    start(async () => {
      const path = evidenceObjectPath({
        escrowId: id,
        authorId,
        fileName: file.name,
        unique: crypto.randomUUID(),
      });

      try {
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(EVIDENCE_BUCKET)
          .upload(path, file, { contentType: mimeType, upsert: false });
        if (error) {
          setMessage("That file did not finish uploading, so nothing was filed.");
          return;
        }
      } catch {
        setMessage("That file did not finish uploading, so nothing was filed.");
        return;
      }

      const result = await fileHeldPaymentDocument({
        id,
        storagePath: path,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
      });

      if (result.ok) {
        reset();
        setDone("Filed. Both of you can see it and it cannot be changed.");
      } else {
        setMessage(result.error ?? "That was not filed, and nothing was changed.");
      }
    });
  }

  function sendFact(): void {
    if (!fact) return;
    setMessage(null);
    setDone(null);

    let amountMinor: number | null = null;
    if (needs === "amount") {
      amountMinor = nairaToKobo(amount);
      if (amountMinor === null) {
        setMessage("Give the amount in naira, as a number. Nothing was filed.");
        return;
      }
    }
    if (needs === "date" && !happenedOn) {
      setMessage("Say which day that was. Nothing was filed.");
      return;
    }

    start(async () => {
      const result = await fileHeldPaymentFact({
        id,
        fact,
        happenedOn: needs === "date" ? happenedOn : null,
        amountMinor,
      });
      if (result.ok) {
        setFact("");
        setHappenedOn("");
        setAmount("");
        setDone("Filed. Both of you can see it and it cannot be changed.");
      } else {
        setMessage(result.error ?? "That was not filed, and nothing was changed.");
      }
    });
  }

  const captionLeft = EVIDENCE_CAPTION_MAX - caption.length;

  return (
    <div className="nf-esc-filer">
      {/* ------------------------------------------------------------ a file */}
      <div className="nf-esc-filer-block">
        <p className="nf-esc-filer-head">Add a document or a photograph</p>
        <p className="nf-esc-line">
          A receipt, an agreement, a photograph of the property, or a screenshot of what was
          said. Up to 10MB. Once it is filed neither of you can change or remove it.
        </p>

        <input
          ref={fileRef}
          id={`evidence-file-${id}`}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <div className="nf-esc-actions">
          <button
            type="button"
            className="nf-esc-action"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {picked ? "Choose a different file" : "Choose a file"}
          </button>
          {picked ? (
            <button type="button" className="nf-esc-action" disabled={pending} onClick={reset}>
              Remove
            </button>
          ) : null}
        </div>

        {picked ? (
          <div className="nf-esc-when">
            <p className="nf-esc-filed-what">{picked.name}</p>
            <label className="nf-esc-when-label" htmlFor={`evidence-caption-${id}`}>
              What this file shows
            </label>
            <textarea
              id={`evidence-caption-${id}`}
              className="nf-esc-field"
              rows={2}
              maxLength={EVIDENCE_CAPTION_MAX}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="The receipt for the agency fee, dated 3 October"
            />
            {captionLeft <= 50 ? (
              <p className="nf-esc-line" aria-live="polite">
                {captionLeft} characters left.
              </p>
            ) : null}
            <button
              type="button"
              className="nf-esc-action"
              disabled={pending}
              onClick={sendFile}
            >
              File this
            </button>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ a fact */}
      <div className="nf-esc-filer-block">
        <p className="nf-esc-filer-head">Or state something that happened</p>
        <p className="nf-esc-line">
          Pick the one that fits. These are the things that can be checked, so they are the ones
          that help.
        </p>

        <label className="nf-esc-when-label" htmlFor={`evidence-fact-${id}`}>
          What happened
        </label>
        <select
          id={`evidence-fact-${id}`}
          className="nf-esc-field"
          value={fact}
          onChange={(event) => {
            setFact(event.target.value as EscrowFact | "");
            setHappenedOn("");
            setAmount("");
            setMessage(null);
            setDone(null);
          }}
        >
          <option value="">Choose one</option>
          {ESCROW_FACTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.line}
            </option>
          ))}
        </select>

        {needs === "date" ? (
          <>
            <label className="nf-esc-when-label" htmlFor={`evidence-date-${id}`}>
              Which day
            </label>
            <input
              id={`evidence-date-${id}`}
              type="date"
              className="nf-esc-field"
              value={happenedOn}
              onChange={(event) => setHappenedOn(event.target.value)}
            />
          </>
        ) : null}

        {needs === "amount" ? (
          <>
            <label className="nf-esc-when-label" htmlFor={`evidence-amount-${id}`}>
              How much, in naira
            </label>
            <input
              id={`evidence-amount-${id}`}
              type="text"
              inputMode="decimal"
              className="nf-esc-field nf-numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="250000"
            />
          </>
        ) : null}

        <div className="nf-esc-actions">
          <button
            type="button"
            className="nf-esc-action"
            disabled={pending || !fact}
            onClick={sendFact}
          >
            File this
          </button>
        </div>
      </div>

      {message ? (
        <p className="nf-esc-line" role="alert">
          {message}
        </p>
      ) : null}
      {done ? (
        <p className="nf-esc-line" role="status">
          {done}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * A person's identity document, read inside Vallo.
 *
 * WHAT THIS REPLACES, ON THREE DESKS AT ONCE. `/admin/kyc`,
 * `/admin/businesses` and `/admin/agents` each rendered a signed Supabase
 * Storage URL in an anchor with `target="_blank"`. Tapping a NIN, a passport
 * or a CAC certificate opened it on `<project>.supabase.co`: a third party
 * origin, a tab that is not ours, a content security policy that is not ours,
 * an entry in the browser's history and a copy in its disc cache, and a live
 * signed URL sitting in our own DOM for the next ten minutes where anything
 * could read it and anybody could forward it.
 *
 * Nobody leaves Vallo. Least of all carrying somebody else's passport.
 *
 * The bytes now come from `/api/documents/<id>` on our own origin, behind
 * `requireAdmin`, uncached, with one audit row per view, and the signed URL
 * is never minted for a browser at all.
 *
 * WHAT IS HONESTLY NOT DONE YET, SAID HERE RATHER THAN DISCOVERED LATER. An
 * image is drawn in this sheet. A PDF IS NOT, and there is no in-app renderer
 * on this platform today. The sweep's answer is `pdf.js` drawn to a canvas
 * (`docs/research/ON_PLATFORM_SWEEP.md` section 8), and both routes to it
 * need a content security policy change that belongs to whoever is holding
 * `lib/security/csp.ts`: a same-origin frame needs `frame-src 'self'`, and
 * pdf.js needs a worker source. Neither was taken unilaterally.
 *
 * So a PDF is offered as a file from OUR origin instead, which is a smaller
 * departure than the one this replaces (no other company's page, no other
 * company's URL bar, no signed link to forward) and is still a departure. The
 * seam is `DocumentCanvas` below and it is one component wide.
 */

/** How the sheet should draw this one. Decided from the stored extension. */
export type DocumentMediaKind = "image" | "pdf" | "file";

const WORDS: Record<DocumentMediaKind, string> = {
  image: "Photograph",
  pdf: "PDF",
  file: "File",
};

function DocumentCanvas({
  documentId,
  media,
  title,
}: {
  documentId: string;
  media: DocumentMediaKind;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const [upright, setUpright] = useState(0);
  const source = `/api/documents/${documentId}`;

  if (media === "image") {
    if (failed) {
      return (
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">
          The file could not be reached just now. Close this and open it again.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-xs">
        <div className="flex items-center gap-inline">
          <button
            type="button"
            onClick={() => setUpright((turn) => (turn + 90) % 360)}
            className="nf-chip text-[var(--nf-text-overline)]"
          >
            Turn it
          </button>
          <span className="nf-overline">
            A photographed document is often sideways. Turning it here changes nothing
            that is stored.
          </span>
        </div>
        <div className="overflow-auto rounded-[var(--nf-radius-control)] bg-[var(--nf-surface-sunken)]">
          {/* A plain element on purpose. `next/image` optimises assets we ship;
              this is one person's private document, served uncached from our
              own route, and it must not pass through an image pipeline that
              would write it to a cache directory on a server. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source}
            alt={title}
            onError={() => setFailed(true)}
            style={{ transform: `rotate(${upright}deg)` }}
            className="mx-auto block max-h-[62vh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xs">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">
        This one is a {WORDS[media]}. Vallo does not draw it on screen yet, so it opens
        with whatever reads files on this device. It comes from Vallo and from nowhere
        else, and the link below works once.
      </p>
      <a
        href={source}
        download
        className="nf-chip w-fit text-[var(--nf-text-overline)] font-semibold"
      >
        <UiIcon name="document" size="sm" />
        Save the file
      </a>
    </div>
  );
}

/**
 * The control that opens it. Rendered wherever a desk used to render a link.
 *
 * A button rather than an anchor, deliberately: there is no URL to give it.
 * That is the point.
 */
export function DocumentViewer({
  documentId,
  media,
  label,
  title,
  className,
}: {
  documentId: string;
  media: DocumentMediaKind;
  /** What the control says. Each desk keeps its own wording. */
  label: string;
  /**
   * What the document is, for the sheet's heading and the image's accessible
   * name. NEVER a file name and never a document number: rule 16 holds inside
   * the console as well as outside it.
   */
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        closeLabel="Close"
        detents={[0.92]}
      >
        <DocumentCanvas documentId={documentId} media={media} title={title} />
      </Sheet>
    </>
  );
}

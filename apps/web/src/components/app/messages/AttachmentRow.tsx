import { UiIcon } from "@/design-system/icons/UiIcon";
import { fill } from "@/components/app/threads/when";
import type { Dictionary } from "@vallo/i18n/core";
import { ATTACHMENT_GLYPH, attachmentKind, formatBytes } from "./attachment";

/**
 * AN ATTACHMENT AS A BORDERED ROW WITH A TYPE GLYPH (north star 15.4).
 *
 * The glyph says what it is (a PDF, a document, a file), the name says which,
 * and the size says how heavy before a person spends data on it. The whole row
 * is one link that opens the file in its own tab. Nothing is drawn that the
 * row does not hold: a missing size is simply absent, and a missing name falls
 * back to the type's word, never to a made-up file name.
 *
 * One edge treatment (the hairline), one tier (Plate, radius 14), a 44px hit
 * target. Server-safe: no hooks.
 */
type Copy = Dictionary["experienceInbox"]["thread"]["attachment"];

export function AttachmentRow({
  url,
  name,
  mime,
  bytes,
  copy,
}: {
  url: string;
  name?: string | null;
  mime?: string | null;
  bytes?: number | null;
  copy: Copy;
}) {
  const kind = attachmentKind(mime, name);
  const word = kind === "voice" ? copy.voice : kind === "photo" ? copy.photo : copy.file;
  const title = name?.trim() || word;
  const size = formatBytes(bytes);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="nf-attach"
      /* The name holds everything the row shows, the size too (WCAG 2.5.3,
         label in name), so a voice-control user can say what they see. */
      aria-label={size ? `${fill(copy.open, { name: title })} ${size}` : fill(copy.open, { name: title })}
      data-kind={kind}
      data-testid="attachment-row"
    >
      <span className="nf-attach__glyph" aria-hidden="true">
        <UiIcon name={ATTACHMENT_GLYPH[kind]} size={20} />
      </span>
      <span className="nf-attach__text">
        <span className="nf-attach__name">{title}</span>
        {/* A real space between the name and the size, so the row's text reads
            "name size" and its accessible name can contain it. */}
        {size ? <> <span className="nf-attach__size nf-numeric">{size}</span></> : null}
      </span>
      <UiIcon name="arrow-down" size={16} className="nf-attach__go" />
    </a>
  );
}

import type { Dictionary } from "@vallo/i18n/core";
import { fill } from "@/components/app/threads/when";

/**
 * THE QUOTED REPLY BLOCK (north star 15.4, reference 40).
 *
 * Drawn ABOVE the message that answers it, inside the same stack, so a
 * conversation about a specific flat stays legible when five things were said
 * in between: who said it, and the words (two lines, then the ellipsis). A
 * photo or a voice note is named by its kind, not by a made-up caption.
 *
 * It quotes a message the thread really holds. When the quoted message is not
 * in the loaded thread (older than the page, or removed), it says so rather
 * than guessing at the words, and it is not a link.
 *
 * Tapping it asks the thread to bring the quoted message into view; the thread
 * owns the scrolling and the brief highlight, this only reports the tap.
 */
type Copy = Dictionary["experienceInbox"]["thread"]["quoted"];

export type QuotedMessage = {
  id: string;
  /** Who said it: the counterpart's name, or null for the reader themselves. */
  name: string | null;
  text: string;
  kind: "text" | "photo" | "voice" | "file";
};

export function QuotedReply({
  quoted,
  copy,
  onJump,
}: {
  quoted: QuotedMessage | null;
  copy: Copy;
  onJump?: (id: string) => void;
}) {
  if (!quoted) {
    return (
      <p className="nf-quote nf-quote--gone nf-caption" data-testid="quoted-reply">
        {copy.unavailable}
      </p>
    );
  }
  const who = quoted.name ?? copy.you;
  const words =
    quoted.text.trim() ||
    (quoted.kind === "photo" ? copy.photo : quoted.kind === "voice" ? copy.voice : quoted.kind === "file" ? copy.file : "");
  const inner = (
    <>
      <span className="nf-quote__who">{quoted.name ? fill(copy.replyingTo, { name: who }) : copy.you}</span>
      <span className="nf-quote__text">{words}</span>
    </>
  );
  return onJump ? (
    <button type="button" className="nf-quote" onClick={() => onJump(quoted.id)} data-testid="quoted-reply">
      {inner}
    </button>
  ) : (
    <div className="nf-quote" data-testid="quoted-reply">
      {inner}
    </div>
  );
}

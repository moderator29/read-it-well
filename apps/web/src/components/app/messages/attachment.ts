/**
 * ATTACHMENTS THAT ARE NOT PHOTOS: A TYPE, A NAME, A SIZE.
 *
 * `message_attachments` holds a storage path and an image's dimensions today,
 * so a thread can only draw photos (request W5-3 asks Session 2 for the kind,
 * mime type, byte size and original file name). This is the pure half the
 * bordered attachment row needs from those fields once they exist: which glyph
 * a type earns, and the size as people write it.
 */
import type { UiIconName } from "@/design-system/icons/UiIcon";

export type AttachmentKind = "photo" | "voice" | "pdf" | "document" | "file";

/** The kind a mime type or a file name stands for. Unknown is just a file. */
export function attachmentKind(mime: string | null | undefined, name?: string | null): AttachmentKind {
  const type = (mime ?? "").toLowerCase();
  const ext = (name ?? "").toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("image/")) return "photo";
  if (type.startsWith("audio/")) return "voice";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    type.includes("word") ||
    type.includes("officedocument") ||
    type.startsWith("text/") ||
    ["doc", "docx", "txt", "rtf", "xls", "xlsx", "odt"].includes(ext)
  ) {
    return "document";
  }
  return "file";
}

export const ATTACHMENT_GLYPH: Record<AttachmentKind, UiIconName> = {
  photo: "picture",
  voice: "headset",
  pdf: "file-text",
  document: "document",
  file: "file-check",
};

/** "812 KB", "1.4 MB". Nothing for a size that is not known. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  const mb = bytes / 1_000_000;
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

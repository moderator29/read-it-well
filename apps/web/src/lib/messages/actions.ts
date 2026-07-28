"use server";

export type SendMessageState = {
  ok: boolean;
  message?: string;
};

/**
 * The write path for sending a message.
 *
 * Validation is real and runs on the server, because client validation is a
 * convenience and never a control (Master Rule 48). The messaging backend is
 * not wired up yet, so a valid message gets an honest refusal rather than a
 * fake success; the thread UI keeps its local copy so nothing typed is lost.
 * When the platform lands, this action writes to `messages` (and
 * `message_attachments` for images) and the composer adopts it unchanged.
 */
export async function sendMessage(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId) {
    return { ok: false, message: "This conversation could not be identified." };
  }
  if (!body) {
    return { ok: false, message: "Type a message before sending." };
  }
  if (body.length > 2000) {
    return { ok: false, message: "Keep messages under 2,000 characters." };
  }

  return {
    ok: false,
    message:
      "Messaging is not connected to the platform yet. Your message stays on this device until it is.",
  };
}

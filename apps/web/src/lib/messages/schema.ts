import { z } from "zod";

/**
 * Messaging input schemas.
 *
 * Every write into the messaging loop is validated here, on the server, before
 * any database work happens. Identifiers are UUIDs except the listing id in
 * startConversation, which may arrive as a seed catalogue id; the action
 * decides what an honest answer looks like for those.
 */

/** The longest message the platform accepts. */
export const MAX_MESSAGE_LENGTH = 2000;

export const startConversationSchema = z.object({
  listingId: z.string().min(1, "This listing could not be identified."),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.uuid("This conversation could not be identified."),
  body: z
    .string()
    .trim()
    .min(1, "Type a message before sending.")
    .max(MAX_MESSAGE_LENGTH, "Keep messages under 2,000 characters."),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Attachment paths follow the bucket convention <conversation_id>/<uuid>.<ext>.
// The shape is checked here and the conversation prefix is re-checked in the
// action against the validated conversation id.
const STORAGE_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/i;

export const attachImageSchema = z.object({
  conversationId: z.uuid("This conversation could not be identified."),
  messageId: z.uuid("This message could not be identified.").optional(),
  storagePath: z
    .string()
    .regex(STORAGE_PATH_RE, "This photo could not be identified."),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

export type AttachImageInput = z.infer<typeof attachImageSchema>;

export const confirmInspectionSchema = z.object({
  conversationId: z.uuid("This conversation could not be identified."),
  listingId: z.uuid("This listing could not be identified."),
});

export type ConfirmInspectionInput = z.infer<typeof confirmInspectionSchema>;

export const markThreadReadSchema = z.object({
  conversationId: z.uuid("This conversation could not be identified."),
});

export type MarkThreadReadInput = z.infer<typeof markThreadReadSchema>;

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.uuid()).max(100).optional(),
});

export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;

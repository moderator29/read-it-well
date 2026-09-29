import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE ASSISTANT INSIDE A WORKSPACE.
 *
 * The same concierge as `/assistant`, opened inside the agent console
 * (`/agent/assistant`) or the host console (`/host/assistant`) so a member
 * never leaves the workspace to ask it something. Two things change with the
 * frame, and both live here so the client and `/api/assistant` read one list:
 *
 *   - the opening prompts, which are about running listings or a venue
 *     rather than finding a flat; and
 *   - one line appended to the system prompt, saying who is asking.
 *
 * THE LINE IS CHOSEN BY KEY, NEVER SENT AS TEXT. The client sends `"agent"`
 * or `"host"`; the route looks the sentence up here and ignores anything
 * else. A context string the browser could write would be a way to put words
 * in the system prompt, which is exactly what this design refuses.
 *
 * Free of any server-only import: the chat surface reads the prompts.
 */

export const ASSISTANT_WORKSPACES = ["agent", "host"] as const;
export type AssistantWorkspace = (typeof ASSISTANT_WORKSPACES)[number];

type WorkspaceFrame = {
  /** What the assistant is called here, under its name. */
  sub: string;
  starters: readonly { icon: UiIconName; text: string }[];
  /** Appended to the system prompt. No em dash; the model is told never to use one. */
  system: string;
};

export const WORKSPACE_FRAMES: Record<AssistantWorkspace, WorkspaceFrame> = {
  agent: {
    sub: "Your listings workspace. Ask about running your listings.",
    starters: [
      { icon: "calendar-booking", text: "How do I get more inspection requests on my listings?" },
      { icon: "house", text: "What makes a listing title and photos work on Vallo?" },
      { icon: "verified", text: "What do I need to climb the verification ladder?" },
      { icon: "wallet", text: "How and when am I paid out?" },
    ],
    system:
      "Who is asking: a lister speaking from their Vallo listings workspace (an agent, a landlord or a firm). They put up and manage property, answer inspection requests, bookings and messages, and are paid out. Help them run their listings well, honestly and within the rules above. Their workspace screens are /agent/dashboard, /agent/listings, /agent/list to start a listing, /agent/inspections, /agent/bookings, /agent/messages, /agent/earnings, /agent/verification and /agent/settings; point them there rather than to the renter's screens.",
  },
  host: {
    sub: "Your host workspace. Ask about running your stay or restaurant.",
    starters: [
      { icon: "bed", text: "How do I keep my rooms bookable by the night?" },
      { icon: "picture", text: "Which photographs help guests choose a stay?" },
      { icon: "price-tag", text: "How do charges at the door work for guests?" },
      { icon: "utensils", text: "How do table reservations reach my restaurant?" },
    ],
    system:
      "Who is asking: a host speaking from their Vallo host workspace. They run a hotel, a guest house, serviced apartments, a shortlet or a restaurant on Vallo Stays. Help them run it well, honestly and within the rules above. Their workspace screens are /host for the overview, /host/reservations, /host/rooms for rooms and nights, /host/photos, /host/arrival for charges at the door, /host/transfer to hand a business over and /host/settings; point them there rather than to the guest's screens.",
  },
};

/** The workspace a request names, or null for anything that is not one. */
export function parseAssistantWorkspace(value: unknown): AssistantWorkspace | null {
  return typeof value === "string" && (ASSISTANT_WORKSPACES as readonly string[]).includes(value)
    ? (value as AssistantWorkspace)
    : null;
}

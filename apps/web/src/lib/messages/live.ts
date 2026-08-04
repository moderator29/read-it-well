import "server-only";

/**
 * Live messaging reads for the server shells.
 *
 * Everything here reads through the signed-in user's RLS-bound client, so the
 * database decides what they may see. The one exception is identity: profiles
 * and agents are select-own tables by design, so the counterpart's display
 * name (and an agent's verified state) is resolved through the service role
 * strictly after RLS has already handed us the conversation. Without the
 * service key the loops still work; people just render under a generic label
 * until it lands.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createAdminClient } from "../supabase/admin";
import { lagosTimeLabel, lagosWhenLabel } from "./time";

type Db = SupabaseClient<Database>;

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type LiveConversationSummary = {
  id: string;
  counterpartName: string;
  listingTitle: string | null;
  lastMessage: string;
  /** Preformatted Lagos label: time today, date otherwise. */
  whenLabel: string;
  unread: number;
  /**
   * True when the caller sent the most recent message. The host inbox uses it
   * to answer "who is still waiting on me", which a raw unread count cannot:
   * an agent can have read an enquiry and still not have replied to it.
   */
  lastFromMe: boolean;
  /** ISO instant of the most recent message, for ageing a waiting thread. */
  lastAt: string;
};

export type LiveThreadMessage = {
  id: string;
  mine: boolean;
  body: string;
  /** Preformatted Lagos "HH:MM". */
  timeLabel: string;
  imageUrl: string | null;
};

export type LiveThreadData = {
  conversationId: string;
  meId: string;
  counterpartName: string;
  listing: {
    id: string;
    title: string;
    area: string;
    city: string;
    verified: boolean;
    hue: number;
  } | null;
  inspected: boolean;
  messages: LiveThreadMessage[];
};

const FALLBACK_NAME = "RentMe member";

/** Deterministic 0..5 hue index from an id, for the placeholder tile. */
function hueOf(id: string): number {
  let acc = 0;
  for (let i = 0; i < id.length; i += 1) acc = (acc + id.charCodeAt(i)) % 6;
  return acc;
}

type Identity = { name: string; verified: boolean };

/**
 * Resolve display identities for counterpart user ids through the service
 * role. An agent's brand name wins over their personal profile name. Fails
 * soft to an empty map when the service key is absent.
 */
async function identitiesOf(userIds: string[]): Promise<Map<string, Identity>> {
  const map = new Map<string, Identity>();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return map;
  try {
    const admin = createAdminClient();
    const [profiles, agents] = await Promise.all([
      admin.from("profiles").select("id, display_name").in("id", ids),
      admin.from("agents").select("user_id, display_name, verified").in("user_id", ids),
    ]);
    for (const p of profiles.data ?? []) {
      if (p.display_name) map.set(p.id, { name: p.display_name, verified: false });
    }
    for (const a of agents.data ?? []) {
      map.set(a.user_id, { name: a.display_name, verified: a.verified });
    }
  } catch {
    // No service key yet: generic labels carry the surface.
  }
  return map;
}

/**
 * The signed-in user's conversations, newest activity first, with counterpart
 * name, listing title, last message preview and unread count. Two bounded
 * queries: the conversations themselves, then one recent-messages sweep that
 * yields both previews and unread counts without an N+1.
 */
export async function loadConversationSummaries(
  supabase: Db,
  user: User,
): Promise<LiveConversationSummary[]> {
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, guest_id, agent_id, last_message_at, listings(title)")
    .order("last_message_at", { ascending: false })
    .limit(50);
  if (!conversations || conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const { data: recent } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, created_at, read_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .limit(400);

  const lastByConversation = new Map<
    string,
    { body: string; at: string; senderId: string }
  >();
  const unreadByConversation = new Map<string, number>();
  for (const m of recent ?? []) {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, {
        body: m.body,
        at: m.created_at,
        senderId: m.sender_id,
      });
    }
    if (m.sender_id !== user.id && m.read_at === null) {
      unreadByConversation.set(
        m.conversation_id,
        (unreadByConversation.get(m.conversation_id) ?? 0) + 1,
      );
    }
  }

  const counterparts = conversations.map((c) => (c.guest_id === user.id ? c.agent_id : c.guest_id));
  const identities = await identitiesOf(counterparts);

  return conversations.map((c) => {
    const counterpartId = c.guest_id === user.id ? c.agent_id : c.guest_id;
    const last = lastByConversation.get(c.id);
    return {
      id: c.id,
      counterpartName: identities.get(counterpartId)?.name ?? FALLBACK_NAME,
      listingTitle: c.listings?.title ?? null,
      lastMessage: last?.body ?? "No messages yet",
      whenLabel: lagosWhenLabel(last?.at ?? c.last_message_at),
      unread: unreadByConversation.get(c.id) ?? 0,
      /* No messages at all counts as not from us, so a brand new enquiry with
         nothing in it still reads as waiting rather than as answered. */
      lastFromMe: last ? last.senderId === user.id : false,
      lastAt: last?.at ?? c.last_message_at,
    };
  });
}

/**
 * One conversation in full: membership-checked by RLS, messages in order,
 * attachments resolved to short-lived signed URLs, and the caller's own
 * inspection state for the options sheet.
 */
export async function loadThread(
  supabase: Db,
  user: User,
  conversationId: string,
): Promise<LiveThreadData | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, guest_id, agent_id, listing_id, listings(id, title, area, city)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;
  if (conversation.guest_id !== user.id && conversation.agent_id !== user.id) return null;

  const [{ data: messages }, { data: myInspection }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at, message_attachments(storage_path)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("inspection_confirmations")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Signed URLs for every attachment in one round trip; the storage policy
  // has already limited reads to conversation members.
  const paths = (messages ?? []).flatMap((m) =>
    m.message_attachments.map((a) => a.storage_path),
  );
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("message-attachments")
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl && !s.error) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const counterpartId =
    conversation.guest_id === user.id ? conversation.agent_id : conversation.guest_id;
  const identities = await identitiesOf([counterpartId]);
  const counterpart = identities.get(counterpartId);

  return {
    conversationId: conversation.id,
    meId: user.id,
    counterpartName: counterpart?.name ?? FALLBACK_NAME,
    listing: conversation.listings
      ? {
          id: conversation.listings.id,
          title: conversation.listings.title,
          area: conversation.listings.area ?? "",
          city: conversation.listings.city ?? "",
          verified: counterpart?.verified ?? false,
          hue: hueOf(conversation.listings.id),
        }
      : null,
    inspected: Boolean(myInspection),
    messages: (messages ?? []).map((m) => {
      const path = m.message_attachments[0]?.storage_path;
      return {
        id: m.id,
        mine: m.sender_id === user.id,
        body: m.body,
        timeLabel: lagosTimeLabel(m.created_at),
        imageUrl: path ? (urlByPath.get(path) ?? null) : null,
      };
    }),
  };
}

/** The signed-in user's notifications, newest first, bounded. */
export async function loadNotifications(supabase: Db): Promise<NotificationRow[]> {
  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

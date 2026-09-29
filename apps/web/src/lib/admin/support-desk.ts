import "server-only";

import { createAdminClient } from "../supabase/admin";
import { requireAdmin } from "./guard";
import { claimIsLive } from "./queue-desk";
import { isUserId, personName } from "./member-file-rules";
import { waitingSince } from "./support-rules";
import type { AdminRead, TicketView } from "./queries";

/**
 * THE SUPPORT DESK'S OWN READS, beside `getSupportTickets` and
 * `getTicketThread` in `queries.ts`.
 *
 *  - `getSupportTicket` reads ONE ticket by id. The desk used to open a
 *    ticket only if it sat on the page of the queue on screen, so a link from
 *    a notification, the person file or a colleague to a ticket on page two
 *    (or one filtered out) opened nothing and said nothing.
 *  - `getTicketDesk` reads what an operator needs beside the thread: who has
 *    the ticket (the queue's own claim, `queue_claims` kind `ticket`, taken
 *    with `queue_take`), who on the team wrote each reply, when the member
 *    last wrote without an answer (the clock the promise is measured from),
 *    how many other tickets the same account has filed, and whether this
 *    operator may open the member's file (admins only; the person file
 *    refuses scoped staff inside the database).
 *
 * Both behind `requireAdmin("support")`, then the service client, exactly as
 * the other support reads: a support-scoped staff member holds no admin role,
 * so the tables' admin policies would refuse their own client.
 */

const UNAVAILABLE = { state: "unavailable" } as const;

const TICKET_COLUMNS = "id, reference, name, email, topic, body, status, user_id, created_at, updated_at, support_ticket_messages ( id )";

export async function getSupportTicket(ticketId: string): Promise<AdminRead<TicketView | null>> {
  if (!isUserId(ticketId)) return { state: "ok", data: null };
  const access = await requireAdmin("support");
  if (access.state !== "admin") return UNAVAILABLE;
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("support_tickets").select(TICKET_COLUMNS).eq("id", ticketId).maybeSingle();
    if (error) return UNAVAILABLE;
    if (!data) return { state: "ok", data: null };
    return {
      state: "ok",
      data: {
        id: data.id,
        reference: data.reference,
        name: data.name,
        email: data.email,
        topic: data.topic,
        body: data.body,
        status: data.status,
        hasAccount: data.user_id !== null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        replyCount: data.support_ticket_messages.length,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

export type TicketDesk = {
  me: string;
  /** The live claim, or null when nobody has it (or it went idle past 30 minutes). */
  claim: { by: string; name: string | null; mine: boolean; since: string } | null;
  /** Who on the team wrote each staff reply, by message id. */
  replierOf: Record<string, string>;
  /** The member's own account, when the ticket was filed signed in. */
  userId: string | null;
  canOpenFile: boolean;
  otherTickets: number;
  /** When the member last wrote without a reply from us since; null when we answered last. */
  waitingSince: string | null;
};

export async function getTicketDesk(ticketId: string, now: number = Date.now()): Promise<AdminRead<TicketDesk>> {
  if (!isUserId(ticketId)) return UNAVAILABLE;
  const access = await requireAdmin("support");
  if (access.state !== "admin") return UNAVAILABLE;
  try {
    const db = createAdminClient();
    const loose = db as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> } };
        };
      };
    };
    const [ticket, messages, claim] = await Promise.all([
      db.from("support_tickets").select("user_id, created_at").eq("id", ticketId).maybeSingle(),
      db
        .from("support_ticket_messages")
        .select("id, sender_role, sender_id, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })
        .limit(200),
      loose.from("queue_claims").select("claimed_by, claimed_at, touched_at").eq("kind", "ticket").eq("item_id", ticketId).maybeSingle(),
    ]);
    if (ticket.error || messages.error || !ticket.data) return UNAVAILABLE;

    const userId = ticket.data.user_id;
    const msgs = messages.data ?? [];
    const claimRow = (claim.error ? null : claim.data) as { claimed_by: string; claimed_at: string; touched_at: string } | null;
    const liveClaim = claimRow && claimIsLive(claimRow.touched_at, now) ? claimRow : null;

    const staffIds = [
      ...new Set([
        ...msgs.filter((m) => m.sender_role === "admin" && m.sender_id).map((m) => m.sender_id as string),
        ...(liveClaim ? [liveClaim.claimed_by] : []),
      ]),
    ];
    const [names, others] = await Promise.all([
      staffIds.length
        ? db.from("profiles").select("id, display_name, first_name, surname").in("id", staffIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string | null; first_name: string | null; surname: string | null }[] }),
      userId
        ? db.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("id", ticketId)
        : Promise.resolve({ count: 0 }),
    ]);
    const nameOf = new Map((names.data ?? []).map((p) => [p.id, personName(p)]));

    const replierOf: Record<string, string> = {};
    for (const m of msgs) {
      if (m.sender_role === "admin" && m.sender_id) {
        const n = nameOf.get(m.sender_id);
        if (n) replierOf[m.id] = n;
      }
    }

    return {
      state: "ok",
      data: {
        me: access.user.id,
        claim: liveClaim
          ? {
              by: liveClaim.claimed_by,
              name: nameOf.get(liveClaim.claimed_by) ?? null,
              mine: liveClaim.claimed_by === access.user.id,
              since: liveClaim.claimed_at,
            }
          : null,
        replierOf,
        userId,
        canOpenFile: !access.isStaff && userId !== null,
        otherTickets: others.count ?? 0,
        waitingSince: waitingSince(
          ticket.data.created_at,
          msgs.map((m) => ({ role: m.sender_role, at: m.created_at })),
        ),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

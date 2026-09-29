import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import type { MyTickets } from "@/lib/support/my-tickets";
import { canMemberReply } from "@/lib/support/tickets";

/**
 * What the Messages row says on the right.
 *
 * An unread staff reply beats everything and is said in words beside a dot,
 * so it is never colour alone; otherwise how many are still being worked.
 */
function messagesValue(tickets: MyTickets) {
  if (tickets.state !== "ok") return undefined;
  const unread = tickets.tickets.filter((t) => t.unread).length;
  if (unread > 0) {
    return (
      <span className="inline-flex items-center gap-3xs font-semibold text-[var(--nf-content-link)]" data-testid="support-unread">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]" aria-hidden="true" />
        {/* No count, so no English plural: the inbox shows which ones. */}
        New reply
      </span>
    );
  }
  const open = tickets.tickets.filter((t) => canMemberReply(t.status)).length;
  return open > 0 ? `Open: ${open}` : undefined;
}

function messagesSub(tickets: MyTickets): string {
  if (tickets.state === "signed-out") return "Sign in to see your support conversations";
  if (tickets.state === "unreadable") return "Could not be loaded just now. Open to try again";
  if (tickets.tickets.length === 0) return "Your support conversations will appear here";
  return "Your support conversations and our replies";
}

/** "Your support": the Messages row with its unread badge. */
export function MessagesGroup({ tickets, signedIn }: { tickets: MyTickets; signedIn: boolean }) {
  return (
    <SettingsGroup label="Your support">
      <RowLink
        href={signedIn ? "/support/messages" : "/sign-in?next=%2Fsupport%2Fmessages"}
        icon="chat-bubble"
        label="Messages"
        sub={messagesSub(tickets)}
        value={messagesValue(tickets)}
        testId="support-messages"
      />
    </SettingsGroup>
  );
}

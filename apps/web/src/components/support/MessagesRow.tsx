import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import type { MyTickets } from "@/lib/support/my-tickets";
import { canMemberReply } from "@/lib/support/tickets";
import { withNext } from "@/lib/auth/next-link";
import { formatNumber, type Locale } from "@vallo/i18n";
import type { SupportHomeCopy } from "./SupportHero";

/**
 * What the Messages row says on the right.
 *
 * An unread staff reply beats everything and is said in words beside a dot,
 * so it is never colour alone; otherwise how many are still being worked.
 */
function messagesValue(tickets: MyTickets, copy: SupportHomeCopy, locale: Locale) {
  if (tickets.state !== "ok") return undefined;
  const unread = tickets.tickets.filter((t) => t.unread).length;
  if (unread > 0) {
    return (
      <span className="inline-flex items-center gap-3xs font-semibold text-[var(--nf-content-link)]" data-testid="support-unread">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-brand-primary)]" aria-hidden="true" />
        {/* No count, so no English plural: the inbox shows which ones. */}
        {copy.newReply}
      </span>
    );
  }
  const open = tickets.tickets.filter((t) => canMemberReply(t.status)).length;
  return open > 0 ? copy.open.replace("{count}", formatNumber(open, locale)) : undefined;
}

function messagesSub(tickets: MyTickets, copy: SupportHomeCopy): string {
  if (tickets.state === "signed-out") return copy.messagesSignedOut;
  if (tickets.state === "unreadable") return copy.messagesUnreadable;
  if (tickets.tickets.length === 0) return copy.messagesEmpty;
  return copy.messagesSome;
}

/** "Your support": the Messages row with its unread badge. */
export function MessagesGroup({
  tickets,
  signedIn,
  copy,
  locale,
}: {
  tickets: MyTickets;
  signedIn: boolean;
  copy: SupportHomeCopy;
  locale: Locale;
}) {
  return (
    <SettingsGroup label={copy.yourSupport}>
      <RowLink
        href={signedIn ? "/support/messages" : withNext("/sign-in", "/support/messages")}
        icon="chat-bubble"
        label={copy.messages}
        sub={messagesSub(tickets, copy)}
        value={messagesValue(tickets, copy, locale)}
        testId="support-messages"
      />
    </SettingsGroup>
  );
}

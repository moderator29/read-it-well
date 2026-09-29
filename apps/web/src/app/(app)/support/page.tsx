import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { BackButton } from "@/components/site/BackButton";
import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { aiConsentForViewer } from "@/lib/ai/consent-server";
import { loadMyReports } from "@/lib/reports/my-reports";
import { loadMyTickets, type MyTickets } from "@/lib/support/my-tickets";
import { FAQS, POPULAR_QUESTIONS, TRUST_LINKS } from "@/lib/support/help-articles";
import { popularArticles } from "@/lib/support/help-search";
import { canMemberReply } from "@/lib/support/tickets";
import { RESPONSE_COMMITMENTS } from "@/lib/trust/standards";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { MyReports } from "../settings/help/MyReports";
import { AskCard } from "./AskCard";
import { SupportSearch } from "./SupportSearch";

export const metadata: Metadata = { title: "Help and support" };

/** The trust pages as rows, with a line glyph each (the help centre draws them as cards). */
const TRUST_ICON: Record<string, UiIconName> = {
  "/safety": "shield-stop",
  "/standards": "verified",
  "/cancellations": "calendar-booking",
};

/** What the Messages row says on the right: a reply waiting beats a count. */
function messagesValue(tickets: MyTickets) {
  if (tickets.state !== "ok") return undefined;
  const waiting = tickets.tickets.filter((t) => canMemberReply(t.status) && t.thread.supportSpokeLast).length;
  if (waiting > 0) {
    return (
      <span className="inline-flex items-center gap-3xs font-semibold text-[var(--nf-content-link)]">
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
  if (tickets.state === "unreadable") return "Your support conversations could not be loaded just now";
  if (tickets.tickets.length === 0) return "Your support conversations will appear here";
  return "Your support conversations and our replies";
}

/**
 * Help and support, the in-app home.
 *
 * One place for everything a member might need when something is wrong: the
 * greeting, their own support conversations (the replies used to notify to a
 * screen that showed none of them), the help centre, the AI helper that hands
 * over to a person, a search over the help centre's own answers with the
 * popular five in front, then the trust pages, a person by email form, and
 * the legal pages store reviewers look for.
 *
 * `/help` stays as the public help centre, reachable signed out; this page is
 * behind the gate like the rest of the app, so the signed-out branches below
 * only run when the gate is open (the platform unconfigured, or a future
 * decision to open it), and they send the person to sign in or to `/help`.
 */
export default async function SupportPage() {
  const locale = await getLocale();
  const [identity, tickets, reports, aiConsented] = await Promise.all([
    getShellIdentity(),
    loadMyTickets(50),
    loadMyReports(),
    aiConsentForViewer(),
  ]);
  const signedIn = identity.signedIn;
  /* The shell's name is the first word of the nickname, first name or display
     name, and falls back to "Guest" when a profile has none of them: a member
     is never greeted as a guest, so that fallback reads as no name at all. */
  const name = signedIn && identity.userName !== "Guest" ? identity.userName : "";
  const promise = `A person replies ${RESPONSE_COMMITMENTS.standard.label.toLowerCase()}, and ${RESPONSE_COMMITMENTS.urgent.label.toLowerCase()} when money or safety is at stake.`;
  const popular = popularArticles(FAQS, POPULAR_QUESTIONS);

  return (
    <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
      <BackButton fallback="/home" className="nf-icon-btn nf-icon-btn--glass h-11 w-11" />
      <header className="nf-hub-head">
        <h1 className="nf-hub-head__title break-words" data-testid="support-greeting">
          {name ? `Hi ${name}, how can we help?` : "Hi there, how can we help?"}
        </h1>
        <p className="nf-hub-head__lede">{promise}</p>
      </header>

      <div className="space-y-block">
        <SettingsGroup label="Your support">
          <RowLink
            href={signedIn ? "/support/messages" : "/sign-in?next=%2Fsupport%2Fmessages"}
            icon="chat-bubble"
            label="Messages"
            sub={messagesSub(tickets)}
            value={messagesValue(tickets)}
            testId="support-messages"
          />
          <RowLink
            href="/help"
            icon="info"
            label="Help"
            sub="The help centre: every answer, by topic"
            testId="support-help-centre"
          />
        </SettingsGroup>

        <AskCard aiConsented={aiConsented} />

        <SupportSearch articles={FAQS} popular={popular} />

        <MyReports list={reports} locale={locale} />

        <SettingsGroup label="Safety and policies">
          {TRUST_LINKS.map((link) => (
            <RowLink
              key={link.href}
              href={link.href}
              icon={TRUST_ICON[link.href] ?? "info"}
              label={link.title}
              sub={link.body}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup
          label="Contact us"
          note="Anything you send reaches a person. Replies to a ticket you filed while signed in also land in Messages above."
        >
          <RowLink
            href="/contact"
            icon="mail"
            label="Contact support"
            sub="Write to the team with the form"
            testId="support-contact"
          />
        </SettingsGroup>

        <SettingsGroup label="Legal">
          <RowLink href="/terms" icon="document" label="Terms" />
          <RowLink href="/privacy" icon="eye-off" label="Privacy" />
          <RowLink href="/delete-account" icon="trash" label="Delete account" sub="How to delete your account and data" />
        </SettingsGroup>
      </div>
    </div>
  );
}

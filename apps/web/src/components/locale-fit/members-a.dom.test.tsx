/**
 * Locale fit, the surfaces members use most, part one (north star checklist
 * point 22): the inbox list, a thread with its composer, the notifications list,
 * the settings rows (the hub, appearance with its language row, and the help
 * rows) and the Space Passport, each mounted in Chromium at 390px in English,
 * Hausa, Igbo and Yorùbá, from the real dictionaries, on the product's real
 * compiled cascade.
 *
 * Every row, person and listing on screen is the repository's own development
 * fixture (`app/(dev)/preview/f4`, `f5`, `_fixtures`), composed exactly as its
 * preview page composes it; nothing is written for this test. Whatever a
 * surface says that is not in a dictionary (a conversation's words, a person's
 * name) is the fixture's and is the same in every locale, so what these runs
 * measure is the interface around it. See `fit-cases.ts` for the three things
 * held, and the list in the report for surfaces skipped for want of a fixture.
 */
import { afterAll, beforeAll, describe, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { appCss } from "@/lib/testing/locale-fit";
import { fitCases } from "./fit-cases";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = () => appCss();

/* The key is "<surface> <locale>"; the value is the report line. */
const KNOWN: Record<string, string> = {
};

describe.skipIf(!hasBrowser && !process.env.CI)("locale fit: inbox, thread, notifications, settings and passport at 390px", () => {
  fitCases(
    {
      name: "Inbox list, fixture rows",
      imports: `
        import { Inbox } from "@/app/(app)/messages/Inbox";
        import { PERSON } from "@/app/(dev)/preview/_fixtures/people";
        import { INBOX } from "@/app/(dev)/preview/f5/fixtures";`,
      body: `<div className="nf-shell py-section-tight"><Inbox rows={INBOX} meId={PERSON.id} canMarkRead /></div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Thread with its composer, rental conversation",
      imports: `
        import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
        import { PERSON } from "@/app/(dev)/preview/_fixtures/people";
        import { CONVERSATION_ID, INSPECTION, LISTING_ID, RENTAL_CONTEXT, RENTAL_THREAD } from "@/app/(dev)/preview/f5/fixtures";`,
      body: `
        <div className="flex h-dvh flex-col">
          <ThreadView
            sheetCopy={{ passport: t.trustVisible.passport, unsafe: t.trustVisible.unsafe }}
            live={false}
            conversationId={CONVERSATION_ID}
            meId={PERSON.id}
            counterpartName="Michael T."
            counterpartTier="none"
            listing={{ id: LISTING_ID, title: "Example 2 bedroom apartment", area: "Lekki Phase 1", city: "Lagos", verified: false, approved: true, hue: 1 }}
            inspected={false}
            messages={RENTAL_THREAD}
            context={RENTAL_CONTEXT}
            inspection={INSPECTION}
            role="guest"
            threadCopy={t.threads}
            locale={locale}
            scamCopy={t.memberKit.scam}
          />
        </div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Notifications list, fixture rows and empty",
      imports: `
        import { LiveNotifications } from "@/app/(app)/notifications/LiveNotifications";
        import { PERSON } from "@/app/(dev)/preview/_fixtures/people";
        import { NOTIFICATIONS } from "@/app/(dev)/preview/f4/fixtures";`,
      body: `
        <div className="nf-shell py-section-tight">
          <div className="mx-auto max-w-2xl">
            <LiveNotifications initial={NOTIFICATIONS} userId={PERSON.id} />
            <LiveNotifications initial={[]} userId={PERSON.id} />
          </div>
        </div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Settings hub, payments and log out rows",
      imports: `
        import { PageHeader } from "@/components/app/PageHeader";
        import { PaymentMethodsPanel } from "@/components/app/payments/PaymentMethodsPanel";
        import { LogOutRow, SettingsHub } from "@/app/(app)/settings/SettingsHub";
        import { PERSON } from "@/app/(dev)/preview/_fixtures/people";
        import { BANK_ACCOUNTS, PAYMENT_CARDS } from "@/app/(dev)/preview/f4/fixtures";`,
      body: `
        <div className="nf-shell pt-xl">
          <div className="mx-auto max-w-2xl">
            <PageHeader variant="large" title={t.nav.settings} subtitle={t.settings.hub.ledeShort} fallback="/settings" />
            <div className="space-y-block">
              <SettingsHub t={t} locale={locale} signedIn
                person={{ name: PERSON.name, email: "seyi@example.com", avatarUrl: PERSON.avatarUrl, verified: PERSON.verified }}
                notifications={{ bookings: true, messages: true, wallet: true, marketing: false }} deviceCount={2} />
              <PaymentMethodsPanel cards={PAYMENT_CARDS} accounts={BANK_ACCOUNTS} cardsFailed={false} accountsFailed={false} copy={t.paymentsPage} />
              <LogOutRow t={t} signedIn />
            </div>
          </div>
        </div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Settings appearance, language row and help rows",
      imports: `
        import { PageHeader } from "@/components/app/PageHeader";
        import { AppearanceCard, LanguageRow } from "@/components/app/account/SettingsGroups";
        import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";`,
      body: `
        <div className="nf-shell pt-xl">
          <div className="mx-auto max-w-2xl space-y-block">
            <PageHeader title={t.settings.appearance.label} subtitle={t.settings.hub.appearanceSub} fallback="/settings" />
            <AppearanceCard t={t}><LanguageRow t={t} current={locale} /></AppearanceCard>
            <SettingsGroup label={t.settings.about.label} note={t.settings.about.note}>
              <RowLink href="/help" icon="ticket" label={t.settings.about.help} sub={t.settings.about.helpSub} />
              <RowLink href="/terms" icon="grid" label={t.settings.about.terms} />
              <RowLink href="/privacy" icon="verified" label={t.settings.about.privacy} />
              <RowValue icon="info" label={t.settings.about.version} value="0.1.0" />
            </SettingsGroup>
          </div>
        </div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );

  fitCases(
    {
      name: "Space Passport credential, switched on and off",
      imports: `
        import { PassportCredential } from "@/components/app/account/PassportCredential";
        import { PassportShareButton } from "@/components/app/account/PassportShareButton";`,
      setup: `const copy = t.experienceAccount.passport;`,
      body: `
        <div className="nf-shell pt-xl"><div className="mx-auto max-w-2xl space-y-block">
          <PassportCredential copy={copy} enabled since={null} action={<PassportShareButton copy={copy} dismissLabel={t.experienceUi.notNow} />} />
          <PassportCredential copy={copy} enabled={false} since={null} />
        </div></div>`,
      bleed: true,
      css: CSS,
    },
    KNOWN,
  );
});

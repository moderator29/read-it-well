import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ReceiveCard } from "@/components/app/wallet/ReceiveCard";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { PERSON } from "../../_fixtures/people";
import { ENTRIES } from "../fixtures";

export default function PreviewReceive() {
  const t = getDictionary("en");
  const copy = t.walletReceive;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={copy.title}
        subtitle={copy.tagline}
        fallback="/wallet"
        actions={
          <span className="nf-money-hero__object block" aria-hidden="true">
            <BrandIcon name="payment-received" fill priority />
          </span>
        }
      />
      <ReceiveCard email={`${PERSON.handle}@example.com`} handle={PERSON.handle} locale="en" copy={copy} />
      <div className="mt-group">
        <RecentActivity
          entries={ENTRIES.filter((e) => e.direction === "credit")}
          locale="en"
          copy={t.wallet.home}
          title={copy.recentTitle}
          empty={copy.recentEmpty}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { TYPE } from "@/components/app/Screen";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import "@/components/app/account/referral.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceAccount.invite.howTitle };
}

/**
 * HOW INVITES WORK: the inner page that answers one question completely
 * (D25): what an invite does and does not do. Every line is a fact the code
 * can back today. The code is made once and is the member's alone; whoever
 * opens the link sees a first name (`referral_door` returns nothing more); a
 * sign-up through it is recorded as the member's (`raw_user_meta_data`); and no
 * reward exists, which is said in the invite door's own words, not rephrased.
 *
 * It is deliberately plain: this is the page somebody reads to decide whether
 * this is a scheme, so it states the negatives (nothing to pay in, one level
 * only) as plainly as the positives.
 */
export default async function InviteHowItWorksPage() {
  const t = getDictionary(await getLocale());
  const copy = t.experienceAccount.invite;
  const how = copy.how;
  const items: { icon: UiIconName; title: string; body: string }[] = [
    { icon: "key", title: how.codeTitle, body: how.codeBody },
    { icon: "eye", title: how.seenTitle, body: how.seenBody },
    { icon: "file-check", title: how.recordedTitle, body: how.recordedBody },
    { icon: "shield-check", title: how.notTitle, body: how.notBody },
  ];

  return (
    <div className="mx-auto max-w-2xl" data-testid="invite-how">
      <PageHeader title={copy.howTitle} subtitle={how.lede} fallback="/settings/invite" />
      <ol className="nf-panel nf-panel--card nf-how">
        {items.map((item) => (
          <li key={item.title} className="nf-how__item">
            <IconPlate shape="round" size="sm" tone="brand">
              <UiIcon name={item.icon} size={20} />
            </IconPlate>
            <div className="nf-how__text">
              <h2 className="nf-how__title">{item.title}</h2>
              <p className="nf-how__body">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className={`${TYPE.caption} mt-block text-center`}>{t.publicDoors.invite.noReward}</p>
    </div>
  );
}

import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { siteUrl } from "@/lib/site";
import { PageHeader } from "@/components/app/PageHeader";
import { myInviteCode } from "@/lib/referral/server";
import { invitePath } from "@/lib/referral/code";
import { InviteShare } from "./InviteShare";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).publicDoors.invite.rowTitle };
}

/** A5. The member's own invite link, made on first visit. No reward is promised. */
export default async function InviteSettingsPage() {
  const copy = getDictionary(await getLocale()).publicDoors.invite;
  const code = await myInviteCode();
  const url = code ? `${siteUrl().replace(/\/+$/, "")}${invitePath(code)}` : null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.rowTitle} subtitle={copy.rowSub} fallback="/settings" />
      {code && url ? (
        <InviteShare copy={copy} url={url} code={code} />
      ) : (
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.unavailable}</p>
      )}
    </div>
  );
}

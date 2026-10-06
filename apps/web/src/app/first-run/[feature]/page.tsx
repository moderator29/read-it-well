import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRunPanels } from "@/components/app/feature-onboarding/FirstRunPanels";
import { firstRunNext } from "@/components/app/feature-onboarding/first-run-device";
import {
  FIRST_RUN_HOME,
  canMount,
  firstRunContent,
  isMountedFirstRun,
} from "@/components/app/feature-onboarding/first-runs";

export const metadata: Metadata = {
  title: "Getting started",
  robots: { index: false, follow: false },
};

/**
 * /first-run/[feature]: ONE FEATURE'S FIRST RUN, AS A PAGE (north star 14.1).
 *
 * A route and never a modal, so back behaves and a deep link (a notification,
 * a help article, "show me again") reaches it. Members only: `/first-run` is
 * not a public path, so the proxy sends a signed-out visitor to sign in first.
 *
 * Which features exist is `MOUNTED_FIRST_RUNS`; anything else, including the
 * waiting wallet, escrow and withdrawal runs whose screens do not exist yet,
 * is a 404 rather than a page that teaches a feature nobody can open.
 *
 * `?next=` is where the member was going, through the one return-path guard;
 * without it, or when it is not safe, both exits land on the feature's home.
 *
 * Its back destination is declared per feature in `lib/nav/route-parents.ts`
 * (request to the lead: the seven literal `/first-run/<key>` parents and the
 * `LITERAL_EXPANSIONS` entry), the feature's own parent, because the first
 * run stands in front of the feature rather than inside it.
 */
export default async function FirstRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ feature: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { feature } = await params;
  if (!isMountedFirstRun(feature)) notFound();

  const t = getDictionary(await getLocale());
  const content = firstRunContent(feature, t);
  if (!canMount(content)) notFound();

  const raw = (await searchParams).next;
  const next = firstRunNext(Array.isArray(raw) ? raw[0] : raw, FIRST_RUN_HOME[feature]);
  const c = t.experienceFeatures.firstRun;

  return (
    <FirstRunPanels
      feature={feature}
      name={content.name}
      panels={content.panels}
      action={content.action}
      next={next}
      copy={{ skip: c.skip, next: c.next, page: c.page, pager: c.pager, region: c.region }}
    />
  );
}

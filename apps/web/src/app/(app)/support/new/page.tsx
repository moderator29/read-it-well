import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { resolveSession } from "@/lib/actions/session";
import { getLocale } from "@/lib/locale";
import { loadMyRelatedRecords } from "@/lib/support/related-records";
import type { QueryKind, RelatedRecord } from "@/lib/support/new-query";
import { NewQueryForm } from "./NewQueryForm";

export const metadata: Metadata = { title: "Write to support" };

/**
 * A new question or problem for the support team.
 *
 * `?kind=problem` opens it as a problem report and `?topic=<code>` preselects
 * a topic, so a screen that knows what went wrong (a failed payment, a
 * booking page) can link here with the right door already open. The member's
 * own records are read here on their own client and handed to the form as the
 * optional "link a record" list.
 */
export default async function NewSupportQueryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kindParam = typeof params.kind === "string" ? params.kind : undefined;
  const kind: QueryKind | undefined = kindParam === "problem" ? "problem" : kindParam === "question" ? "question" : undefined;
  const topic = typeof params.topic === "string" ? params.topic : null;

  const session = await resolveSession();
  const title = kind === "problem" ? "Report a problem" : "Write to support";

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={title} fallback="/support" />
        <EmptyState
          icon="support-chat"
          title="Sign in to write to support"
          body="Signed in, your message and every reply are kept on your account. You can also use the contact form without an account."
          action={
            <ButtonLink href="/sign-in?next=%2Fsupport%2Fnew" variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
          secondary={
            <ButtonLink href="/contact" variant="ghost" size="lg">
              Use the contact form
            </ButtonLink>
          }
        />
      </div>
    );
  }

  let records: RelatedRecord[] = [];
  try {
    records = await loadMyRelatedRecords(session.supabase, session.user.id, await getLocale());
  } catch {
    records = [];
  }

  return (
    <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
      <PageHeader title={title} subtitle="A person reads every message" fallback="/support" />
      <NewQueryForm initialKind={kind} initialTopic={topic} records={records} />
    </div>
  );
}

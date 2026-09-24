import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { ValloRecord } from "@/components/app/trust/ValloRecord";
import { readRecordCode, recordLines } from "@/lib/trust/record";
import { readRecordByCode } from "@/lib/trust/record-read";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).trustVisible.record.lookupTitle, robots: { index: false } };
}

/**
 * A RECORD CODE, TYPED (V-34). A lister puts `VR-` and six characters on a
 * WhatsApp bio, a business card or a TO LET board; anybody signed in who types
 * it into search lands here and sees the live Record, not a screenshot of one.
 *
 * States: a code that cannot be one of ours or matches nobody (one answer,
 * so the page never confirms which codes exist), too many lookups this hour,
 * a failed read, a lister with nothing counted yet, and the Record. Loading
 * is `loading.tsx` beside this file. Signed out never reaches this route: it
 * is inside the sign-in wall.
 */
export default async function RecordLookupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.trustVisible.record;
  const code = readRecordCode(decodeURIComponent(raw));
  const lookup = code ? await readRecordByCode(code) : ({ state: "missing" } as const);

  const back = (
    <ButtonLink href="/search" variant="primary" size="lg">
      {copy.search}
    </ButtonLink>
  );

  if (lookup.state === "missing") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.lookupTitle} fallback="/search" />
        <EmptyState icon="shield-check" title={copy.lookupMissingTitle} body={copy.lookupMissingBody} action={back} />
      </div>
    );
  }
  if (lookup.state === "limited" || lookup.state === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.lookupTitle} fallback="/search" />
        <p role="alert" className={`${TYPE.body} mt-block`}>
          {lookup.state === "limited" ? copy.lookupLimited : copy.lookupFailed}
        </p>
      </div>
    );
  }

  const record = lookup.record;
  /* A Record with no line at all (a stop the database cannot date) is
     answered exactly as a code that matches nobody. */
  if (recordLines(record, copy, locale).length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.lookupTitle} fallback="/search" />
        <EmptyState icon="shield-check" title={copy.lookupMissingTitle} body={copy.lookupMissingBody} action={back} />
      </div>
    );
  }
  const title = record.displayName ?? copy.lookupTitle;
  /* Only the joining month counted so far: say so rather than draw a Record
     that looks empty. */
  const onlySince = recordLines(record, copy, locale).every((line) => line.key === "since");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={title} subtitle={copy.code.replace("{code}", record.recordCode ?? "")} fallback="/search" />
      <ValloRecord record={record} t={t} locale={locale} />
      {onlySince && <p className={`${TYPE.body} mt-block`}>{copy.lookupEmpty}</p>}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { OfflineNote, useOnline } from "@/components/support/OfflineNote";
import { PhotoField } from "@/components/support/PhotoField";
import { uploadTicketPhoto, type PreparedPhoto } from "@/components/support/photo";
import { fileSupportTicket } from "@/lib/support/actions";
import { TicketFiledSheet } from "@/components/app/account/TicketFiledSheet";
import {
  DESCRIPTION_MAX,
  EMPTY_DRAFT,
  QUERY_KINDS,
  RELATED_KIND_TITLE,
  TOPIC_CHOICES,
  draftErrors,
  parseDraft,
  recordsForTopic,
  topicChoice,
  type DraftErrors,
  type QueryDraft,
  type QueryKind,
  type RelatedRecord,
} from "@/lib/support/new-query";
import { expectedResponse } from "@/lib/support/tickets";
import { IconPlate } from "@/components/ui/IconPlate";

const DRAFT_KEY = "nf_support_new_draft";

export type Filed = { reference: string; id?: string; photoNote?: string };

/**
 * Ask a question or report a problem, filed as a ticket with a reference.
 *
 * One screen, one primary action. The topic and the linked record are
 * chosen in the shared bottom sheet, as a list with a tick on the chosen
 * row. Everything typed is kept on this device until the ticket is filed, so
 * a reload, a dropped connection or a failed send never costs the member the
 * description; the draft is cleared only once the server has returned a
 * reference.
 *
 * The photo goes up after the ticket exists, because its storage folder is
 * the ticket's id. If that one step fails the ticket is still filed and the
 * success screen says to add the photo from the conversation.
 */
export function NewQueryForm({
  initialKind,
  initialTopic,
  records,
}: {
  /** From the link the member tapped; absent keeps the stored draft's kind. */
  initialKind: QueryKind | undefined;
  initialTopic: string | null;
  records: RelatedRecord[];
}) {
  const [draft, setDraft] = useState<QueryDraft>(() => ({
    ...EMPTY_DRAFT,
    kind: initialKind ?? EMPTY_DRAFT.kind,
    topic: topicChoice(initialTopic)?.code ?? null,
  }));
  const [hydrated, setHydrated] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"topic" | "record" | null>(null);
  const [filed, setFiled] = useState<Filed | null>(null);
  const [pending, start] = useTransition();
  const online = useOnline();
  const bodyRef = useRef<HTMLDivElement | null>(null);

  /* Restore what was typed on this device. The kind and topic the member
     arrived with win over a stored one, because the link they tapped is the
     newer intent. */
  useEffect(() => {
    let stored: QueryDraft | null = null;
    try {
      stored = parseDraft(window.localStorage.getItem(DRAFT_KEY));
    } catch {
      stored = null;
    }
    if (stored) {
      const restored = stored;
      setDraft((current) => ({
        ...restored,
        kind: initialKind ?? restored.kind,
        topic: current.topic ?? restored.topic,
      }));
    }
    setHydrated(true);
  }, [initialKind]);

  useEffect(() => {
    if (!hydrated || filed) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage blocked: the draft lives in memory for this visit.
    }
  }, [draft, hydrated, filed]);

  const topic = topicChoice(draft.topic);
  const offered = useMemo(() => recordsForTopic(draft.topic, records), [draft.topic, records]);

  const update = (next: Partial<QueryDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    if (next.topic !== undefined && errors.topic) setErrors((e) => ({ ...e, topic: undefined }));
    if (next.body !== undefined && errors.body) setErrors((e) => ({ ...e, body: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = draftErrors(draft);
    setErrors(found);
    setServerError(null);
    if (found.topic) {
      setSheet("topic");
      return;
    }
    if (found.body) {
      bodyRef.current?.querySelector("textarea")?.focus();
      return;
    }
    if (!online) {
      setServerError("You are offline. Your message is kept here; send it when you are back online.");
      return;
    }
    start(async () => {
      const result = await fileSupportTicket({
        topic: draft.topic ?? "other",
        kind: draft.kind,
        body: draft.body.trim(),
        ...(draft.related ? { related: { kind: draft.related.kind, id: draft.related.id } } : {}),
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      let photoNote: string | undefined;
      if (photo && result.data.id) {
        const uploaded = await uploadTicketPhoto(result.data.id, photo);
        if (!uploaded.ok) photoNote = uploaded.error;
      }
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clear.
      }
      setFiled({ reference: result.data.reference, id: result.data.id, photoNote });
    });
  };

  /* `filed` is set only from `fileSupportTicket`'s ok, so the sheet opens
     once, at filing, over the view that keeps the reference. */
  if (filed)
    return (
      <>
        <FiledView filed={filed} topic={draft.topic} />
        <TicketFiledSheet reference={filed.reference} />
      </>
    );

  const kindCopy = QUERY_KINDS[draft.kind];

  return (
    <form onSubmit={submit} className="space-y-block" noValidate data-testid="support-new-form">
      <Segmented
        options={[
          { value: "question", label: "Question" },
          { value: "problem", label: "Problem" },
        ]}
        value={draft.kind}
        onChange={(kind) => update({ kind })}
        semantics="radio"
        label="What kind of message"
        full
      />
      <p className="nf-body-sm -mt-group text-[var(--nf-content-secondary)]">{kindCopy.lede}</p>

      <section className="nf-sgroup" aria-label="Topic">
        <p className="nf-sgroup__label">What is it about?</p>
        <div className="nf-sgroup__body nf-panel nf-panel--card">
          <button
            type="button"
            className="nf-srow w-full cursor-pointer text-left"
            onClick={() => setSheet("topic")}
            aria-haspopup="dialog"
            aria-describedby={errors.topic ? "support-topic-error" : undefined}
            data-testid="support-topic"
          >
            <span className="nf-srow__body min-w-0">
              <span className="nf-srow__label">{topic ? topic.title : "Choose a topic"}</span>
              <span className="nf-srow__sub">{topic ? topic.hint : "Account, payment, booking, safety and more"}</span>
            </span>
            <UiIcon name="chevron-right" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
          </button>
          {offered.length > 0 && (
            <div className="border-t border-[var(--nf-border-subtle)]">
              {draft.related ? (
                <div className="nf-srow" data-testid="support-related-chosen">
                  <span className="nf-srow__body min-w-0">
                    <span className="nf-srow__label break-words">{draft.related.label}</span>
                    <span className="nf-srow__sub">Linked, so the team opens the right record</span>
                  </span>
                  <Button variant="quiet" size="sm" onClick={() => update({ related: null })} className="shrink-0">
                    Remove
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="nf-srow w-full cursor-pointer text-left"
                  onClick={() => setSheet("record")}
                  aria-haspopup="dialog"
                  data-testid="support-related"
                >
                  <span className="nf-srow__body min-w-0">
                    <span className="nf-srow__label">Link a record</span>
                    <span className="nf-srow__sub">Optional. Choose from your own records</span>
                  </span>
                  <UiIcon name="plus" size={16} className="shrink-0 text-[var(--nf-content-muted)]" />
                </button>
              )}
            </div>
          )}
        </div>
        {errors.topic && (
          <p id="support-topic-error" role="alert" className="nf-caption mt-row text-[var(--nf-state-error)]">
            {errors.topic}
          </p>
        )}
      </section>

      <div ref={bodyRef}>
      <TextArea
        label={draft.kind === "problem" ? "What happened?" : "Your question"}
        hint={
          draft.kind === "problem"
            ? "What happened, when, and what you expected instead."
            : "Ask it the way you would ask a person."
        }
        value={draft.body}
        onChange={(e) => update({ body: e.target.value })}
        rows={6}
        maxLength={DESCRIPTION_MAX}
        error={errors.body}
        data-testid="support-body"
      />
      </div>

      <PhotoField value={photo} onChange={setPhoto} disabled={pending} />

      <OfflineNote />

      {serverError && (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]" data-testid="support-new-error">
          {serverError}
        </p>
      )}

      <div className="space-y-row">
        <Button type="submit" variant="primary" size="lg" full loading={pending} disabled={pending} data-testid="support-send">
          Send to support
        </Button>
        <p className="nf-caption text-center text-[var(--nf-content-muted)]">
          {expectedResponse(draft.topic)} You get a reference now, and the reply in Messages, your notifications and
          your email.
        </p>
      </div>

      <Sheet open={sheet === "topic"} onOpenChange={(o) => setSheet(o ? "topic" : null)} title="What is it about?" closeLabel="Close" detents={[0.85]}>
        <ChoiceList
          label="Topics"
          items={TOPIC_CHOICES.map((choice) => ({ key: choice.code, title: choice.title, sub: choice.hint }))}
          selected={draft.topic}
          onPick={(key) => {
            const next = topicChoice(key);
            const keep = draft.related && next?.records.includes(draft.related.kind) ? draft.related : null;
            update({ topic: next?.code ?? null, related: keep });
            setSheet(null);
          }}
        />
      </Sheet>

      <Sheet open={sheet === "record"} onOpenChange={(o) => setSheet(o ? "record" : null)} title="Link a record" closeLabel="Close" detents={[0.85]}>
        <RecordList
          records={offered}
          selected={draft.related?.id ?? null}
          onPick={(record) => {
            update({ related: { kind: record.kind, id: record.id, label: record.label } });
            setSheet(null);
          }}
        />
      </Sheet>
    </form>
  );
}

/** Quiet rows, the chosen one ticked: the sheet list in the founder's first reference. */
function ChoiceList({
  label,
  items,
  selected,
  onPick,
}: {
  label: string;
  items: { key: string; title: string; sub?: string }[];
  selected: string | null;
  onPick(key: string): void;
}) {
  return (
    <ul role="listbox" aria-label={label} className="-mx-xs">
      {items.map((item) => {
        const chosen = item.key === selected;
        return (
          <li key={item.key} role="option" aria-selected={chosen}>
            <button
              type="button"
              onClick={() => onPick(item.key)}
              className="flex min-h-14 w-full cursor-pointer items-center gap-group rounded-[var(--nf-radius-control)] px-xs py-xs text-left hover:bg-[var(--nf-surface-inset)]"
              data-testid={`support-choice-${item.key}`}
            >
              <span className="min-w-0 flex-1">
                <span className="nf-body block font-semibold text-[var(--nf-content-primary)]">{item.title}</span>
                {item.sub && <span className="nf-caption block text-[var(--nf-content-muted)]">{item.sub}</span>}
              </span>
              {chosen && <UiIcon name="check" size={20} className="shrink-0 text-[var(--nf-content-link)]" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RecordList({
  records,
  selected,
  onPick,
}: {
  records: RelatedRecord[];
  selected: string | null;
  onPick(record: RelatedRecord): void;
}) {
  const groups = new Map<string, RelatedRecord[]>();
  for (const record of records) groups.set(record.kind, [...(groups.get(record.kind) ?? []), record]);
  return (
    <div className="space-y-group">
      {[...groups.entries()].map(([kind, list]) => (
        <section key={kind} aria-label={RELATED_KIND_TITLE[kind as RelatedRecord["kind"]]}>
          <p className="nf-caption mb-row font-semibold uppercase tracking-[var(--nf-tracking-label)] text-[var(--nf-content-muted)]">
            {RELATED_KIND_TITLE[kind as RelatedRecord["kind"]]}
          </p>
          <ul className="-mx-xs">
            {list.map((record) => {
              const chosen = record.id === selected;
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => onPick(record)}
                    aria-pressed={chosen}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-group rounded-[var(--nf-radius-control)] px-xs py-xs text-left hover:bg-[var(--nf-surface-inset)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="nf-body-sm block break-words font-semibold text-[var(--nf-content-primary)]">
                        {record.label}
                      </span>
                      {record.sub && (
                        <span className="nf-caption block break-words text-[var(--nf-content-muted)]">{record.sub}</span>
                      )}
                    </span>
                    {chosen && <UiIcon name="check" size={20} className="shrink-0 text-[var(--nf-content-link)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The receipt after filing: the reference, the clock, and the way into the thread. */
export function FiledView({ filed, topic }: { filed: Filed; topic: string | null }) {
  return (
    <div className="nf-panel nf-panel--card block p-card text-center" data-testid="support-filed" role="status">
      <IconPlate size="lg" className="mx-auto">
        <UiIcon name="headset" size={24} />
      </IconPlate>
      <h2 className="nf-h3 mt-group text-[var(--nf-content-primary)]">We have your message</h2>
      <p className="nf-body-sm mx-auto mt-row max-w-[40ch] text-[var(--nf-content-secondary)]">
        {expectedResponse(topic)} We have emailed you this reference and you will get a notification when the team
        replies.
      </p>
      <div className="mt-group flex justify-center">
        <span
          className="nf-numeric shrink-0 whitespace-nowrap rounded-[var(--nf-radius-control)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-sm py-xs text-[1.0625rem] font-bold tracking-wide text-[var(--nf-content-primary)]"
          data-testid="support-filed-reference"
        >
          {filed.reference}
        </span>
      </div>
      {filed.photoNote && <p className="nf-caption mt-group text-[var(--nf-state-warning)]">{filed.photoNote}</p>}
      <div className="mt-block space-y-row">
        {filed.id ? (
          <ButtonLink href={`/support/messages/${filed.id}`} variant="primary" size="lg" full>
            Open the conversation
          </ButtonLink>
        ) : null}
        <Link href="/support" className="nf-link-quiet inline-flex min-h-11 items-center font-semibold">
          Back to help and support
        </Link>
      </div>
    </div>
  );
}

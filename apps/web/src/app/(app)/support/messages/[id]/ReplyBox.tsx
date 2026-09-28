"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { replyToMyTicket } from "@/lib/support/ticket-reply";

/**
 * The member's reply on their own ticket.
 *
 * The draft stays in the box until the server says the message is written,
 * so a failed send never costs the person what they typed. The textarea is
 * the shared `TextArea`, which renders at 16px on a touch screen so iOS does
 * not zoom on focus.
 */
export function ReplyBox({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write your reply first.");
      return;
    }
    setError(undefined);
    setSent(false);
    start(async () => {
      const result = await replyToMyTicket({ ticketId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setSent(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="nf-panel nf-panel--card block space-y-row p-card-sm" data-testid="support-reply-form">
      <TextArea
        label="Reply to support"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          if (sent) setSent(false);
        }}
        rows={3}
        maxLength={4000}
        error={error}
        placeholder="Add anything the team should know"
      />
      <div className="flex flex-wrap items-center justify-between gap-row">
        <p className="nf-caption text-[var(--nf-content-muted)]" role="status">
          {sent ? "Sent. The team will see it on your ticket." : ""}
        </p>
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          Send reply
        </Button>
      </div>
    </form>
  );
}

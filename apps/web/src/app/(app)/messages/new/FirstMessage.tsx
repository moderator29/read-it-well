"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationWithMessage } from "@/lib/messages/actions";

/**
 * UX-P2-03: the first message, written before any thread exists. Sending it
 * opens the conversation and posts the message together; leaving the page
 * writes nothing, so an abandoned "Message" tap no longer puts an empty
 * thread in both inboxes or spends the daily new-conversation allowance.
 */
export function FirstMessage({ listingId, listingTitle }: { listingId: string; listingTitle: string | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startConversationWithMessage({ listingId, body });
      if (result.ok) router.replace(`/messages/${result.data.conversationId}`);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={send} className="nf-panel nf-panel--card grid gap-sm p-card" data-testid="first-message">
      <label className="grid gap-3xs">
        <span className="nf-label">
          {listingTitle ? `Your first message about ${listingTitle}` : "Your first message"}
        </span>
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Say hello, and ask what you want to know. Is it still available? Can you do an inspection this week?"
          className="nf-field"
        />
      </label>
      {error && (
        <p role="alert" className="nf-caption">
          {error}
        </p>
      )}
      <button type="submit" className="nf-btn nf-btn--primary nf-btn--full" disabled={pending || body.trim().length === 0}>
        Send
      </button>
    </form>
  );
}

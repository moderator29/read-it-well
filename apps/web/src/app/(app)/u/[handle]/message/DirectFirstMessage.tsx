"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { initial } from "@/lib/text/initial";
import { sendDirectMessage } from "@/lib/messages/direct-actions";

/**
 * THE FIRST MESSAGE TO A MEMBER, written from their profile. Sending opens the
 * one chat between the two people and posts the message together; leaving the
 * screen writes nothing, so an abandoned tap leaves no empty chat in either
 * inbox. The person is shown above the box so it is clear who is being
 * written to.
 */
export function DirectFirstMessage({
  handle,
  name,
  avatarUrl,
  copy,
}: {
  handle: string;
  name: string;
  avatarUrl: string;
  copy: { placeholder: string; hint: string; send: string; sending: string };
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await sendDirectMessage({ handle, body });
      if (result.ok) router.replace(`/messages/${result.data.conversationId}`);
      else setError(result.error);
    });
  };

  return (
    <form onSubmit={send} className="nf-panel nf-panel--card grid gap-sm p-card" data-testid="direct-first-message">
      <div className="flex items-center gap-sm">
        <span className="nf-people__avatar" aria-hidden="true">
          {avatarUrl ? <RemoteImage src={avatarUrl} alt="" width={96} height={96} sizes="48px" /> : <span>{initial(name)}</span>}
        </span>
        <span className="min-w-0">
          <span className="nf-people__name">{name}</span>
          <span className="nf-people__handle">@{handle}</span>
        </span>
      </div>
      <label className="grid gap-3xs">
        <span className="sr-only">{copy.placeholder}</span>
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.placeholder}
          className="nf-field"
          autoFocus
        />
      </label>
      <p className="nf-caption">{copy.hint}</p>
      {error ? (
        <p role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="spark" full loading={pending} disabled={pending || body.trim().length === 0}>
        {pending ? copy.sending : copy.send}
      </Button>
    </form>
  );
}

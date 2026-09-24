import "server-only";

import { sendEmail } from "../email/client";

/**
 * OPS-03: tell a HUMAN, not a table.
 *
 * Every alert used to end as a row in `public.risk_alerts`, readable only by
 * someone who opened `/admin/alerts`. Four days of "unauthorised" cron alerts
 * and an 11.5-hour catalogue outage went unnoticed that way. This is the one
 * door out of the building for a critical alert, and it leaves by up to two
 * routes, each switched on by the founder with one variable:
 *
 *   OPS_ALERT_EMAIL        an address that is read (a phone's mail app).
 *                          Sent through Resend directly, NOT through the
 *                          email outbox, whose drain is itself a cron.
 *   OPS_ALERT_WEBHOOK_URL  an https URL that takes a JSON POST and pushes it
 *                          to a phone: ntfy.sh/<topic>, a Slack or Discord
 *                          incoming webhook, a Better Stack heartbeat.
 *                          The body is `{"text": "...", "title": "..."}`.
 *
 * With neither set it returns `{ paged: false, reason: "not_configured" }`
 * and prints nothing more than one line, so an unconfigured environment is
 * visible in the function log without being noisy.
 *
 * This runs inside the app, so it cannot page when the app itself is down.
 * That half is the external uptime monitor pointed at `/api/health/catalogue`
 * (docs/DEPLOY.md, "Paging a human").
 *
 * Nothing personal goes out: the caller passes a machine `kind` and the
 * already-scrubbed alert text from `lib/alerts/record.ts`. Never throws.
 */
export type PageInput = {
  /** The alert kind, e.g. "catalogue.read_failed". */
  kind: string;
  /** One line a person reads first. */
  title: string;
  /** The scrubbed detail. */
  body: string;
};

export type PageOutcome =
  | { paged: true; via: ("email" | "webhook")[] }
  | { paged: false; reason: "not_configured" | "failed" };

const TIMEOUT_MS = 4_000;

function webhookUrl(): string | null {
  const raw = (process.env.OPS_ALERT_WEBHOOK_URL ?? "").trim();
  if (raw.length === 0) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function opsEmail(): string | null {
  const raw = (process.env.OPS_ALERT_EMAIL ?? "").trim();
  return raw.length > 0 ? raw : null;
}

function environmentLabel(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

export async function pageHuman(input: PageInput): Promise<PageOutcome> {
  const hook = webhookUrl();
  const email = opsEmail();
  if (!hook && !email) {
    console.warn(`[page] not sent kind=${input.kind} reason=not_configured (set OPS_ALERT_EMAIL or OPS_ALERT_WEBHOOK_URL)`);
    return { paged: false, reason: "not_configured" };
  }

  const env = environmentLabel();
  const title = `[Vallo ${env}] ${input.title}`.slice(0, 200);
  const text = `${title}\n\n${input.body}\n\nOpen alerts: /admin/alerts`.slice(0, 3_000);
  const via: ("email" | "webhook")[] = [];

  const jobs: Promise<void>[] = [];
  if (hook) {
    jobs.push(
      (async () => {
        try {
          const res = await fetch(hook, {
            method: "POST",
            headers: { "content-type": "application/json", Title: title.replace(/[^\x20-\x7e]/g, "") },
            body: JSON.stringify({ text, title }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
          });
          if (res.ok) via.push("webhook");
        } catch {
          /* The other route may still get through. */
        }
      })(),
    );
  }
  if (email) {
    jobs.push(
      (async () => {
        try {
          const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const result = await sendEmail({ to: email, subject: title, text, html: `<pre>${escaped}</pre>` });
          if (result.sent) via.push("email");
        } catch {
          /* As above. */
        }
      })(),
    );
  }
  await Promise.all(jobs);

  if (via.length === 0) {
    console.error(`[page] FAILED kind=${input.kind}: no route delivered`);
    return { paged: false, reason: "failed" };
  }
  return { paged: true, via };
}

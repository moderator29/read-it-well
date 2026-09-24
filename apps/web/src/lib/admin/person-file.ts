/**
 * V-90. THE PERSON FILE, READ WITHOUT TRUSTING.
 *
 * `public.admin_person_file` returns one JSON document: the person, a timeline
 * across every desk, the other accounts they share a device, mailbox, phone
 * or payout account with (the shared value itself never leaves the
 * database), and any upheld fraud stop their own keys match. This reads it
 * into a typed view; anything unreadable is dropped, and a document that is
 * not "ready" is "unknown" or "failed". Client-safe.
 */

export type PersonTimelineEntry = { at: string; desk: string; title: string; href: string };
export type PersonLink = {
  userId: string;
  name: string;
  via: "device" | "mailbox" | "phone" | "payout" | "nin";
  agentStatus: string | null;
  stoppedOn: string | null;
  fraudUpheld: boolean;
};

export type PersonFile =
  | { state: "unknown" }
  | { state: "failed" }
  | {
      state: "ready";
      senior: boolean;
      person: {
        userId: string;
        name: string | null;
        handle: string | null;
        joinedAt: string | null;
        roles: string[];
        agent: { id: string; name: string | null; status: string | null; tier: number; since: string | null } | null;
        checks: { kind: string; status: string; decidedAt: string | null }[];
        stop: { id: string; since: string | null; reason: string | null; fraudUpheldAt: string | null; fraudNote: string | null } | null;
      };
      timeline: PersonTimelineEntry[];
      linked: PersonLink[];
      matches: { kind: string; sentence: string }[];
    };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const VIA = new Set(["device", "mailbox", "phone", "payout", "nin"]);

/** Only an internal console path is ever linked; anything else is dropped to the audit desk. */
function safeHref(v: unknown): string {
  const s = str(v);
  return s && /^\/admin(\/[A-Za-z0-9_\-/]*)?$/.test(s) ? s : "/admin/audit";
}

export function readPersonFile(data: unknown): PersonFile {
  const root = obj(data);
  if (!root) return { state: "failed" };
  if (root.state === "unknown") return { state: "unknown" };
  if (root.state !== "ready") return { state: "failed" };
  const p = obj(root.person);
  const userId = str(p?.user_id);
  if (!p || !userId) return { state: "failed" };
  const agent = obj(p.agent);
  const stop = obj(p.stop);
  return {
    state: "ready",
    senior: root.senior === true,
    person: {
      userId,
      name: str(p.name),
      handle: str(p.handle),
      joinedAt: str(p.joined_at),
      roles: arr(p.roles).filter((r): r is string => typeof r === "string"),
      agent: agent && str(agent.id)
        ? {
            id: str(agent.id)!,
            name: str(agent.name),
            status: str(agent.status),
            tier: typeof agent.tier === "number" ? agent.tier : 0,
            since: str(agent.since),
          }
        : null,
      checks: arr(p.checks).flatMap((c) => {
        const o = obj(c);
        const kind = str(o?.kind);
        const status = str(o?.status);
        return kind && status ? [{ kind, status, decidedAt: str(o?.decided_at) }] : [];
      }),
      stop: stop && str(stop.id)
        ? {
            id: str(stop.id)!,
            since: str(stop.since),
            reason: str(stop.reason),
            fraudUpheldAt: str(stop.fraud_upheld_at),
            fraudNote: str(stop.fraud_note),
          }
        : null,
    },
    timeline: arr(root.timeline).flatMap((e) => {
      const o = obj(e);
      const at = str(o?.at);
      const title = str(o?.title);
      return at && title ? [{ at, desk: str(o?.desk) ?? "audit", title, href: safeHref(o?.href) }] : [];
    }),
    linked: arr(root.linked).flatMap((e) => {
      const o = obj(e);
      const id = str(o?.user_id);
      const via = str(o?.via);
      return id && via && VIA.has(via)
        ? [
            {
              userId: id,
              name: str(o?.name) ?? "An account",
              via: via as PersonLink["via"],
              agentStatus: str(o?.agent_status),
              stoppedOn: str(o?.stopped_on),
              fraudUpheld: o?.fraud_upheld === true,
            },
          ]
        : [];
    }),
    matches: arr(root.matches).flatMap((e) => {
      const o = obj(e);
      const sentence = str(o?.sentence);
      return sentence ? [{ kind: str(o?.kind) ?? "", sentence }] : [];
    }),
  };
}

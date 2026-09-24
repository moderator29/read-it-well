import type { DeviceDescription } from "./device";

/**
 * THE DEVICES SCREEN HAS TO LET A PERSON SPOT A STRANGER. V-19.
 *
 * The screen drew one card per `auth.sessions` row. That is the truth, and on
 * the QA member it is 91 cards: 89 of them read "Device not recorded" (the
 * token refreshes our own middleware made before it forwarded the reader's
 * header) and two read "Unrecognised device". Somebody deciding whether a
 * thief is in their account cannot scroll 91 identical cards and notice the
 * one that matters. The list was honest and useless.
 *
 * So the sessions are folded into ONE LINE PER DEVICE TYPE: every "Chrome on
 * Android" together, every unrecorded one together, every unrecognised one
 * together. Each line says how many sessions it holds, when the first of them
 * began and when any of them was last used, and it can be ended as a group.
 * The individual sessions are still there, one tap down, because a person who
 * wants to end exactly one of them should be able to.
 *
 * TWO RULES THE FOLD KEEPS.
 *
 *  - THE SESSION IN YOUR HAND IS NEVER FOLDED. It is returned on its own, so
 *    "End these 12" can never include the browser the person is reading this
 *    on without them saying so. A group is made of the OTHER sessions only.
 *  - THE MOST RECENTLY USED GROUP COMES FIRST. A stranger who signed in ten
 *    minutes ago is the line that should be at the top, not the oldest
 *    architecture artefact.
 *
 * The grouping key is built from the fixed proper nouns `describeDevice`
 * returns and never from a raw user agent, for the reason `device.ts` gives:
 * the header is attacker controlled, and grouping on it would let a stranger
 * split themselves into a line of their own naming.
 */

export type GroupableSession = {
  id: string;
  isCurrent: boolean;
  signedInAt: string;
  lastSeenAt: string;
  device: DeviceDescription;
};

export type SessionGroup<S extends GroupableSession = GroupableSession> = {
  /** Stable across renders; built only from the fixed device nouns. */
  key: string;
  device: DeviceDescription;
  /** The sessions in this group, most recently used first. Never the current one. */
  sessions: S[];
  /** The earliest sign-in in the group, ISO 8601. */
  firstSignedInAt: string;
  /** The latest use of any session in the group, ISO 8601. */
  lastSeenAt: string;
};

export type GroupedSessions<S extends GroupableSession = GroupableSession> = {
  current: S | null;
  groups: SessionGroup<S>[];
};

/** The one key a device type folds under. */
export function groupKey(device: DeviceDescription): string {
  if (device.kind !== "device") return device.kind;
  return `device:${device.browser ?? "-"}:${device.platform ?? "-"}`;
}

function time(iso: string): number {
  const at = Date.parse(iso);
  return Number.isFinite(at) ? at : Number.NEGATIVE_INFINITY;
}

export function groupSessions<S extends GroupableSession>(sessions: readonly S[]): GroupedSessions<S> {
  let current: S | null = null;
  const byKey = new Map<string, SessionGroup<S>>();

  for (const session of sessions) {
    if (session.isCurrent && current === null) {
      current = session;
      continue;
    }
    const key = groupKey(session.device);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        device: session.device,
        sessions: [session],
        firstSignedInAt: session.signedInAt,
        lastSeenAt: session.lastSeenAt,
      });
      continue;
    }
    existing.sessions.push(session);
    if (time(session.signedInAt) < time(existing.firstSignedInAt)) {
      existing.firstSignedInAt = session.signedInAt;
    }
    if (time(session.lastSeenAt) > time(existing.lastSeenAt)) {
      existing.lastSeenAt = session.lastSeenAt;
    }
  }

  const groups = [...byKey.values()];
  for (const group of groups) {
    group.sessions.sort((a, b) => time(b.lastSeenAt) - time(a.lastSeenAt));
  }
  groups.sort((a, b) => time(b.lastSeenAt) - time(a.lastSeenAt) || a.key.localeCompare(b.key));
  return { current, groups };
}

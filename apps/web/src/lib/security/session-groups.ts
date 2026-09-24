import type { DeviceSession } from "./sessions";

/**
 * Which sessions the devices screen lists one by one, and which it folds into
 * a single line.
 *
 * A session whose device was never recorded (our own server's agent, or none)
 * gives the reader nothing to recognise, and before the server client started
 * forwarding the visitor's User-Agent every session was one: the QA member's
 * list was 92 identical "Device not recorded" cards. Listing them one by one
 * buries the one row that matters, a real device the person does not know.
 *
 * So: every session with a recognisable or unrecognised device is listed, the
 * current session is always listed (it is the one they are holding), and the
 * rest are counted. "Sign out everywhere else" ends the counted ones too.
 */
export type SessionGroups = {
  listed: DeviceSession[];
  /** Non-current sessions with no recorded device, folded into one line. */
  unrecorded: { count: number; newestLastSeenAt: string | null };
};

export function groupSessions(sessions: DeviceSession[]): SessionGroups {
  const listed: DeviceSession[] = [];
  let count = 0;
  let newest: string | null = null;
  for (const session of sessions) {
    const unknown = session.device.kind === "server" || session.device.kind === "unrecorded";
    if (unknown && !session.isCurrent) {
      count += 1;
      if (newest === null || Date.parse(session.lastSeenAt) > Date.parse(newest)) newest = session.lastSeenAt;
    } else {
      listed.push(session);
    }
  }
  return { listed, unrecorded: { count, newestLastSeenAt: newest } };
}

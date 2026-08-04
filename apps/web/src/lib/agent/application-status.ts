import "server-only";

import { resolveSession } from "../actions/session";
import type { AgentApplicationStatus } from "./types";

/**
 * The caller's own agent application, read through their own RLS client.
 *
 * `/agents/status` used to render a fabricated application to anybody who
 * opened it: reference NF-AGT-00042, submitted 2026-05-24, status APPROVED,
 * from a seed object called "Demo Agent". A stranger who had never applied for
 * anything was shown an approved application with a reference number support
 * would then be asked about. That is DEAD_ENDS M10 and it breaks owner rules 13
 * and 22 on the same screen.
 *
 * `agent_applications_select_own` already says a person may read their own
 * application and nobody else's, so this file states no rule of its own: it
 * asks, and Postgres answers with the row or with nothing. Four states come
 * back and all four are designed, because "we could not tell" and "you have not
 * applied" are different answers and neither of them is "approved".
 */

export type ApplicationView = {
  /** The NF-AGT reference support asks for. */
  reference: string;
  status: AgentApplicationStatus;
  /** ISO timestamp, or null for an application still in draft. */
  submittedAt: string | null;
  /** ISO timestamp of the decision, or null while it is still open. */
  reviewedAt: string | null;
  /** What the reviewer wrote, when they wrote anything. */
  reviewNotes: string | null;
};

export type ApplicationStatusState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  /** Signed in, and no application exists for this account. */
  | { state: "none" }
  | { state: "found"; application: ApplicationView };

export async function readMyApplication(): Promise<ApplicationStatusState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  try {
    const { data, error } = await session.supabase
      .from("agent_applications")
      .select("reference, status, submitted_at, reviewed_at, review_notes")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    /* A read failure is not an absence. Saying "you have not applied" to
       somebody whose application we simply could not read would be the same
       kind of lie in the other direction, so it resolves to the unconfigured
       state, which promises nothing either way. */
    if (error) return { state: "unconfigured" };
    if (!data) return { state: "none" };

    return {
      state: "found",
      application: {
        reference: data.reference,
        status: data.status,
        submittedAt: data.submitted_at,
        reviewedAt: data.reviewed_at,
        reviewNotes: data.review_notes,
      },
    };
  } catch {
    return { state: "unconfigured" };
  }
}

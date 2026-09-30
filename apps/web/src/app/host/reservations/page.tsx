import type { Metadata } from "next";
import { countOf, getDictionary, type Dictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { HostReservationsBoard } from "./ReservationsBoard";
import { readHostTableBoard, type HostTableBoard } from "./board";

export const metadata: Metadata = {
  title: "Tables",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /host/reservations: where a venue answers a table.
 *
 * THIS ROUTE WAS PROMISED BY THE DATABASE AND DID NOT EXIST.
 * `private.notify_reservation` has sent a business host here since M7, and the
 * only board that could answer a table was `/agent/bookings`, behind
 * `getAgentContext`, which requires an `agents` row. A restaurant owner
 * onboarded through the host wizard has a `businesses` row and no `agents`
 * row, so they could be sent a table, be notified about it, tap the
 * notification, and land on a 404 with a guest waiting for an answer.
 *
 * The reader is `getHostReservations`, which leans on RLS alone and answers
 * for both spines, so this page never restates who owns which venue. See
 * `board.ts` for the one thing this surface adds to it and why.
 */
export default async function HostReservationsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host/reservations", "", "list");
    return (
      <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
        <EmptyState
          icon="concierge-bell"
          title={t.hostWorkspace.reservations.signedOutTitle}
          body={t.hostWorkspace.reservations.signedOutBody}
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  const read = await readHostTableBoard();

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <HostTablesBody
        copy={t.hostWorkspace}
        board={read.state === "ok" ? read.board : null}
        unavailable={read.state === "unavailable"}
      />
    </HostShell>
  );
}

/**
 * The board, apart from its reads, so the whole screen can be drawn from
 * fixtures in the preview harness and read against the register at 390 dark.
 * The route passes exactly what it read; nothing here fetches anything.
 */
export function HostTablesBody({
  board,
  unavailable = false,
  copy = getDictionary("en").hostWorkspace,
}: {
  board: HostTableBoard | null;
  /** True when the read itself failed. A dropped read is not an empty venue. */
  unavailable?: boolean;
  /** The host workspace words in the reader's language; English in the previews. */
  copy?: Dictionary["hostWorkspace"];
}) {
  if (unavailable || board === null) {
    return (
      <EmptyState
        icon="concierge-bell"
        title={copy.reservations.failedTitle}
        body={copy.reservations.failedBody}
        action={
          <ButtonLink href="/host/reservations" variant="primary" size="lg">
            Try again
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Tables</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {board.requests.length === 0
              ? "Nothing is waiting on you."
              : countOf(board.requests.length, "requestsWaiting")}
          </p>
        </div>
      </div>

      {board.total === 0 ? (
        /*
          NOTHING HAS EVER ARRIVED HERE, which is not the same as a cleared
          queue and must not be dressed as one. It says what will appear and
          what puts it here, and it states the two facts a venue most needs to
          be sure of: a table costs nobody anything, and nothing is held for a
          guest until the venue itself says yes.
        */
        <EmptyState
          icon="concierge-bell"
          title={copy.reservations.emptyTitle}
          body={copy.reservations.emptyBody}
          action={
            <ButtonLink href="/host" variant="secondary" size="lg">
              Your venue
            </ButtonLink>
          }
        />
      ) : (
        <HostReservationsBoard board={board} />
      )}
    </>
  );
}

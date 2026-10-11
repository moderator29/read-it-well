import { countOf, getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostReservationsBoard } from "./ReservationsBoard";
import type { HostTableBoard } from "./board";

/**
 * The board, apart from its reads, so the whole screen can be drawn from
 * fixtures in the preview harness and read against the register at 390 dark.
 * The route passes exactly what it read; nothing here fetches anything.
 */
export function HostTablesBody({
  board,
  unavailable = false,
  copy = getDictionary("en").hostWorkspace,
  words = getDictionary("en").experienceHost,
  locale = "en",
}: {
  board: HostTableBoard | null;
  /** True when the read itself failed. A dropped read is not an empty venue. */
  unavailable?: boolean;
  /** The host workspace words in the reader's language; English in the previews. */
  copy?: Dictionary["hostWorkspace"];
  /** The page's own words in the reader's language; English in the previews. */
  words?: Dictionary["experienceHost"];
  /** The reader's language, for the count; English in the previews. */
  locale?: Locale;
}) {
  if (unavailable || board === null) {
    return (
      <EmptyState
        icon="concierge-bell"
        title={copy.reservations.failedTitle}
        body={copy.reservations.failedBody}
        action={
          <ButtonLink href="/host/reservations" variant="primary" size="lg">
            {words.tryAgain}
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">{words.screens.tables}</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {board.requests.length === 0
              ? words.tablesNothingWaiting
              : countOf(board.requests.length, "requestsWaiting", locale)}
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
              {words.tablesYourVenue}
            </ButtonLink>
          }
        />
      ) : (
        <HostReservationsBoard board={board} />
      )}
    </>
  );
}

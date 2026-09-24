import { formatDate, getDictionary, type Locale } from "@vallo/i18n";
import { readArrivalCheckRecord } from "@/lib/stays/arrival-check-queries";

/**
 * V-91, IN THE CONSOLE: what the guest answered on arrival, with the photos.
 *
 * The photo links are signed for an hour through the staff read policy on
 * the private bucket. The ruling itself is made on the refund desk, where a
 * report has already filed its ask; this is the evidence beside it.
 */
export async function ArrivalCheckRecord({ bookingId, locale }: { bookingId: string; locale: Locale }) {
  const record = await readArrivalCheckRecord(bookingId);
  if (record === null || record === "unavailable") return null;
  const copy = getDictionary(locale).arrivalCheck;
  const when = formatDate(new Date(record.answeredAt), locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
  return (
    <section className="nf-panel nf-panel--card nf-admin-card mt-md p-md sm:p-lg" data-testid="admin-arrival-check">
      <h2 className="nf-h3">{copy.admin.title}</h2>
      <p className="nf-body-sm mt-xs">
        {record.answer === "as_listed"
          ? copy.admin.asListed
          : copy.admin.reported.replace("{reason}", copy.reasons[record.answer])}{" "}
        <span className="text-[var(--nf-content-muted)]">
          {when}
          {record.reference ? ` · ${record.reference}` : ""}
        </span>
      </p>
      {record.note && (
        <p className="nf-body-sm mt-xs">
          <span className="font-medium">{copy.admin.note}: </span>
          {record.note}
        </p>
      )}
      {record.photoUrls.length > 0 && (
        <ul className="mt-sm grid grid-cols-3 gap-xs">
          {record.photoUrls.map((url, index) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived private URL */}
              <img
                src={url}
                alt={copy.admin.photos.replace("{n}", String(index + 1))}
                className="aspect-square w-full rounded-[var(--nf-container-radius)] object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

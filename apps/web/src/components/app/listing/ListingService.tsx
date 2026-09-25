import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import type { ServiceFacts } from "@/lib/listings/service";

/**
 * What the service charge covers, on the listing page (V-68).
 *
 * "Serviced" leads only when the charge covers power, water and security,
 * with the sentence that says so: the word is derived from the answers and
 * never typed by the lister, which is the whole point. Then the covers as
 * tiles, how it is charged, and the kind of gate. Only what was answered is
 * drawn; with nothing answered the component is not mounted at all.
 */
export function ListingService({
  service,
  copy,
}: {
  service: ServiceFacts;
  copy: Dictionary["shape"]["service"];
}) {
  const lines: string[] = [];
  if (service.reconciled !== undefined) lines.push(service.reconciled ? copy.reconciled : copy.fixed);
  if (service.estateType) lines.push(copy.estateTypes[service.estateType]);
  return (
    <section aria-label={copy.title} data-testid="listing-service">
      <p className="nf-overline text-[var(--nf-content-muted)]">{copy.title}</p>
      {service.serviced && (
        <p className="nf-body-sm mt-inline-tight inline-flex items-start gap-inline-tight" data-testid="listing-serviced">
          <UiIcon name="bolt" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-brand-secondary)]" />
          <span>
            <strong>{copy.serviced}.</strong> {copy.servicedMeaning}
          </span>
        </p>
      )}
      {service.covers !== undefined &&
        (service.covers.length > 0 ? (
          <ul className="nf-spec-row nf-scroll-x mt-inline">
            {service.covers.map((cover) => (
              <li key={cover} className="nf-spec-tile">
                <span>{copy.covers[cover]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="nf-caption mt-inline text-[var(--nf-content-secondary)]">{copy.coversNone}</p>
        ))}
      {lines.length > 0 && (
        <p className="nf-caption mt-inline text-[var(--nf-content-secondary)]">{lines.join(". ")}.</p>
      )}
    </section>
  );
}

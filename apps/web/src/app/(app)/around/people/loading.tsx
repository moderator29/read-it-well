/**
 * The wait, on the people page: the field at its own height, two rows of
 * cards at their own width and the start of the list, so nothing moves when
 * the real page arrives.
 */
import { Skeleton } from "@/components/ui/Skeleton";
import { State } from "@/components/ui/State";
import "@/components/social/find/people-v2.css";

export default function LoadingPeople() {
  return (
    <State kind="loading" title="Looking for people" className="w-full">
      <div className="nf-ppl" aria-hidden="true">
        <Skeleton height="3.5rem" radius="xl" />
        {[0, 1].map((row) => (
          <div key={row} className="nf-ppl__section">
            <Skeleton width="9rem" height="1.25rem" radius="sm" />
            <div className="nf-ppl__row">
              {[0, 1, 2, 3].map((card) => (
                <Skeleton key={card} className="shrink-0" width="10.5rem" height="14rem" radius="xl" />
              ))}
            </div>
          </div>
        ))}
        <div className="nf-ppl__section">
          <Skeleton width="9rem" height="1.25rem" radius="sm" />
          <ul className="nf-ppl__list">
            {[0, 1, 2].map((row) => (
              <li key={row} className="nf-ppl__rowitem">
                <Skeleton circle width="3rem" className="shrink-0" />
                <span className="nf-ppl__who">
                  <Skeleton width="8rem" height="1rem" radius="sm" />
                  <Skeleton width="5rem" height="0.75rem" radius="sm" />
                </span>
                <Skeleton width="5.5rem" height="2.5rem" radius="pill" className="shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </State>
  );
}

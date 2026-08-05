"use client";

import { useActionState } from "react";
import {
  grantStandingBadge,
  revokeStandingBadge,
  type GrantReceipt,
} from "@/lib/admin/standing-actions";
import type { ManualGrant } from "@/lib/admin/standing-queries";
import type { ActionResult } from "@/lib/actions/envelope";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * The standing desk.
 *
 * One badge is granted rather than earned, and the whole design of this
 * surface is about never letting those two look alike. A grant needs a
 * handle, a badge and a reason, and the reason is required because it is the
 * record of the decision: "why does this person have this" must be answerable
 * a year later by somebody who was not in the room.
 *
 * Every row states plainly who granted it. A row with nobody's name against it
 * was earned, which the database guarantees by refusing a manual badge with a
 * null granted_by.
 */
export function StandingDesk({
  grants,
  manualBadges,
}: {
  grants: ManualGrant[];
  manualBadges: { code: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult<GrantReceipt> | null, FormData>(
    grantStandingBadge,
    null,
  );
  const [revokeState, revokeAction] = useActionState<
    ActionResult<{ userId: string }> | null,
    FormData
  >(revokeStandingBadge, null);

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------- grant */}
      <form action={formAction} noValidate className="nf-card p-4 sm:p-5">
        <h2 className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">
          Grant standing
        </h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          This is the only badge a person awards. Everything else on the platform is
          earned from real events, and granting one of those by hand would make every
          earned one worth less.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="nf-label">Member handle</span>
            <input
              type="text"
              name="handle"
              autoComplete="off"
              placeholder="adaobi"
              aria-invalid={fieldError("handle") ? true : undefined}
              className="nf-field"
            />
            {fieldError("handle") && (
              <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
                {fieldError("handle")}
              </span>
            )}
          </label>

          <label className="block">
            <span className="nf-label">Badge</span>
            <select name="badgeCode" className="nf-field" defaultValue={manualBadges[0]?.code ?? ""}>
              {manualBadges.map((badge) => (
                <option key={badge.code} value={badge.code}>
                  {badge.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="nf-label">Why</span>
          <textarea
            name="reason"
            rows={3}
            className="nf-field resize-y"
            placeholder="Answered forty questions in Yaba this month, every one of them useful."
            aria-invalid={fieldError("reason") ? true : undefined}
          />
          {fieldError("reason") && (
            <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
              {fieldError("reason")}
            </span>
          )}
        </label>

        {state && !state.ok && (
          <p
            role="alert"
            className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
          >
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-state-success)]"
          >
            <UiIcon name="verified" size={16} className="shrink-0" />
            Granted to @{state.data.handle}. Your name is on it.
          </p>
        )}

        <button
          type="submit"
          disabled={pending || manualBadges.length === 0}
          className="nf-btn nf-btn--primary mt-4 disabled:opacity-60"
        >
          {pending ? "Granting..." : "Grant badge"}
        </button>
      </form>

      {/* -------------------------------------------------------- record */}
      <section>
        <h2 className="nf-h3 mb-3 text-[1rem]">Every grant, and who signed for it</h2>
        {grants.length === 0 ? (
          <div className="nf-card p-6 text-center">
            <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
              Nobody has been granted standing yet
            </p>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              When you grant one it appears here with your name and your reason against
              it, permanently.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {grants.map((grant) => (
              <li key={`${grant.userId}-${grant.badgeCode}`} className="nf-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="nf-badge nf-badge--brand">{grant.badgeName}</span>
                  {/* `.nf-badge` alone paints no fill and no colour, so this
                      read as invisible text exactly where a revocation had to be
                      seen. It is a status, so it is a status pill. */}
                  {grant.revoked && <StatusPill tone="danger">Revoked</StatusPill>}
                  <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
                    {new Date(grant.grantedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-2 text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {grant.holder}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {grant.grantedByName
                    ? `Granted by ${grant.grantedByName}.`
                    : "Earned from real events, not granted by anybody."}
                  {grant.reason ? ` ${grant.reason}` : ""}
                </p>
                {grant.grantedByName && !grant.revoked && (
                  <form action={revokeAction} className="mt-3">
                    <input type="hidden" name="userId" value={grant.userId} />
                    <input type="hidden" name="badgeCode" value={grant.badgeCode} />
                    <button type="submit" className="nf-btn nf-btn--ghost nf-btn--sm">
                      Take it back
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {revokeState && !revokeState.ok && (
          <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-warning)]">
            {revokeState.error}
          </p>
        )}
      </section>
    </div>
  );
}

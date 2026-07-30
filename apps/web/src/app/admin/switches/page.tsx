import type { Metadata } from "next";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getFeatureFlags, type SwitchView } from "@/lib/admin/queries";
import { SwitchControl } from "../_components/AdminActions";
import { QueueHeader, QueueUnavailable, StatusChip, formatWhen } from "../_components/ui";

export const metadata: Metadata = { title: "Switches", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The kill switches.
 *
 * One row per switchable surface. The app treats a missing table, a missing row
 * or an unreachable database as enabled, so these switches can only ever turn
 * something off, never break it on. That is the whole design: an incident can
 * be contained in seconds without a deploy, and turning the switch back on
 * restores the surface exactly as it was.
 */
const LABELS: Record<string, string> = {
  bookings: "Bookings",
  wallet: "Wallet",
  messaging: "Messaging",
  assistant: "Assistant",
  support: "Support",
  agent_listings: "Agent listings",
  hybrid_hotels: "Partner hotels",
  hybrid_restaurants: "Partner restaurants",
};

const CONSEQUENCE: Record<string, string> = {
  bookings: "Guests cannot reserve or cancel a stay. Existing bookings are untouched.",
  wallet: "Funding, withdrawals and transfers stop. Balances and history are untouched.",
  messaging: "Guests cannot message agents and agents cannot reply. Past threads stay readable.",
  assistant: "The assistant stops answering. People can still search and browse.",
  support: "Support chat stops filing new tickets. Tickets already open stay open.",
  agent_listings: "Agents cannot create or edit a listing. Live listings stay live.",
  hybrid_hotels: "Partner hotel inventory drops out of search. First party stays remain.",
  hybrid_restaurants: "Partner restaurant inventory drops out of search.",
};

function SwitchRow({ flag }: { flag: SwitchView }) {
  const label = LABELS[flag.key] ?? flag.key;
  return (
    <li className="nf-card flex flex-wrap items-start gap-3 p-4 sm:p-5">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">{label}</span>
          <StatusChip
            label={flag.enabled ? "On" : "Off"}
            tone={flag.enabled ? "success" : "danger"}
          />
        </span>
        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {flag.note ?? "A switchable RentMe surface."}
        </span>
        <span className="mt-1 block text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          Switching off: {CONSEQUENCE[flag.key] ?? "This surface disappears for everyone until it is switched back on."}
        </span>
        <span className="mt-1 block text-[0.6875rem] text-[var(--nf-content-muted)]">
          Last changed {formatWhen(flag.updatedAt)}
        </span>
      </span>

      <SwitchControl flagKey={flag.key} label={label} enabled={flag.enabled} />
    </li>
  );
}

export default async function AdminSwitchesPage() {
  const flags = await getFeatureFlags();

  return (
    <div className="mx-auto max-w-3xl">
      <QueueHeader
        title="Switches"
        lede="Turn a surface off across RentMe without a deploy, then turn it back on when the incident is over. Nothing is deleted either way."
      />

      <p className="nf-card mb-4 flex gap-2.5 p-3.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
        <UiIcon name="bell" size={16} className="mt-0.5 shrink-0 text-[var(--nf-state-warning)]" />
        <span>
          Switching a surface off takes it away from everyone immediately,
          including people in the middle of using it. Work already saved is kept.
          Pages pick the change up within about thirty seconds. Every flip is
          written to the audit log with your name against it.
        </span>
      </p>

      {flags.state !== "ok" ? (
        <QueueUnavailable />
      ) : (
        <ul className="space-y-3">
          {flags.data.map((flag) => (
            <SwitchRow key={flag.key} flag={flag} />
          ))}
        </ul>
      )}
    </div>
  );
}

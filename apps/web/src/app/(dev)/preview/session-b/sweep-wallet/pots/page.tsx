import { PotsSection } from "@/components/app/wallet/PotsSection";
import type { Pot } from "@/lib/wallet/pots";

const POTS: Pot[] = [
  { id: "00000000-0000-4000-8000-0000000000p1", name: "Rent, January", targetMinor: 1_200_000_00, balanceMinor: 450_000_00, createdAt: new Date().toISOString() },
  { id: "00000000-0000-4000-8000-0000000000p2", name: "Moving costs", targetMinor: null, balanceMinor: 85_000_00, createdAt: new Date().toISOString() },
];

/** The savings pots section with two pots. */
export default function SweepPots() {
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <PotsSection pots={POTS} locale="en" />
    </div>
  );
}

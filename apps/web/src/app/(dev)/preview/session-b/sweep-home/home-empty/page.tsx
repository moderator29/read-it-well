import HomePage from "@/app/(app)/home/page";
import { SweepFrame } from "../Frame";

/**
 * `/home` THROUGH THE ROUTE'S OWN PAGE. This box cannot reach the database,
 * so every read comes back empty and the page draws its honest empty shelf,
 * which is the state this harness exists to photograph.
 */
export const dynamic = "force-dynamic";

export default async function SweepHomeEmpty() {
  return (
    <SweepFrame route="/home">
      <HomePage />
    </SweepFrame>
  );
}

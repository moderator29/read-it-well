import { notFound } from "next/navigation";

/**
 * /crypto/[id] goes dark with /crypto, for the same ruling and by the same
 * mechanism. See the note in `../page.tsx`: DEFERRED, NOT CANCELLED, and
 * `components/app/crypto/CoinDetail.tsx` stays where it is.
 */
export default function CoinPage() {
  notFound();
}

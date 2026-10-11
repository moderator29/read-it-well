import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * ONE REFERRAL: kept as an address, handed on to the referrals list (D85),
 * where every person's row already says where they stand. There is no
 * per-referral page because there is nothing more a member may read about one
 * person than that line (a first name and a stage; never a reason for a
 * review).
 */
export default function InviteReferralPage(): never {
  redirect("/rewards/referrals");
}

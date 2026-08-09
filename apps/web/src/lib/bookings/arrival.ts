import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { bestEffortEmail, sendMessage } from "../email/client";
import { bookingConfirmed, stayArrivalDetails, type ArrivalAccess } from "../email/messages";
import { contactForUser, emailMuted, type Contact } from "../email/recipients";

/**
 * One place where a confirmed stay is announced.
 *
 * There were four. The host accepting a request, the wallet payment, the
 * return-from-Paystack verify and the webhook each read the booking, read the
 * listing title, resolved the guest and sent the same email in their own
 * slightly different way. Four copies of one message is four chances to
 * disagree about who gets told what, and adding the arriving guest to all four
 * separately would have made it five.
 *
 * WHO GETS WHAT, and why it splits.
 *
 * The payer always gets the confirmation, because it is their money and their
 * booking. The arriving guest gets a separate email with no money in it at
 * all, because they did not pay and have no business being shown what somebody
 * spent on them.
 *
 * The gate details go to whoever is actually arriving, and to nobody else. If
 * the booking names a third party with an email address, that person gets them
 * and the payer's confirmation says so rather than repeating a gate code to
 * somebody in London who cannot use it. If the booking names nobody, the payer
 * is the one arriving and the details are theirs. If it names somebody with no
 * email address, there is no channel to that person, so the details go to the
 * payer to pass on, which is exactly what would have happened anyway.
 *
 * Reading `listing_access` here uses the service role rather than the guest's
 * own client, and that is deliberate rather than lax: this runs from a webhook
 * with no session at all. The disclosure is still bounded by the same rule the
 * RLS policy states, because the only addresses reached are the payer of a
 * CONFIRMED booking and the person that payer named on it.
 *
 * Nothing here throws. Every send is inside bestEffortEmail, which does nothing
 * at all without RESEND_API_KEY, so a platform with no mail configured takes
 * this path silently and the booking is confirmed either way.
 */

type AdminClient = SupabaseClient<Database>;

type BookingRow = {
  guest_id: string;
  listing_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_minor: number;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
};

const FALLBACK_TITLE = "your stay";

/** The gate row for a listing, or null when the host has recorded none. */
async function readAccess(
  admin: AdminClient,
  listingId: string,
): Promise<ArrivalAccess | null> {
  try {
    const { data } = await admin
      .from("listing_access")
      .select("estate_name, gate_directions, security_phone, access_code")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (!data) return null;
    const access: ArrivalAccess = {
      estateName: data.estate_name,
      gateDirections: data.gate_directions,
      securityPhone: data.security_phone,
      accessCode: data.access_code,
    };
    const anything = Object.values(access).some((field) => (field ?? "").trim().length > 0);
    return anything ? access : null;
  } catch {
    return null;
  }
}

async function readTitle(admin: AdminClient, listingId: string): Promise<string> {
  try {
    const { data } = await admin
      .from("listings")
      .select("title")
      .eq("id", listingId)
      .maybeSingle();
    const title = (data?.title ?? "").trim();
    return title.length > 0 ? title : FALLBACK_TITLE;
  } catch {
    return FALLBACK_TITLE;
  }
}

/**
 * Tell everybody entitled to know that a stay is confirmed.
 *
 * Best effort throughout and never throws: it runs after the database has
 * committed, so a mail failure must never turn a confirmed booking into an
 * error anybody sees.
 */
export async function announceConfirmedStay(
  admin: AdminClient,
  params: {
    bookingId: string;
    /** Kobo to quote as the total. Defaults to the booking's own total. */
    totalMinor?: number;
    /**
     * The signed-in person who triggered this, with the address already on
     * their session. Used only when they turn out to be the booking's own
     * payer, which this module checks rather than trusting.
     */
    actingUser?: { id: string; contact: Contact | null } | null;
  },
): Promise<void> {
  await bestEffortEmail(async () => {
    const { data } = await admin
      .from("bookings")
      .select(
        "guest_id, listing_id, check_in, check_out, nights, total_minor, guest_name, guest_phone, guest_email",
      )
      .eq("id", params.bookingId)
      .maybeSingle();
    const booking = (data ?? null) as BookingRow | null;
    if (!booking) return;

    const [listingTitle, access] = await Promise.all([
      readTitle(admin, booking.listing_id),
      readAccess(admin, booking.listing_id),
    ]);

    const arrivingName = (booking.guest_name ?? "").trim();
    const arrivingPhone = (booking.guest_phone ?? "").trim();
    const arrivingEmail = (booking.guest_email ?? "").trim();
    const arriving =
      arrivingName.length > 0 && arrivingPhone.length > 0
        ? { name: arrivingName, phone: arrivingPhone }
        : null;
    /* A third party we can actually reach. Named but unreachable means the
       payer keeps the gate details and passes them on. */
    const reachable = arriving !== null && arrivingEmail.length > 0;

    const totalMinor = params.totalMinor ?? booking.total_minor;
    const jobs: Promise<unknown>[] = [];

    /* The caller's own session address, but only when the caller really is
       this booking's payer. A host or an admin confirming somebody else's stay
       must never have their own address substituted for the guest's. */
    const hinted =
      params.actingUser && params.actingUser.id === booking.guest_id
        ? params.actingUser.contact
        : null;

    // ------------------------------------------------------------- the payer
    // "Bookings" on /settings governs this, including the fast path above.
    if (!(await emailMuted(admin, booking.guest_id, "bookings"))) {
      const payer = hinted ?? (await contactForUser(admin, booking.guest_id, "bookings"));
      if (payer) {
        const message = bookingConfirmed({
          guestName: payer.name,
          listingTitle,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          nights: booking.nights,
          totalMinor,
          arriving,
          access: reachable ? null : access,
        });
        jobs.push(sendMessage(payer.email, message));
      }
    }

    // --------------------------------------------------- the arriving guest
    // Deliberately NOT gated on the payer's notification preference. That
    // switch says "do not email me about bookings"; it is not consent given on
    // behalf of a third party, and the payer typed this address in themselves
    // precisely so we would use it. Silencing it would leave somebody standing
    // at a gate at 11pm with no code, which is the exact failure this whole
    // path exists to prevent.
    if (reachable && arriving) {
      const booked = hinted ?? (await contactForUser(admin, booking.guest_id));
      const message = stayArrivalDetails({
        arrivingName: arriving.name,
        bookedByName: booked?.name ?? null,
        listingTitle,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights: booking.nights,
        access,
      });
      jobs.push(sendMessage(arrivingEmail, message));
    }

    await Promise.allSettled(jobs);
  });
}

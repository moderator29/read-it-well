import { hotelRoomFeeSentence } from "@/lib/money/copy";
import { bpsAsPercentText } from "@/lib/money/percent";

/**
 * VALLO'S FEE ON A PAID HOTEL ROOM, AS THE HOST SCREENS SAY IT.
 *
 * Founder ruling 3 (13 October 2026): 10 percent (1,000 basis points) of the
 * charge, taken from the hotel's share, never added to the guest's price and
 * only on a paid booking. The database owns the rate
 * (`scoped_commission_rates`, scope `hotel_room`, pending pov06) and takes the
 * commission when the charge is split; this is only the sentence a host reads.
 * The percentage is formatted from the basis points, never typed into copy.
 *
 * `hotel-fee.test.ts` holds this number equal to the seed row in the pov06
 * migration, so the sentence cannot drift from the rate the database applies.
 *
 * What a hotel RECEIVED is never computed from this number: the revenue card
 * sums the commission and share written on each settled transaction
 * (`my_earnings_history`).
 */
export const HOTEL_ROOM_FEE_BPS = 1000;

export function hotelFeeSentence(): string {
  /* `hotelRoomFeeSentence` writes the number as given ("fee is 10 of the charge"),
     so the sign goes in here, as `legacyReserveSentence` writes its own. */
  return hotelRoomFeeSentence(`${bpsAsPercentText(HOTEL_ROOM_FEE_BPS)}%`);
}

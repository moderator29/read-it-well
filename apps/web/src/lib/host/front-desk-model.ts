import { buildFrontDesk, type FrontDesk, type StayEvents } from "./front-desk";
import { buildTapeChart, type TapeChart, type TapeInventory, type TapeRoomType, type TapeStay } from "./tape-chart";
import type { StayRow } from "./front-desk";

/**
 * The hotel's read, cut into the two views that draw it: the front desk and
 * the tape chart. Pure, so a page and a preview build the same thing from the
 * same rows.
 */
export type HotelInput = {
  today: string;
  roomTypes: readonly TapeRoomType[];
  inventory: readonly TapeInventory[];
  stays: readonly (TapeStay & StayRow)[];
  /** Null when the check-in marks could not be read. */
  events: StayEvents | null;
};

export type HotelModel = { desk: FrontDesk; chart: TapeChart };

export function buildHotelModel(input: HotelInput): HotelModel {
  return {
    desk: buildFrontDesk({ today: input.today, stays: input.stays, events: input.events }),
    chart: buildTapeChart({
      today: input.today,
      roomTypes: input.roomTypes,
      inventory: input.inventory,
      stays: input.stays,
    }),
  };
}

import type { Translation } from "../../fallback";
import { passcodeIg } from "./passcode";
import { deskIg } from "./desk";
import { frontDoorIg } from "./frontDoor";
import { landingRoomsIg } from "./landingRooms";
import { trustDoorsIg } from "./trustDoors";
import { shapeIg } from "./shape";
import { afterTheGateIg } from "./afterTheGate";
import { trustVisibleIg } from "./trustVisible";
import { platformIg } from "./platform";
import { priceCheckIg } from "./priceCheck";

/**
 * Every machine-drafted namespace for this locale, laid under the locale
 * file by `withFallback`. MACHINE DRAFTS, NOT FINAL: each namespace here is
 * recorded as `machine-draft` in `review-status.ts` until a native speaker
 * has read it.
 */
export const igDrafts = {
  passcode: passcodeIg,
  desk: deskIg,
  frontDoor: frontDoorIg,
  landingRooms: landingRoomsIg,
  trustDoors: trustDoorsIg,
  shape: shapeIg,
  afterTheGate: afterTheGateIg,
  trustVisible: trustVisibleIg,
  platform: platformIg,
  priceCheck: priceCheckIg,
} satisfies Translation;

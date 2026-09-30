import type { Translation } from "../../fallback";
import { passcodeYo } from "./passcode";
import { deskYo } from "./desk";
import { frontDoorYo } from "./frontDoor";
import { landingRoomsYo } from "./landingRooms";
import { trustDoorsYo } from "./trustDoors";
import { shapeYo } from "./shape";
import { afterTheGateYo } from "./afterTheGate";
import { trustVisibleYo } from "./trustVisible";
import { platformYo } from "./platform";
import { priceCheckYo } from "./priceCheck";

/**
 * Every machine-drafted namespace for this locale, laid under the locale
 * file by `withFallback`. MACHINE DRAFTS, NOT FINAL: each namespace here is
 * recorded as `machine-draft` in `review-status.ts` until a native speaker
 * has read it.
 */
export const yoDrafts = {
  passcode: passcodeYo,
  desk: deskYo,
  frontDoor: frontDoorYo,
  landingRooms: landingRoomsYo,
  trustDoors: trustDoorsYo,
  shape: shapeYo,
  afterTheGate: afterTheGateYo,
  trustVisible: trustVisibleYo,
  platform: platformYo,
  priceCheck: priceCheckYo,
} satisfies Translation;

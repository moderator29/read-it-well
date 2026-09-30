import type { Translation } from "../../fallback";
import { passcodeHa } from "./passcode";
import { deskHa } from "./desk";
import { frontDoorHa } from "./frontDoor";
import { landingRoomsHa } from "./landingRooms";
import { trustDoorsHa } from "./trustDoors";
import { shapeHa } from "./shape";
import { afterTheGateHa } from "./afterTheGate";
import { trustVisibleHa } from "./trustVisible";
import { platformHa } from "./platform";
import { priceCheckHa } from "./priceCheck";

/**
 * Every machine-drafted namespace for this locale, laid under the locale
 * file by `withFallback`. MACHINE DRAFTS, NOT FINAL: each namespace here is
 * recorded as `machine-draft` in `review-status.ts` until a native speaker
 * has read it.
 */
export const haDrafts = {
  passcode: passcodeHa,
  desk: deskHa,
  frontDoor: frontDoorHa,
  landingRooms: landingRoomsHa,
  trustDoors: trustDoorsHa,
  shape: shapeHa,
  afterTheGate: afterTheGateHa,
  trustVisible: trustVisibleHa,
  platform: platformHa,
  priceCheck: priceCheckHa,
} satisfies Translation;

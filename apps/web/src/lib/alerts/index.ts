/**
 * `import { recordAlert } from "@/lib/alerts"` is the contract every job and
 * webhook writes through to raise an alert on the admin alerts desk.
 */
export {
  recordAlert,
  alertTitle,
  alertDescription,
  scrubDetail,
  type AlertInput,
  type AlertOutcome,
  type AlertSeverity,
} from "./record";

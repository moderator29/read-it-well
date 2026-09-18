/**
 * `import { recordAlert } from "@/lib/alerts"` is the contract every job and
 * webhook writes through (BUILD_06_LEDGER section 2.1, cron alerting).
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

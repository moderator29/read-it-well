import { getDictionary } from "@vallo/i18n";

/**
 * SCUML item 15: the gates' refusal (RM175) in words. The admin is told why
 * and where to act; the member is told nothing that would tip them off.
 * Plain module, shared by the admin and member actions.
 */
export const EDD_GATE_CODE = "RM175";

export function isEddGateRefusal(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === EDD_GATE_CODE;
}

export function eddGateMessage(audience: "admin" | "member"): string {
  const gate = getDictionary("en").complianceRisk.gate;
  return audience === "admin" ? gate.admin : gate.member;
}

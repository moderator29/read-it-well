import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import { OPEN_STATUSES, isOpenApplication } from "./open-application";

describe("an open application", () => {
  it("is one a reviewer or the applicant still has to move", () => {
    expect(isOpenApplication("SUBMITTED")).toBe(true);
    expect(isOpenApplication("UNDER_REVIEW")).toBe(true);
    expect(isOpenApplication("MORE_INFO_REQUIRED")).toBe(true);
  });

  it("is never a draft or a decided one", () => {
    for (const status of ["DRAFT", "APPROVED", "REJECTED", "SUSPENDED", "", null, undefined]) {
      expect(isOpenApplication(status), String(status)).toBe(false);
    }
  });

  it("names only statuses the database has", () => {
    for (const status of OPEN_STATUSES) {
      expect(Constants.public.Enums.agent_application_status).toContain(status);
    }
  });
});

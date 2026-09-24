import { redirect } from "next/navigation";

/**
 * THE FIRM'S DOOR IS CLOSED UNTIL APPROVAL CAN MAKE A FIRM.
 *
 * `FirmRegisterForm` (GOVERNING-05) is kept, but this route no longer draws it.
 * Approving a firm application creates one agent and nothing else: no agency
 * business, no `firm_members` row, no `agents.firm_id`, so no listing could
 * ever say "listed by <firm>". Collecting a CAC number and a team for a firm
 * that will not exist is a promise with nothing behind it. A firm's principal
 * is sent to the agent form, which gives them exactly what approval gives them.
 * Restore the form here when approval creates the firm.
 */
export default function FirmRegistrationPage(): never {
  redirect("/profile/setup/agent");
}

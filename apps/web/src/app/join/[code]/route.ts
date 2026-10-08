import { inviteHandOff } from "../hand-off";

/** An invite link: keeps the code, then the sign-up door (`../hand-off.ts`). */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return inviteHandOff(request, (await params).code);
}

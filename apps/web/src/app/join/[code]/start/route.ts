import { inviteHandOff } from "../../hand-off";

/**
 * A5. The old invite door's "Create your account" address, kept so a link
 * already shared or bookmarked still works; the same hand-off as `/join/<code>`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return inviteHandOff(request, (await params).code);
}

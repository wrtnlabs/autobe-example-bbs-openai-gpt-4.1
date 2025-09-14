import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Moderator Authorization Provider
 *
 * Authenticates JWT for moderator role, verifies moderator status and linkage, checks for account validity.
 * - The JWT payload.id MUST be the top-level user_account ID (discuss_board_user_accounts.id).
 * - Moderator role is linked via discuss_board_members and discuss_board_moderators (user_account → member → moderator).
 * - Ensures all soft-delete, revoked, or inactive status are enforced on all related identities.
 */
export async function moderatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Step 1: Find active member via user_account_id
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: payload.id,
      deleted_at: null,
      status: "active"
    },
    select: { id: true }
  });

  if (member === null) {
    throw new ForbiddenException("You're not an active member");
  }

  // Step 2: Find active moderator by member_id, ensure no revoked_at, not deleted, status active
  const moderator = await MyGlobal.prisma.discuss_board_moderators.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
      revoked_at: null,
      status: "active"
    }
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not an active moderator");
  }

  return payload;
}

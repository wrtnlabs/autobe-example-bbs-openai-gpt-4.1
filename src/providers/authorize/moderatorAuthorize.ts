import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * JWT authentication and database validation for the moderator role.
 * - Verifies Bearer token and decodes using shared jwtAuthorize.
 * - Checks payload.type for proper role enforcement (must be 'moderator').
 * - Confirms corresponding moderator exists, is active, and not deleted/revoked/suspended in discussion_board_moderators and user table.
 * - Always uses payload.id (top-level user ID from discussion_board_users) in query.
 *
 * @param request HTTP request with headers.authorization (Bearer {token})
 * @returns ModeratorPayload - decoded payload if authenticated and authorized
 * @throws ForbiddenException if not moderator or entity invalid/revoked
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

  // Check for existence and activeness in moderator table (no 'user' in where)
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst({
    where: {
      user_id: payload.id, // Link moderator -> user
      is_active: true,
      revoked_at: null,
      deleted_at: null,
      OR: [
        { suspended_until: null },
        { suspended_until: { lt: new Date() } },
      ],
    },
  });

  if (moderator === null) {
    throw new ForbiddenException("You're not enrolled or your moderator privileges have been revoked.");
  }

  // Additional check: ensure user account itself is valid (not deleted or suspended)
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_suspended: false,
    },
  });

  if (user === null) {
    throw new ForbiddenException("Your user account is inactive, deleted, or suspended.");
  }

  return payload;
}

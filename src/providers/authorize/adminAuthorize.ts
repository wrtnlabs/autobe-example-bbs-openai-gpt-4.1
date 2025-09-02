import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Provider for admin JWT authorization.
 * Verifies token, checks role discriminator, and ensures the user is an active, not-deleted admin.
 * Returns AdminPayload on success, throws exception if not authorized.
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query admin: Remove invalid 'user' filter
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      user_id: payload.id,
      deleted_at: null,
      is_active: true,
      revoked_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Now check the user table for required conditions
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_suspended: false,
    },
  });
  if (user === null) {
    throw new ForbiddenException("User account is not eligible for admin role");
  }

  return payload;
}

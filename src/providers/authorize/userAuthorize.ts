import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authorize and authenticate standard user members based on JWT and DB state.
 *
 * @param request HTTP request object containing the authorization header
 * @returns UserPayload on successful verification and DB check
 * @throws ForbiddenException if the user is not active or does not exist
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // User existence and validation: only allow active, non-deleted, non-suspended users
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_suspended: false,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}

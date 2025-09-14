import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

/**
 * Administrator authentication provider for JWT-based authorization.
 * @param request HTTP request object containing the Authorization header
 * @returns AdministratorPayload object with authenticated user info
 * @throws ForbiddenException if not administrator or enrollment invalid
 */
export async function administratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Top-level user: discuss_board_user_accounts
  // JWT payload.id === discuss_board_user_accounts.id
  // Administrator extends: discuss_board_members (member_id) → discuss_board_user_accounts (user_account_id)
  // So: member_id → user_account_id === payload.id
  const administrator = await MyGlobal.prisma.discuss_board_administrators.findFirst({
    where: {
      // Find admin that is not deleted, not revoked, status 'active'
      deleted_at: null,
      revoked_at: null,
      status: "active",
      // Join member → user_account
      member: {
        deleted_at: null,
        status: "active",
        user_account_id: payload.id,
        userAccount: {
          deleted_at: null,
          status: "active",
        },
      },
    },
  });

  if (!administrator) {
    throw new ForbiddenException("You're not enrolled as administrator");
  }

  return payload;
}

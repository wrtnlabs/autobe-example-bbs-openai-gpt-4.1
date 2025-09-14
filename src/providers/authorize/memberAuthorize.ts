import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Authorization provider for 'member' role. Verifies JWT, checks top-level account linkage, and active status.
 * @param request HTTP request object (should contain headers with JWT Authorization)
 * @returns Authenticated MemberPayload
 * @throws ForbiddenException if the user is not an active enrolled member
 */
export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is always the top-level user_account id
  // Find the member linked to the user_account id, ensure both member and user_account are valid/active/not deleted
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: payload.id,
      deleted_at: null,
      status: "active",
      userAccount: {
        deleted_at: null,
        status: "active",
      },
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled as an active member");
  }

  return payload;
}

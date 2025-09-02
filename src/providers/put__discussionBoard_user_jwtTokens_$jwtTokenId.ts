import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update (revoke) a user's JWT token session by ID (owned session only).
 *
 * Update the revocation (logout) status or device metadata of a JWT session
 * record. Enforces session ownership – only allows the authenticated user to
 * update/revoke their own session. Forbids updates if the token session is
 * already revoked. Only mutable fields are allowed.
 *
 * @param props - Input object
 * @param props.user - Authenticated user context ({ id, type })
 * @param props.jwtTokenId - Session UUID to update (must belong to user)
 * @param props.body - Fields to update (may include revoked_at and device_info)
 * @returns Updated JWT token session object (all fields)
 * @throws {Error} If no such session, not owned by user, soft-deleted, or
 *   already revoked
 */
export async function put__discussionBoard_user_jwtTokens_$jwtTokenId(props: {
  user: UserPayload;
  jwtTokenId: string & tags.Format<"uuid">;
  body: IDiscussionBoardJwtToken.IUpdate;
}): Promise<IDiscussionBoardJwtToken> {
  const { user, jwtTokenId, body } = props;
  // 1. Fetch token session owned by user, not deleted
  const token = await MyGlobal.prisma.discussion_board_jwt_tokens.findFirst({
    where: {
      id: jwtTokenId,
      discussion_board_user_id: user.id,
      deleted_at: null,
    },
  });
  if (!token) {
    throw new Error("Token session not found or does not belong to user");
  }
  // 2. If already revoked, forbid update
  if (token.revoked_at !== null && token.revoked_at !== undefined) {
    throw new Error("Token session is already revoked");
  }
  // 3. Prepare update fields (inline, only allowed updates)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_jwt_tokens.update({
    where: { id: jwtTokenId },
    data: {
      revoked_at: body.revoked_at ?? undefined,
      device_info: body.device_info ?? undefined,
      updated_at: now,
    },
  });
  // 4. Map and return result with ISO8601 conversion for all date/datetime fields
  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    token: updated.token,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    revoked_at: updated.revoked_at ? toISOStringSafe(updated.revoked_at) : null,
    device_info: updated.device_info ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

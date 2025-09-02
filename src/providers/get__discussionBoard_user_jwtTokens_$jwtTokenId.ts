import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve all information about a single JWT token session by id.
 *
 * Returns complete information for a specific JWT token session by its unique
 * identifier (UUID). Provides session token, issue/expiry/revocation state,
 * device metadata, and compliance/audit information for user self-service
 * session review. Only the requesting user's own token (i.e., matching user.id)
 * may be accessed.
 *
 * @param props - The request properties
 * @param props.user - Authenticated user context (must own the JWT session)
 * @param props.jwtTokenId - The UUID id of the JWT token session to retrieve
 * @returns The full JWT token session record for the given id
 * @throws {Error} If the token does not exist, is deleted, or does not belong
 *   to the user
 */
export async function get__discussionBoard_user_jwtTokens_$jwtTokenId(props: {
  user: UserPayload;
  jwtTokenId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardJwtToken> {
  const { user, jwtTokenId } = props;

  const token = await MyGlobal.prisma.discussion_board_jwt_tokens.findFirst({
    where: {
      id: jwtTokenId,
      discussion_board_user_id: user.id,
      deleted_at: null,
    },
  });
  if (!token) {
    throw new Error("JWT token not found or not accessible.");
  }
  return {
    id: token.id,
    discussion_board_user_id: token.discussion_board_user_id,
    token: token.token,
    issued_at: toISOStringSafe(token.issued_at),
    expires_at: toISOStringSafe(token.expires_at),
    revoked_at: token.revoked_at ? toISOStringSafe(token.revoked_at) : null,
    device_info: token.device_info ?? null,
    created_at: toISOStringSafe(token.created_at),
    updated_at: toISOStringSafe(token.updated_at),
    deleted_at: token.deleted_at ? toISOStringSafe(token.deleted_at) : null,
  };
}

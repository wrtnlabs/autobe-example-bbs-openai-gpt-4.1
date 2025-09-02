import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete a user's JWT token session by id for privacy/audit hygiene.
 *
 * Soft delete (remove) a JWT token session from visibility for the
 * authenticated user. The deleted_at field is set to hide the session in user
 * interfaces, but the record is retained for audit and compliance. This does
 * not terminate the actual session if the token itself is still valid and not
 * previously revoked.
 *
 * The operation verifies the session's ownership by the requesting user.
 * Attempts to delete (soft-delete) sessions not owned by the user are denied.
 * Already deleted or non-existent sessions result in an error message. This
 * supports user-driven session hygiene and privacy controls.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.jwtTokenId - Unique identifier of the JWT token session to be
 *   soft deleted (UUID)
 * @returns Void
 * @throws {Error} When the session does not exist, is already deleted, or not
 *   owned by the user
 */
export async function delete__discussionBoard_user_jwtTokens_$jwtTokenId(props: {
  user: UserPayload;
  jwtTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the JWT token session owned by the user and not already deleted
  const tokenRow = await MyGlobal.prisma.discussion_board_jwt_tokens.findFirst({
    where: {
      id: props.jwtTokenId,
      deleted_at: null,
    },
  });
  if (!tokenRow) {
    throw new Error("Session not found or already deleted");
  }
  // 2. Check ownership
  if (tokenRow.discussion_board_user_id !== props.user.id) {
    throw new Error("Forbidden: Token session does not belong to the user");
  }
  // 3. Soft-delete by setting deleted_at
  await MyGlobal.prisma.discussion_board_jwt_tokens.update({
    where: { id: props.jwtTokenId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

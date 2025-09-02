import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update (e.g., revoke) a refresh token to invalidate a session by ID.
 *
 * Updates a specific refresh token record's metadata, generally to revoke a
 * session (set revoked_at) or update device/session information, for audit and
 * compliance purposes. This action supports user-initiated single-device logout
 * or administrative forced logout scenarios. Only mutable fields (revoked_at,
 * device_info) are updatable; all other fields remain immutable for security
 * and traceability. Endpoint enforces strict access control so that users may
 * only update their own sessions and admins can act on all. Error conditions
 * include invalid payload, forbidden field update attempts, and access denied.
 * Related APIs include list, retrieve, and delete token operations.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this operation
 * @param props.refreshTokenId - The ID of the refresh token to update
 * @param props.body - Update payload for mutable fields (revoked_at,
 *   device_info)
 * @returns The updated refresh token as an API DTO
 * @throws {Error} When refresh token is not found, or record already
 *   soft-deleted
 */
export async function put__discussionBoard_admin_refreshTokens_$refreshTokenId(props: {
  admin: AdminPayload;
  refreshTokenId: string & tags.Format<"uuid">;
  body: IDiscussionBoardRefreshToken.IUpdate;
}): Promise<IDiscussionBoardRefreshToken> {
  const { admin, refreshTokenId, body } = props;

  // Ensure record exists and is not deleted
  const record =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findFirst({
      where: {
        id: refreshTokenId,
        deleted_at: null,
      },
    });
  if (!record) throw new Error("Refresh token not found");

  // Prepare now timestamp
  const now = toISOStringSafe(new Date());

  // Perform update for only mutable fields
  const updated = await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshTokenId },
    data: {
      revoked_at: body.revoked_at ?? undefined,
      device_info: body.device_info ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    refresh_token: updated.refresh_token,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    revoked_at: updated.revoked_at ? toISOStringSafe(updated.revoked_at) : null,
    device_info: updated.device_info ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

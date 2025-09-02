import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a single refresh token record by its unique identifier (UUID).
 *
 * Provides all non-sensitive metadata about the session refresh token,
 * including the user reference, expiration and issuance times, device context,
 * and revocation/deletion status. The actual token value is included here as
 * DTO requires, but access is controller-protected and restricted to
 * admin-authenticated sessions.
 *
 * Only returns information for refresh tokens that are not soft-deleted. Throws
 * an error if the token is not found or has been deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the request
 * @param props.refreshTokenId - The unique UUID of the refresh token to
 *   retrieve
 * @returns Detailed refresh token record (with all metadata fields mapped and
 *   all datetimes as ISO8601 strings)
 * @throws {Error} If the refresh token does not exist or has been soft-deleted
 */
export async function get__discussionBoard_admin_refreshTokens_$refreshTokenId(props: {
  admin: AdminPayload;
  refreshTokenId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRefreshToken> {
  const record =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findFirstOrThrow({
      where: {
        id: props.refreshTokenId,
        deleted_at: null,
      },
    });
  return {
    id: record.id,
    discussion_board_user_id: record.discussion_board_user_id,
    refresh_token: record.refresh_token,
    issued_at: toISOStringSafe(record.issued_at),
    expires_at: toISOStringSafe(record.expires_at),
    revoked_at:
      record.revoked_at != null ? toISOStringSafe(record.revoked_at) : null,
    device_info: record.device_info ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at != null ? toISOStringSafe(record.deleted_at) : null,
  };
}

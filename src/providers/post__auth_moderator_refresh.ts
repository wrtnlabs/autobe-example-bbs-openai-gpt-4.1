import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh a moderator's JWT access token by valid refresh token (session
 * extension/auth renewal).
 *
 * This operation refreshes the JWT access token for a moderator whose refresh
 * token remains valid. It looks up the provided refresh token (from
 * discussion_board_refresh_tokens) associated with a valid
 * discussion_board_user and confirms the user's ongoing moderator privileges
 * (using the discussion_board_moderators table: is_active=true,
 * revoked_at=null). On successful validation, a new access token (and a rotated
 * refresh token) is issued with updated expiration, matching the session's
 * permissions and audit policies.
 *
 * - Validates the refresh token exists, is not expired/revoked/deleted.
 * - Confirms associated user exists and moderator privileges are active.
 * - Rotates the refresh token for enhanced security.
 * - Returns a new JWT access/refresh token pair in standard IAuthorizationToken
 *   structure, with ISO 8601 date-times and moderator profile.
 *
 * @param props - Request properties
 * @param props.body - Object containing the "refresh_token" to be refreshed.
 * @returns New token information and moderator session profile.
 * @throws {Error} If the refresh token is invalid, expired, revoked, or if user
 *   is deleted or moderator privileges are lost.
 */
export async function post__auth_moderator_refresh(props: {
  body: IDiscussionBoardModerator.IRefresh;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { refresh_token } = props.body;
  const now = toISOStringSafe(new Date());

  // Step 1: Look up refresh token (must not be revoked, expired, or deleted)
  const refreshTokenRow =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findFirst({
      where: {
        refresh_token,
        revoked_at: null,
        deleted_at: null,
        expires_at: { gt: now },
      },
    });
  if (!refreshTokenRow)
    throw new Error("Invalid, expired, revoked, or deleted refresh token");

  // Step 2: Get user (must not be soft-deleted)
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: {
      id: refreshTokenRow.discussion_board_user_id,
      deleted_at: null,
    },
  });
  if (!user) throw new Error("User not found or deleted");

  // Step 3: Ensure moderator exists, active, not revoked, not deleted
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        user_id: user.id,
        deleted_at: null,
        is_active: true,
        revoked_at: null,
      },
    },
  );
  if (!moderator)
    throw new Error("Moderator privileges revoked or account inactive");

  // Step 4: Rotate refresh token
  const newRefreshToken = v4() as string;
  const refreshIssuedAt = toISOStringSafe(new Date());
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7d
  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshTokenRow.id },
    data: {
      refresh_token: newRefreshToken,
      issued_at: refreshIssuedAt,
      expires_at: refreshExpiresAt,
      revoked_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 5: Issue new access token
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1h
  const accessPayload = {
    id: user.id,
    type: "moderator",
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  return {
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    moderator: {
      id: moderator.id,
      user_id: moderator.user_id,
      assigned_at: toISOStringSafe(moderator.assigned_at),
      revoked_at: moderator.revoked_at
        ? toISOStringSafe(moderator.revoked_at)
        : null,
      is_active: moderator.is_active,
      suspended_until: moderator.suspended_until
        ? toISOStringSafe(moderator.suspended_until)
        : null,
      created_at: toISOStringSafe(moderator.created_at),
      updated_at: toISOStringSafe(moderator.updated_at),
      deleted_at: moderator.deleted_at
        ? toISOStringSafe(moderator.deleted_at)
        : null,
    },
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh a user JWT access token using a valid refresh token
 * (discussion_board_refresh_tokens table).
 *
 * This endpoint allows an authenticated user to refresh their JWT access token
 * by presenting a valid, non-revoked refresh token, as stored in
 * discussion_board_refresh_tokens. It ensures single-token-per-device and that
 * the user is not suspended or deleted as per the discussion_board_users schema
 * (is_suspended must be false, deleted_at null). On verification and success,
 * it rotates the refresh token and issues new tokens. This process maintains
 * session continuity for authenticated users while aligning with compliance,
 * audit, and security policies enforced through schema relationships on
 * discussion_board_refresh_tokens and discussion_board_users.
 *
 * @param props - Request properties
 * @param props.body - The request body containing the refresh_token string
 * @returns The refreshed user token response, with new access and refresh
 *   tokens
 * @throws {Error} When the refresh token is invalid, expired, revoked, or the
 *   user is suspended/deleted.
 */
export async function post__auth_user_refresh(props: {
  body: IDiscussionBoardUser.IRefresh;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  const { body } = props;

  // Step 1: Find the active refresh token record
  const refreshRow =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findFirst({
      where: {
        refresh_token: body.refresh_token,
        revoked_at: null,
        deleted_at: null,
      },
    });
  if (!refreshRow) {
    throw new Error("Invalid, expired, or revoked refresh token");
  }

  // Step 2: Check expiration
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(refreshRow.expires_at) <= now) {
    throw new Error("Refresh token expired");
  }

  // Step 3: Find user and check status
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: refreshRow.discussion_board_user_id,
      is_suspended: false,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new Error("User not active or not found");
  }

  // Step 4: Revoke current refresh token
  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshRow.id },
    data: {
      revoked_at: now,
      deleted_at: now,
      updated_at: now,
    },
  });

  // Step 5: Create new refresh token record (rotated)
  const refreshTokenValue = v4();
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7d
  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4(),
      discussion_board_user_id: user.id,
      refresh_token: refreshTokenValue,
      issued_at: now,
      expires_at: expiresAt,
      revoked_at: null,
      device_info: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 6: Build user summary
  const userSummary: IDiscussionBoardUserSummary = {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name ?? undefined,
    is_verified: user.is_verified,
    is_suspended: user.is_suspended,
  };

  // Step 7: Issue new JWT access token
  const jwtPayload = { id: user.id, type: "user" };
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60),
  ); // 1hr
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Step 8: Build and return response matching IDiscussionBoardUser.IAuthorized
  return {
    user: userSummary,
    token: {
      access: accessToken,
      refresh: refreshTokenValue,
      expired_at: accessExpiredAt,
      refreshable_until: expiresAt,
    },
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Refresh admin JWT access and refresh tokens using a valid refresh token for
 * session management.
 *
 * This operation allows an active admin to refresh authentication tokens. It
 * verifies the refresh token (must exist in `discussion_board_refresh_tokens`,
 * `revoked_at` is null, `expires_at` is in the future), rotates the token,
 * generates new access/refresh tokens, ensures the admin is active and not
 * suspended, and logs the activity for audit compliance.
 *
 * @param props - Request properties
 * @param props.body - Refresh token request payload for admin session token
 *   renewal. Must include a valid refresh token string.
 * @returns An object with the admin profile and new token information.
 * @throws {Error} If the refresh token is missing, revoked, expired, invalid,
 *   or if the referenced admin/user is not active.
 */
export async function post__auth_admin_refresh(props: {
  body: IDiscussionBoardAdmin.IRefresh;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Verify and decode the refresh token using JWT
  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Step 2: Lookup the refresh token in DB
  const dbRefresh =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findUnique({
      where: { refresh_token },
    });
  if (
    !dbRefresh ||
    dbRefresh.revoked_at !== null ||
    dbRefresh.expires_at < new Date()
  ) {
    throw new Error("Refresh token revoked or expired");
  }

  // Step 3: Verify associated user is not suspended
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: dbRefresh.discussion_board_user_id },
  });
  if (!user || user.is_suspended) {
    throw new Error("User is not active or is suspended");
  }

  // Step 4: Verify admin record is active and not revoked
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { user_id: user.id },
  });
  if (!admin || !admin.is_active || admin.revoked_at !== null) {
    throw new Error("Admin privileges have been revoked or are inactive");
  }

  // Step 5: Invalidate (revoke) old refresh token
  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { refresh_token },
    data: { revoked_at: toISOStringSafe(new Date()) },
  });

  // Step 6: Generate new refresh token and set durations
  const new_refresh_token = v4();
  const now = toISOStringSafe(new Date());
  const access_token_expires_at = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refresh_token_expires_at = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ); // 30 days

  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_user_id: user.id as string & tags.Format<"uuid">,
      refresh_token: new_refresh_token,
      issued_at: now,
      expires_at: refresh_token_expires_at,
      revoked_at: null,
      device_info: dbRefresh.device_info ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 7: Generate new JWT access token (admin payload)
  const access_token = jwt.sign(
    { id: user.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );

  // Step 8: Audit log the action
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: user.id as string & tags.Format<"uuid">,
      actor_role: "admin",
      action_type: "admin_refresh",
      target_object: null,
      description: "Admin token refreshed.",
      created_at: now,
    },
  });

  // Step 9: Return admin info and tokens, branding all times using toISOStringSafe
  return {
    token: {
      access: access_token,
      refresh: new_refresh_token,
      expired_at: access_token_expires_at,
      refreshable_until: refresh_token_expires_at,
    },
    admin: {
      id: admin.id as string & tags.Format<"uuid">,
      user_id: admin.user_id as string & tags.Format<"uuid">,
      assigned_at: toISOStringSafe(admin.assigned_at),
      revoked_at: admin.revoked_at ? toISOStringSafe(admin.revoked_at) : null,
      is_active: admin.is_active,
      suspended_until: admin.suspended_until
        ? toISOStringSafe(admin.suspended_until)
        : null,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    },
  };
}

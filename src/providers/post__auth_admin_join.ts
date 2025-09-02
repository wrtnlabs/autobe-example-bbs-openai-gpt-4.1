import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Register a new administrator account in the discussion_board_admins table.
 *
 * This operation enables system administrators to register their administrator
 * accounts for the discussionBoard platform. Only existing users with completed
 * email verification (is_verified = true) may be elevated. Upon successful
 * registration, an admin record is created, and audit logs are updated. JWT
 * tokens are issued for API authentication, and all date values use ISO 8601
 * string branding.
 *
 * @param props - Request parameter object
 * @param props.body - Admin registration payload (must include reference to
 *   already verified user ID).
 * @returns Admin session authorization response, containing session tokens and
 *   admin profile.
 * @throws {Error} If user does not exist, is not verified, or admin already
 *   exists for that user.
 */
export async function post__auth_admin_join(props: {
  body: IDiscussionBoardAdmin.ICreate;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { body } = props;
  // 1. Check user existence & verification
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: body.user_id },
    select: { id: true, is_verified: true },
  });
  if (!user) throw new Error("User with given id does not exist.");
  if (user.is_verified !== true)
    throw new Error("User must be email verified to be assigned admin role.");

  // 2. Ensure admin record does not already exist for this user
  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: {
        user_id: body.user_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existingAdmin) throw new Error("Admin already exists for this user.");

  // 3. Prepare UUID and timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const adminId: string & tags.Format<"uuid"> = v4();
  const auditId: string & tags.Format<"uuid"> = v4();

  // 4. Create new admin record
  const created = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      user_id: body.user_id,
      assigned_at: now,
      revoked_at: null,
      is_active: true,
      suspended_until: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Write audit log
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: auditId,
      actor_id: null,
      actor_role: "system",
      action_type: "admin_registration",
      target_object: body.user_id,
      description: `Admin registered for user_id ${body.user_id}`,
      created_at: now,
    },
  });

  // 6. Issue JWT tokens
  const expiresInSec = 60 * 60; // 1 hour
  const refreshInSec = 7 * 24 * 60 * 60; // 7 days
  const accessExp = new Date(Date.now() + expiresInSec * 1000);
  const refreshExp = new Date(Date.now() + refreshInSec * 1000);
  const jwtPayload = {
    id: created.id,
    type: "admin",
  };
  // Use auto-injected jwt import for signing
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: expiresInSec,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...jwtPayload },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshInSec,
      issuer: "autobe",
    },
  );

  // 7. Compose and return response
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExp),
      refreshable_until: toISOStringSafe(refreshExp),
    },
    admin: {
      id: created.id,
      user_id: created.user_id,
      assigned_at: toISOStringSafe(created.assigned_at),
      revoked_at: null,
      is_active: created.is_active,
      suspended_until: null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: null,
    },
  };
}

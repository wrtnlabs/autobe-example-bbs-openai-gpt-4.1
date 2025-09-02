import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate and login an active admin account for the
 * discussion_board_admins table.
 *
 * This endpoint validates admin credentials, ensures account is an active
 * administrator, issues JWT authentication tokens, updates session tables, last
 * login time, and logs the login attempt for audit/compliance purposes.
 *
 * @param props - Request properties
 * @param props.body - Admin login payload with required email and password
 * @returns IDiscussionBoardAdmin.IAuthorized, containing JWTs and admin record
 * @throws {Error} When credentials are invalid, the user is not an active
 *   admin, not verified, suspended, or if login fails for any compliance
 *   reason
 */
export async function post__auth_admin_login(props: {
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { email, password } = props.body;
  const now = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1h from now
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7d from now

  // 1. Find active (not deleted) user by email
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!user) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: null,
        actor_role: "system",
        action_type: "admin_login",
        target_object: email,
        description: "Login failed: user not found",
        created_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  // 2. Check verified and not suspended
  if (!user.is_verified) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: user.id,
        actor_role: "admin",
        action_type: "admin_login",
        target_object: user.id,
        description: "Login failed: user not verified",
        created_at: now,
      },
    });
    throw new Error("Email must be verified before login");
  }
  if (
    user.is_suspended &&
    user.suspended_until &&
    new Date(user.suspended_until).getTime() > Date.now()
  ) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: user.id,
        actor_role: "admin",
        action_type: "admin_login",
        target_object: user.id,
        description: "Login failed: account suspended",
        created_at: now,
      },
    });
    throw new Error("Account is suspended");
  }

  // 3. Find active admin record for user
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      user_id: user.id,
      is_active: true,
      revoked_at: null,
      deleted_at: null,
    },
  });
  if (!admin) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: user.id,
        actor_role: "admin",
        action_type: "admin_login",
        target_object: user.id,
        description: "Login failed: not an active admin",
        created_at: now,
      },
    });
    throw new Error("Not an active admin");
  }

  // 4. Password verify
  const valid = await MyGlobal.password.verify(password, user.password_hash);
  if (!valid) {
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: user.id,
        actor_role: "admin",
        action_type: "admin_login",
        target_object: user.id,
        description: "Login failed: invalid password",
        created_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  // 5. Issue access & refresh JWT tokens
  // Use global 'jwt' (not MyGlobal.jwt)
  const adminPayload = { id: user.id, type: "admin" as const };
  const accessToken = jwt.sign(adminPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...adminPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Record token sessions
  await MyGlobal.prisma.discussion_board_jwt_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_user_id: user.id,
      token: accessToken,
      issued_at: now,
      expires_at: accessExpiresAt,
      revoked_at: null,
      device_info: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_user_id: user.id,
      refresh_token: refreshToken,
      issued_at: now,
      expires_at: refreshExpiresAt,
      revoked_at: null,
      device_info: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 7. Update last_login_at for user
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // 8. Audit success
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: user.id,
      actor_role: "admin",
      action_type: "admin_login",
      target_object: user.id,
      description: "Admin login success",
      created_at: now,
    },
  });

  // 9. Return tokens and admin record, type conversions for dates
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
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

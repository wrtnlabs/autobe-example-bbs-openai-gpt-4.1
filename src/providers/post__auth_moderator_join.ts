import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Register a new moderator account and issue initial tokens
 * (discussion_board_users + discussion_board_moderators).
 *
 * This operation allows a new moderator to register an account in the system.
 * It creates a new row in discussion_board_users (which stores authentication
 * credentials for all user-like roles) and issues a JWT access/refresh token
 * pair with role='moderator'. The operation requires (and validates) a unique
 * email and username—the fields enforced by the discussion_board_users schema.
 * During registration, password_hash is stored securely, and is_verified is set
 * to false until the moderator completes email confirmation. Upon user
 * creation, the discussion_board_moderators table is updated to link this user
 * with moderator privileges (with assigned_at timestamp set to now, is_active
 * true, and revoked_at null). Security-critical fields such as password_hash
 * and email must adhere to complexity and uniqueness requirements, and any
 * business rule violation will be rejected. This endpoint does not permit
 * immediate login until email is verified, as managed by other schema tables
 * (verification flows not explicitly handled by this call). Works in
 * conjunction with moderator login, token refresh, and email verification
 * APIs.
 *
 * @param props - Request properties
 * @param props.body - Moderator registration info (email, username, password,
 *   display_name, consent)
 * @returns JWT access and refresh tokens as well as moderator record
 * @throws {Error} When email or username already exists, or other DB errors
 */
export async function post__auth_moderator_join(props: {
  body: IDiscussionBoardModerator.IJoin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  // Uniqueness check (up front to return meaningful error)
  const duplicate = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      OR: [{ email: body.email }, { username: body.username }],
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Email or username already exists");

  // Password hashing
  const password_hash = await MyGlobal.password.hash(body.password);
  const now = toISOStringSafe(new Date());

  const user_id = v4() as string & tags.Format<"uuid">;
  // Create user record
  await MyGlobal.prisma.discussion_board_users.create({
    data: {
      id: user_id,
      email: body.email,
      username: body.username,
      display_name: body.display_name ?? undefined,
      password_hash,
      is_verified: false,
      is_suspended: false,
      suspended_until: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create moderator record
  const moderator_id = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: moderator_id,
      user_id,
      assigned_at: now,
      revoked_at: null,
      is_active: true,
      suspended_until: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // JWT tokens with correct moderator payload
  const access_expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refresh_expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const access_payload = {
    id: user_id,
    type: "moderator" as const,
  };
  const access = jwt.sign(access_payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { id: user_id, type: "moderator" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const token = {
    access,
    refresh,
    expired_at: toISOStringSafe(access_expiry),
    refreshable_until: toISOStringSafe(refresh_expiry),
  };

  // Return moderator object
  const moderator: IDiscussionBoardModerator = {
    id: moderator_id,
    user_id,
    assigned_at: now,
    revoked_at: null,
    is_active: true,
    suspended_until: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  return { token, moderator };
}

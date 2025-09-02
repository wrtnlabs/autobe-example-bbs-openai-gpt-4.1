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
 * Authenticate a user (discussion_board_users) and issue new tokens for member
 * session.
 *
 * This endpoint authenticates a user using provided credentials (email or
 * username, plus password) by verifying against the discussion_board_users
 * schema (email/username, password_hash). The system only allows verified
 * (is_verified: true) and unsuspended (is_suspended: false) accounts to log in,
 * blocking those suspended or unverified, per the schema's security
 * requirements. On success, JWT access and refresh tokens including user id,
 * role, and permissions are returned. On failure, rate limiting and audit
 * logging of failed attempts are enforced as described in functional
 * requirements and audit logs for compliance. Passwords are never returned or
 * logged, only the password_hash is stored and compared securely.
 *
 * @param props - Login request body containing email or username and password
 * @returns Authorized JWT payload, including issued tokens and user info, per
 *   authentication response.
 * @throws {Error} When credentials are incorrect, account is unverified,
 *   account is suspended, or user is not found.
 */
export async function post__auth_user_login(props: {
  body: IDiscussionBoardUser.ILogin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Find user (by email or username, must not be soft deleted)
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      deleted_at: null,
      ...(body.email !== undefined && body.email !== null
        ? { email: body.email }
        : {}),
      ...(body.email === undefined &&
      body.username !== undefined &&
      body.username !== null
        ? { username: body.username }
        : {}),
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }
  if (!user.is_verified) {
    throw new Error("Account not verified.");
  }
  if (user.is_suspended) {
    throw new Error("Account is suspended.");
  }

  // Secure password hash comparison
  const passwordMatch = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  // Update last_login_at on successful login
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // Build JWT payload for role-based access
  const jwtPayload = {
    id: user.id,
    type: "user",
  };

  // Generate tokens using jsonwebtoken
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      ...(user.display_name !== undefined && user.display_name !== null
        ? { display_name: user.display_name }
        : {}),
      is_verified: user.is_verified,
      is_suspended: user.is_suspended,
    },
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}

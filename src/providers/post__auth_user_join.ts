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
 * Register a new standard user member (discussion_board_users table) and issue
 * tokens.
 *
 * Allows unauthenticated guests to sign up as a standard user by providing a
 * unique email, username, password, optional display_name and terms consent.
 * Sets is_verified: false, is_suspended: false. Email and username are unique.
 * Initiates out-of-band verification flow, never returns plain password. On
 * success, issues JWT tokens with user id, role ('user'), and expiration.
 *
 * @param props - Registration payload (body: IDiscussionBoardUser.ICreate)
 * @returns Authorized user and tokens (IAuthorized interface)
 * @throws {Error} If uniqueness constraint fails or other registration error
 *   occurs
 */
export async function post__auth_user_join(props: {
  body: IDiscussionBoardUser.ICreate;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  const { body } = props;

  // Hash the password using MyGlobal.password utility
  const password_hash = await MyGlobal.password.hash(body.password);
  // Prepare required date fields (ISO strings)
  const now = toISOStringSafe(new Date());

  // Prepare required fields for new user (all required by schema)
  // id must be supplied - no @default
  const userData = {
    id: v4() as string & tags.Format<"uuid">,
    email: body.email,
    username: body.username,
    password_hash,
    is_verified: false,
    is_suspended: false,
    created_at: now,
    updated_at: now,
    ...(body.display_name !== undefined
      ? { display_name: body.display_name }
      : {}),
  };

  // Create user in database
  let user;
  try {
    user = await MyGlobal.prisma.discussion_board_users.create({
      data: userData,
    });
  } catch (err) {
    // Rethrow error (uniqueness violation will bubble to API)
    throw err;
  }

  // Generate JWT access/refresh tokens and their expiry times
  const accessExpiryMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const issuedAt = new Date();
  const expiredAt = toISOStringSafe(
    new Date(issuedAt.getTime() + accessExpiryMs),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(issuedAt.getTime() + refreshExpiryMs),
  );

  // Use user.id and 'user' role as per UserPayload structure
  const access = jwt.sign(
    { id: user.id, type: "user" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: user.id, type: "user" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    user: {
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
      username: user.username,
      display_name: user.display_name ?? undefined,
      is_verified: user.is_verified,
      is_suspended: user.is_suspended,
    },
    token: {
      access,
      refresh,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}

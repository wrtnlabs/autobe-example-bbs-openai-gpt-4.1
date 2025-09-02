import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Authenticate moderator and issue JWT/refresh tokens for session.
 *
 * Authenticates the moderator by verifying provided email/username and password
 * against discussion_board_users, ensuring account is verified, not suspended,
 * deleted, or revoked, and that an active moderator status exists. Issues JWT
 * access and refresh tokens, persists tokens in session tables, and returns
 * token payload along with moderator profile.
 *
 * @param props - Login request, containing moderator credentials
 *   (email/username and password)
 * @returns JWT token/refresh token and moderator profile structure following
 *   IDiscussionBoardModerator.IAuthorized
 * @throws Error when credentials are invalid, account is unverified, suspended,
 *   deleted, or no moderator privileges exist (inc. revoked/suspended/expired)
 */
export async function post__auth_moderator_login(props: {
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { email, password } = props.body;
  // 1. Find user by (email or username), deleted_at must be null
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      OR: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }],
      deleted_at: null,
    },
  });
  if (!user) throw new Error("Moderator account not found or deleted");

  // 2. Confirm moderator status. Moderator record must be active, not revoked, not deleted
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        user_id: user.id,
        is_active: true,
        revoked_at: null,
        deleted_at: null,
      },
    },
  );
  if (!moderator)
    throw new Error("Moderator privileges missing, revoked, or inactive");

  // 3. Check verified status
  if (!user.is_verified) throw new Error("Moderator account not verified");

  // 4. Check suspension state
  if (user.is_suspended) throw new Error("Moderator account is suspended");
  if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
    throw new Error(
      "Moderator account is currently suspended until " +
        toISOStringSafe(user.suspended_until),
    );
  }
  // (Likewise, block login if moderator-level suspension exists)
  if (
    moderator.suspended_until &&
    new Date(moderator.suspended_until) > new Date()
  ) {
    throw new Error(
      "Moderator privileges are currently suspended until " +
        toISOStringSafe(moderator.suspended_until),
    );
  }

  // 5. Password check (MyGlobal.password is required, per login op rules)
  const passwordOk = await MyGlobal.password.verify(
    password,
    user.password_hash,
  );
  if (!passwordOk) throw new Error("Invalid moderator credentials");

  // 6. Token generation: compute issued/expiration times
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // 7. Compose JWT payload per AdminPayload interface (jwt import is auto-supplied)
  const jwtPayload = {
    id: user.id,
    type: "moderator",
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "moderator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 8. Persist access/refresh token to database for session validation/audit
  const jwtSession = await MyGlobal.prisma.discussion_board_jwt_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_user_id: user.id,
      token: accessToken,
      issued_at: now,
      expires_at: accessExpires,
      revoked_at: null,
      device_info: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const refreshSession =
    await MyGlobal.prisma.discussion_board_refresh_tokens.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_user_id: user.id,
        refresh_token: refreshToken,
        issued_at: now,
        expires_at: refreshExpires,
        revoked_at: null,
        device_info: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 9. Return IAuthorizationToken + moderator profile with all date/datetime fields as strings
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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

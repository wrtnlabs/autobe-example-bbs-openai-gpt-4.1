import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Moderator login and JWT token issuance (discuss_board_moderators,
 * discuss_board_user_accounts).
 *
 * This endpoint securely authenticates a moderator by email and password,
 * verifies the linked user account and moderator status, issues JWT tokens,
 * tracks session metadata, and returns all relevant session and role
 * information for restricted access.
 *
 * @param props - The input data for moderator login (email/password
 *   credentials) - no authentication required for login endpoint.
 * @param props.body - Moderator authentication credentials (email and password)
 * @returns Authorized moderator session details and JWT tokens for
 *   authenticated API access.
 * @throws {Error} If credentials are invalid, user is not verified/active, or
 *   privilege is missing/revoked.
 */
export async function post__auth_moderator_login(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardModerator.ILogin;
}): Promise<IDiscussBoardModerator.IAuthorized> {
  const { body } = props;
  // Step 1: Find user account by email (active, verified, not deleted)
  const account = await MyGlobal.prisma.discuss_board_user_accounts.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
      status: "active",
      email_verified: true,
    },
  });
  if (!account) {
    throw new Error("Invalid credentials or inactive user account");
  }
  // Step 2: Check password
  const passwordValid = await MyGlobal.password.verify(
    body.password,
    account.password_hash,
  );
  if (!passwordValid) {
    throw new Error("Invalid credentials");
  }
  // Step 3: Find corresponding member
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: account.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!member) {
    throw new Error("No active member found for this login");
  }
  // Step 4: Find moderator assignment
  const moderator = await MyGlobal.prisma.discuss_board_moderators.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
      status: "active",
      revoked_at: null,
    },
  });
  if (!moderator) {
    throw new Error("Moderator privileges not assigned, suspended, or revoked");
  }
  // Step 5: Generate JWT tokens
  const now = toISOStringSafe(new Date());
  const accessExpRaw = new Date(Date.now() + 1000 * 60 * 60); // 1h
  const refreshExpRaw = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7d
  const accessExp = toISOStringSafe(accessExpRaw);
  const refreshExp = toISOStringSafe(refreshExpRaw);
  const jwtId = v4();
  const payload = { id: account.id, type: "moderator" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
    jwtid: jwtId,
  });
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Step 6: Record session in discuss_board_jwt_sessions
  await MyGlobal.prisma.discuss_board_jwt_sessions.create({
    data: {
      id: v4(),
      user_account_id: account.id,
      jwt_id: jwtId,
      refresh_token_hash: await MyGlobal.password.hash(refreshToken),
      user_agent: "", // Not available in props context
      ip_address: "", // Not available in props context
      issued_at: now,
      expires_at: accessExp,
      created_at: now,
      updated_at: now,
    },
  });
  // Step 7: Build and return the authorized response
  return {
    id: moderator.id,
    member_id: moderator.member_id,
    assigned_by_administrator_id: moderator.assigned_by_administrator_id,
    assigned_at: toISOStringSafe(moderator.assigned_at),
    revoked_at: moderator.revoked_at
      ? toISOStringSafe(moderator.revoked_at)
      : undefined,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: {
      access: access,
      refresh: refreshToken,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
    member: {
      id: member.id,
      nickname: member.nickname,
      status: member.status,
    },
  };
}

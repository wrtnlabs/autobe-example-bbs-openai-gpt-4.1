import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";

/**
 * Authenticate a discussBoard member (discuss_board_user_accounts,
 * discuss_board_members); issue new JWT tokens after validating credentials and
 * status.
 *
 * This operation verifies the provided email and password against stored
 * discuss_board_user_accounts. Login only succeeds for accounts with status
 * "active", email_verified == true, and deleted_at == null. On successful
 * login, new JWT access and refresh tokens are generated, a new session is
 * stored in discuss_board_jwt_sessions, and user_account.last_login_at is
 * updated. The response includes tokens and member info as per
 * IDiscussBoardMember.IAuthorized.
 *
 * @param props - The login payload (email + password) for the member
 * @returns Full member+token response if credentials and eligibility validated;
 *   throws on any error/validation failure.
 * @throws {Error} If credentials are invalid, the account is
 *   deleted/unverified/ineligible, or member mapping is missing.
 */
export async function post__auth_member_login(props: {
  body: IDiscussBoardMember.ILogin;
}): Promise<IDiscussBoardMember.IAuthorized> {
  const { email, password } = props.body;

  // 1. Find user account by email (login email must match exactly; deleted_at==null)
  const user = await MyGlobal.prisma.discuss_board_user_accounts.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new Error("Invalid email or password");
  }
  // 2. Eligibility: must be active, verified, and not suspended/banned/locked
  if (!user.email_verified) {
    throw new Error("Account email not verified");
  }
  if (user.status !== "active") {
    throw new Error("Account not eligible for login: status must be 'active'");
  }
  // 3. Validate password using MyGlobal.password utility
  const passwordValid = await MyGlobal.password.verify(
    password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }
  // 4. Find the associated member profile (required for login to succeed)
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: user.id,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new Error("No discuss_board_members record for this account");
  }
  // 5. Generate JWT tokens (issuer: autobe, 1h/7d expiration, type: member)
  const jwtId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    { id: user.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe", jwtid: jwtId },
  );
  const refresh = jwt.sign(
    { id: user.id, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe", jwtid: jwtId },
  );
  // 6. Store JWT session record securely (refresh_token is hashed, audit/member info as available)
  const refreshTokenHash = await MyGlobal.password.hash(refresh);
  await MyGlobal.prisma.discuss_board_jwt_sessions.create({
    data: {
      id: v4(),
      user_account_id: user.id,
      jwt_id: jwtId,
      refresh_token_hash: refreshTokenHash,
      user_agent: "unknown",
      ip_address: "unknown",
      issued_at: now,
      expires_at: refreshExpires,
      revoked_at: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
  // 7. Update last_login_at and updated_at on the user account
  await MyGlobal.prisma.discuss_board_user_accounts.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });
  // 8. Compose full authorized result (strict DTO, all times as string)
  return {
    id: member.id,
    user_account_id: user.id,
    nickname: member.nickname,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    member: {
      id: member.id,
      user_account_id: user.id,
      nickname: member.nickname,
      status: member.status,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at
        ? toISOStringSafe(member.deleted_at)
        : undefined,
    },
  };
}

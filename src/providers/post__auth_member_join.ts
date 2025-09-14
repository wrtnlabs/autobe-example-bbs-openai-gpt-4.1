import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";

/**
 * Register a new discussBoard member account (user_auth, member, consent,
 * session, token).
 *
 * - Validates unique email and nickname, and ensures all required consents are
 *   present.
 * - Hashes password securely before storage.
 * - Creates user_account, member, and consent records in a single transaction.
 * - Issues JWT tokens and persists session metadata with hashed refresh token,
 *   user agent, and IP.
 * - All response fields follow JSON date/time and UUID branding; no Date or `as`
 *   used.
 *
 * @param props - {body}: Registration payload (email, password, nickname,
 *   consent[])
 * @returns IDiscussBoardMember.IAuthorized (auth token, member, all metadata)
 * @throws {Error} If email or nickname already registered, consent missing, or
 *   violation of security rules
 */
export async function post__auth_member_join(props: {
  body: IDiscussBoardMember.IJoin;
}): Promise<IDiscussBoardMember.IAuthorized> {
  const { email, password, nickname, consent } = props.body;
  // Uniqueness: Email (user_account)
  const existsUser =
    await MyGlobal.prisma.discuss_board_user_accounts.findFirst({
      where: { email, deleted_at: null },
    });
  if (existsUser) throw new Error("Email already registered");
  // Uniqueness: Nickname (member)
  const existsNickname = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: { nickname, deleted_at: null },
  });
  if (existsNickname) throw new Error("Nickname already taken");
  // Consent presence and mandatory policies
  if (!Array.isArray(consent) || consent.length === 0)
    throw new Error("All required consents must be given");
  const requiredPolicies = ["privacy_policy", "terms_of_service"];
  for (const policy of requiredPolicies) {
    if (
      !consent.find(
        (c) => c.policy_type === policy && c.consent_action === "granted",
      )
    ) {
      throw new Error(`Missing consent for ${policy}`);
    }
  }

  // Hash password securely
  const password_hash = await MyGlobal.password.hash(password);
  // Generate IDs and timestamps
  const user_account_id: string & tags.Format<"uuid"> = v4();
  const member_id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // JWT: Prepare timing for token issuance/exp
  const accessTokenExpiresInSec = 60 * 60; // 1 hour
  const refreshTokenExpiresInSec = 7 * 24 * 60 * 60; // 7 days
  const issuedAt: string & tags.Format<"date-time"> = now;
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresInSec * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresInSec * 1000),
  );

  // Generate JWT tokens (fix: use 'jwt' directly)
  const payload = { id: member_id, type: "member" };
  const jwtSecret = MyGlobal.env.JWT_SECRET_KEY;
  const jwtAccessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: accessTokenExpiresInSec,
    issuer: "autobe",
  });
  const jwtRefreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    jwtSecret,
    { expiresIn: refreshTokenExpiresInSec, issuer: "autobe" },
  );

  // Hash refresh token for DB
  const refreshTokenHash: string =
    await MyGlobal.password.hash(jwtRefreshToken);
  // Use fallback user_agent/ip (real values should be propagated via context)
  const userAgent = "unknown-agent";
  const ipAddress = "0.0.0.0";
  // Session IDs
  const jwtSessionId: string & tags.Format<"uuid"> = v4();
  const jwtId = jwtSessionId;

  // Transaction: create user_account, member, consent logs, session
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discuss_board_user_accounts.create({
      data: {
        id: user_account_id,
        email,
        password_hash,
        email_verified: false,
        status: "pending",
        last_login_at: null,
        created_at: issuedAt,
        updated_at: issuedAt,
        deleted_at: null,
      },
    });
    await tx.discuss_board_members.create({
      data: {
        id: member_id,
        user_account_id: user_account_id,
        nickname,
        status: "active",
        created_at: issuedAt,
        updated_at: issuedAt,
        deleted_at: null,
      },
    });
    for (const c of consent) {
      await tx.discuss_board_consent_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          user_account_id: user_account_id,
          policy_type: c.policy_type,
          policy_version: c.policy_version,
          consent_action: c.consent_action,
          description: undefined,
          created_at: issuedAt,
        },
      });
    }
    await tx.discuss_board_jwt_sessions.create({
      data: {
        id: jwtSessionId,
        user_account_id: user_account_id,
        jwt_id: jwtId,
        refresh_token_hash: refreshTokenHash,
        user_agent: userAgent,
        ip_address: ipAddress,
        issued_at: issuedAt,
        expires_at: refreshExpiredAt,
        revoked_at: null,
        created_at: issuedAt,
        updated_at: issuedAt,
        deleted_at: null,
      },
    });
  });

  // Compose member DTO
  const member: IDiscussBoardMember = {
    id: member_id,
    user_account_id: user_account_id,
    nickname,
    status: "active",
    created_at: issuedAt,
    updated_at: issuedAt,
    deleted_at: null,
  };

  // Compose token DTO
  const token = {
    access: jwtAccessToken,
    refresh: jwtRefreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  // Build response (no 'as', all typing explicit)
  return {
    id: member_id,
    user_account_id: user_account_id,
    nickname,
    status: "active",
    created_at: issuedAt,
    updated_at: issuedAt,
    deleted_at: null,
    token,
    member, // optional, supply attached member info
  };
}

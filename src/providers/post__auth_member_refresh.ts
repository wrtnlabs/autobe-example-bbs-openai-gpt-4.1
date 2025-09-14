import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";

/**
 * Issue new JWT tokens for a member by validating/rotating a refresh token.
 *
 * Refreshes JWT access and refresh tokens for an authenticated discussBoard
 * member using a valid refresh token. This operation checks the validity of the
 * refresh token (in discuss_board_jwt_sessions) and only issues new tokens if
 * the session's status is active and not revoked, expired, or deleted. Refresh
 * tokens are rotated with each call. Upon success, returns new tokens and
 * updates session details in discuss_board_jwt_sessions.
 *
 * @param props - Properties containing the request body:
 *   IDiscussBoardMember.IRefresh
 * @returns IDiscussBoardMember.IAuthorized: Authorized session/member data (new
 *   tokens, session info)
 * @throws {Error} If the refresh token is invalid, expired, session is evicted,
 *   account is not eligible, or any validation fails.
 */
export async function post__auth_member_refresh(props: {
  body: IDiscussBoardMember.IRefresh;
}): Promise<IDiscussBoardMember.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: any = undefined;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
  // jti is required and identifies the JWT session
  const jwtId = decoded.jti;
  if (!jwtId || typeof jwtId !== "string")
    throw new Error("Malformed refresh token");
  // Find session
  const session = await MyGlobal.prisma.discuss_board_jwt_sessions.findUnique({
    where: { jwt_id: jwtId },
  });
  if (!session) throw new Error("Session not found");
  // Validate refresh token by hash (bcrypt or argon depending on config)
  const isValidRefresh = await MyGlobal.password.verify(
    refresh_token,
    session.refresh_token_hash,
  );
  if (!isValidRefresh) throw new Error("Refresh token mismatch or revoked");
  // Session status checks: revoked, deleted, expired
  if (session.revoked_at !== null && session.revoked_at !== undefined)
    throw new Error("Session revoked");
  if (session.deleted_at !== null && session.deleted_at !== undefined)
    throw new Error("Session deleted");
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expires_at) < nowIso)
    throw new Error("Session expired");
  // Get user account
  const user = await MyGlobal.prisma.discuss_board_user_accounts.findUnique({
    where: { id: session.user_account_id },
  });
  if (!user) throw new Error("User account not found");
  if (user.deleted_at !== null && user.deleted_at !== undefined)
    throw new Error("User account deleted");
  if (user.status !== "active") throw new Error("User account not active");
  // Get member
  const member = await MyGlobal.prisma.discuss_board_members.findUnique({
    where: { user_account_id: user.id },
  });
  if (!member) throw new Error("Member not found");
  if (member.deleted_at !== null && member.deleted_at !== undefined)
    throw new Error("Member deleted");
  // Generate new jwt_id for session (rotate)
  const newJwtId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  // Determine expiration
  const accessExpSec = 60 * 60; // 1h
  const refreshExpSec = 60 * 60 * 24 * 7; // 7d
  const accessExpiredAtVal = new Date(Date.now() + accessExpSec * 1000);
  const accessExpiredAt = toISOStringSafe(accessExpiredAtVal);
  const refreshExpiredAtVal = new Date(Date.now() + refreshExpSec * 1000);
  const refreshExpiredAt = toISOStringSafe(refreshExpiredAtVal);
  // Generate tokens
  const accessToken = jwt.sign(
    { id: user.id, type: "member", jti: newJwtId },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: accessExpSec, issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: "member", jti: newJwtId },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: refreshExpSec, issuer: "autobe" },
  );
  // Update session in DB (rotate: new jwt_id, new hashed refresh token, timestamps, and metadata)
  const newRefreshTokenHash = await MyGlobal.password.hash(refreshToken);
  await MyGlobal.prisma.discuss_board_jwt_sessions.update({
    where: { id: session.id },
    data: {
      jwt_id: newJwtId,
      refresh_token_hash: newRefreshTokenHash,
      issued_at: nowIso,
      expires_at: refreshExpiredAt,
      updated_at: nowIso,
      // Optionally update device info if available (not from body in this API)
    },
  });
  // Build IAuthorize token object
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  // Build response
  return {
    id: member.id,
    user_account_id: member.user_account_id,
    nickname: member.nickname,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null && member.deleted_at !== undefined
        ? toISOStringSafe(member.deleted_at)
        : undefined,
    token,
    member: {
      id: member.id,
      user_account_id: member.user_account_id,
      nickname: member.nickname,
      status: member.status,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at:
        member.deleted_at !== null && member.deleted_at !== undefined
          ? toISOStringSafe(member.deleted_at)
          : undefined,
    },
  };
}

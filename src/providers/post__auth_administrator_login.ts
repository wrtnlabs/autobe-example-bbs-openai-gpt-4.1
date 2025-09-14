import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

/**
 * Administrator login/authentication for the discussBoard platform.
 *
 * Handles verification of credentials, status, and privilege level for
 * administrator accounts. On successful authentication, updates session data
 * and issues JWT tokens reflecting administrator claims per platform policy.
 * Strictly enforces role status and compliance, returning a fully-typed
 * IDiscussBoardAdministrator.IAuthorized object on success.
 *
 * @param props - Request body containing administrator login credentials
 * @param props.body.email - Administrator login email
 * @param props.body.password - Raw password to verify against platform hash
 * @returns Authorized administrator payload with authentication tokens, claims,
 *   and entity data
 * @throws {Error} If credentials are invalid, status is not active, or
 *   administrator privileges are not present
 */
export async function post__auth_administrator_login(props: {
  body: IDiscussBoardAdministrator.ILogin;
}): Promise<IDiscussBoardAdministrator.IAuthorized> {
  const { email, password } = props.body;
  // Step 1: Fetch user account with member/admin join in one query
  const user = await MyGlobal.prisma.discuss_board_user_accounts.findUnique({
    where: { email },
    include: {
      discuss_board_members: {
        include: { discuss_board_administrators: true },
      },
    },
  });
  if (!user || user.deleted_at)
    throw new Error("Invalid credentials or user deleted");
  if (user.status !== "active") throw new Error("Account is not active");
  if (!user.email_verified) throw new Error("Email is not verified");
  const member = user.discuss_board_members;
  if (!member || member.deleted_at)
    throw new Error("No member record or already deleted");
  const admin = member.discuss_board_administrators;
  if (!admin || admin.deleted_at)
    throw new Error(
      "Administrator privileges not present or admin entry deleted",
    );
  if (admin.status !== "active")
    throw new Error("Administrator account is not active");
  if (admin.revoked_at !== null && admin.revoked_at !== undefined)
    throw new Error("Administrator privileges have been revoked");
  // Step 2: Password verification
  const verifyResult = await MyGlobal.password.verify(
    password,
    user.password_hash,
  );
  if (!verifyResult) throw new Error("Invalid credentials");
  // Step 3: Update last_login_at / updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discuss_board_user_accounts.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });
  // Step 4: Token payloads and expiration
  const accessExpiresInSeconds = 60 * 60; // 1 hour
  const refreshExpiresInSeconds = 60 * 60 * 24 * 7; // 7 days
  const nowDateObj = new Date();
  const accessExpiredAt = toISOStringSafe(
    new Date(nowDateObj.getTime() + accessExpiresInSeconds * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(nowDateObj.getTime() + refreshExpiresInSeconds * 1000),
  );
  const accessToken = jwt.sign(
    { id: admin.id, type: "administrator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: accessExpiresInSeconds, issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: admin.id, type: "administrator", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: refreshExpiresInSeconds, issuer: "autobe" },
  );
  // Step 5: Return type-matching payload
  return {
    id: admin.id,
    member_id: admin.member_id,
    escalated_by_administrator_id: admin.escalated_by_administrator_id,
    escalated_at: toISOStringSafe(admin.escalated_at),
    revoked_at: admin.revoked_at ? toISOStringSafe(admin.revoked_at) : null,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    administrator: {
      id: admin.id,
      member_id: admin.member_id,
      escalated_by_administrator_id: admin.escalated_by_administrator_id,
      escalated_at: toISOStringSafe(admin.escalated_at),
      revoked_at: admin.revoked_at ? toISOStringSafe(admin.revoked_at) : null,
      status: admin.status,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    },
  };
}

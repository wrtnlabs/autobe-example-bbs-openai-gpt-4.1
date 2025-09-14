import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";

/**
 * Register a new administrator account for the discussBoard platform.
 *
 * This endpoint performs administrator self-registration, strictly enforcing
 * uniqueness on email and nickname, password policy, and system status codes
 * for all records. The registration procedure concurrently creates user
 * account, member, and administrator records with verified auditability.
 * Passwords are securely hashed before storage. On success, the administrator
 * receives JWT tokens (access/refresh) granting administrator-level
 * permissions, plus the full IDiscussBoardAdministrator entity populated with
 * all required timestamps and IDs.
 *
 * - Fails if email or nickname are already taken.
 * - Password is strictly validated for length and character composition (min 10
 *   chars, upper/lower/digit/special).
 * - Handles initial self-escalation by setting `escalated_by_administrator_id` to
 *   the created admin id on join.
 *
 * @param props - Registration payload with { email, password, nickname }
 * @returns IDiscussBoardAdministrator.IAuthorized object with JWT tokens and
 *   full administrator detail
 * @throws {Error} If email or nickname is already in use, or if password does
 *   not meet complexity requirements
 */
export async function post__auth_administrator_join(props: {
  body: IDiscussBoardAdministrator.IJoin;
}): Promise<IDiscussBoardAdministrator.IAuthorized> {
  const { body } = props;

  // Enforce uniqueness: email and nickname
  const existingAccount =
    await MyGlobal.prisma.discuss_board_user_accounts.findUnique({
      where: { email: body.email },
    });
  if (existingAccount) throw new Error("Duplicate email");

  const existingNickname =
    await MyGlobal.prisma.discuss_board_members.findUnique({
      where: { nickname: body.nickname },
    });
  if (existingNickname) throw new Error("Duplicate nickname");

  // Password complexity: min 10 chars, upper, lower, digit, special char
  if (
    body.password.length < 10 ||
    !/[A-Z]/.test(body.password) ||
    !/[a-z]/.test(body.password) ||
    !/[0-9]/.test(body.password) ||
    !/[^A-Za-z0-9]/.test(body.password)
  ) {
    throw new Error("Password policy violation");
  }

  const userId = v4() as string & tags.Format<"uuid">;
  const memberId = v4() as string & tags.Format<"uuid">;
  const adminId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Hash password securely
  const password_hash: string = await MyGlobal.password.hash(body.password);

  // Create user account
  await MyGlobal.prisma.discuss_board_user_accounts.create({
    data: {
      id: userId,
      email: body.email,
      password_hash,
      email_verified: false,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Create member
  await MyGlobal.prisma.discuss_board_members.create({
    data: {
      id: memberId,
      user_account_id: userId,
      nickname: body.nickname,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Create administrator record (escalated_by_administrator_id is own id)
  const administrator =
    await MyGlobal.prisma.discuss_board_administrators.create({
      data: {
        id: adminId,
        member_id: memberId,
        escalated_by_administrator_id: adminId,
        escalated_at: now,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    });

  // Compute token expiry (string & tags.Format<'date-time'>)
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Issue JWT tokens with correct admin payload
  const access = jwt.sign(
    { id: adminId, type: "administrator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: adminId, type: "administrator", usage: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: administrator.id,
    member_id: administrator.member_id,
    escalated_by_administrator_id: administrator.escalated_by_administrator_id,
    escalated_at: toISOStringSafe(administrator.escalated_at),
    revoked_at: administrator.revoked_at
      ? toISOStringSafe(administrator.revoked_at)
      : undefined,
    status: administrator.status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: administrator.deleted_at
      ? toISOStringSafe(administrator.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    administrator: {
      id: administrator.id,
      member_id: administrator.member_id,
      escalated_by_administrator_id:
        administrator.escalated_by_administrator_id,
      escalated_at: toISOStringSafe(administrator.escalated_at),
      revoked_at: administrator.revoked_at
        ? toISOStringSafe(administrator.revoked_at)
        : undefined,
      status: administrator.status,
      created_at: toISOStringSafe(administrator.created_at),
      updated_at: toISOStringSafe(administrator.updated_at),
      deleted_at: administrator.deleted_at
        ? toISOStringSafe(administrator.deleted_at)
        : undefined,
    },
  };
}

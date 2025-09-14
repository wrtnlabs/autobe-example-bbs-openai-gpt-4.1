import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Registers a new moderator (admin escalation flow).
 *
 * Assigns moderator rights to an existing, eligible member, creates a moderator
 * record, and issues JWT credentials for moderator access. Registration is only
 * permitted for members with 'active' status and who are not deleted, with an
 * active and email-verified user account. Duplicate escalation, assigning
 * banned/suspended/pending members, or other ineligible cases will throw
 * errors. Returns the full moderator authorization context, JWT credentials,
 * and public member summary upon success.
 *
 * @param props - Object containing moderator authentication and
 *   IDiscussBoardModerator.ICreate details
 * @param props.moderator - The authenticated moderator payload, for
 *   authorization checks (not used for business validation, but required by
 *   route)
 * @param props.body - Moderator creation input: member_id and
 *   assigned_by_administrator_id
 * @returns IDiscussBoardModerator.IAuthorized - The new moderator record,
 *   session tokens, and member summary
 * @throws {Error} If the member does not exist, is deleted, not eligible,
 *   already a moderator, or account inactivity/verification fails.
 */
export async function post__auth_moderator_join(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardModerator.ICreate;
}): Promise<IDiscussBoardModerator.IAuthorized> {
  const { body } = props;
  // 1. Validate member existence and not deleted
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      id: body.member_id,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new Error("Member not found or deleted");
  }
  // 2. Validate user account for this member
  const account = await MyGlobal.prisma.discuss_board_user_accounts.findFirst({
    where: {
      id: member.user_account_id,
      deleted_at: null,
    },
  });
  if (
    !account ||
    account.status !== "active" ||
    account.email_verified !== true
  ) {
    throw new Error("User account is either not active or not email verified");
  }
  // 3. Validate member status is active
  if (member.status !== "active") {
    throw new Error(
      "Member must have 'active' status for escalation to moderator",
    );
  }
  // 4. Prevent duplicate moderator assignment
  const existing = await MyGlobal.prisma.discuss_board_moderators.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error("This member already has an active moderator assignment");
  }
  // 5. Insert moderator
  const now = toISOStringSafe(new Date());
  const modId = v4();
  const moderator = await MyGlobal.prisma.discuss_board_moderators.create({
    data: {
      id: modId,
      member_id: member.id,
      assigned_by_administrator_id: body.assigned_by_administrator_id,
      assigned_at: now,
      status: "active",
      created_at: now,
      updated_at: now,
      // revoked_at and deleted_at omitted (left null)
    },
  });
  // Generate token fields and JWTs
  const expiresInSeconds = 3600; // 1 hour access token
  const refreshInSeconds = 604800; // 7 days refresh token
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + expiresInSeconds * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshInSeconds * 1000),
  );

  // Access JWT: moderator role session
  const accessPayload = {
    id: moderator.id,
    member_id: moderator.member_id,
    type: "moderator",
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: expiresInSeconds,
    issuer: "autobe",
  });
  // Refresh JWT: restrict contents to session tracking
  const refreshPayload = {
    id: moderator.id,
    token_type: "refresh",
    type: "moderator",
  };
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshInSeconds,
    issuer: "autobe",
  });
  // 6. Compose member summary
  const memberSummary = {
    id: member.id,
    nickname: member.nickname,
    status: member.status,
  };
  // 7. Assemble and return
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
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    member: memberSummary,
  };
}

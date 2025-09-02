import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Assign moderator privileges to a user.
 *
 * Assigns the moderator role to the specified user by creating or reactivating
 * a record in discussion_board_moderators. If the user is already an active
 * moderator, the assignment is idempotent and returns the current record. Only
 * system administrators (admin) may call this operation; all conditions are
 * enforced including record uniqueness and user eligibility. All date fields
 * are expressed in ISO8601 format and UUIDs are generated using v4().
 *
 * @param props - Provider parameters
 * @param props.admin - Authenticated admin payload (validated by role
 *   decorator)
 * @param props.userId - Target user ID (UUID) to assign moderator role
 * @param props.body - Assignment request payload containing user_id (must match
 *   path param)
 * @returns IDiscussionBoardModerator - The newly assigned (or updated/existing)
 *   moderator record
 * @throws {Error} If the user record does not exist, is deleted/suspended, or
 *   param/body IDs do not match
 */
export async function put__discussionBoard_admin_users_$userId_moderator(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator> {
  const { admin, userId, body } = props;

  // Enforce path param and body.user_id match
  if (userId !== body.user_id) {
    throw new Error("User ID in path parameter must match body.user_id");
  }

  // Ensure target user exists, is not deleted, and is not suspended
  const targetUser = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
      is_suspended: false,
    },
  });
  if (!targetUser) {
    throw new Error(
      "Target user not found or is not eligible for moderator role",
    );
  }

  // Check for existing moderator record
  const existing = await MyGlobal.prisma.discussion_board_moderators.findFirst({
    where: {
      user_id: userId,
    },
  });

  // Idempotent: Return existing record if already active/not revoked/not soft-deleted
  if (
    existing &&
    existing.is_active === true &&
    existing.revoked_at === null &&
    existing.deleted_at === null
  ) {
    return {
      id: existing.id,
      user_id: existing.user_id,
      assigned_at: toISOStringSafe(existing.assigned_at),
      revoked_at: existing.revoked_at
        ? toISOStringSafe(existing.revoked_at)
        : null,
      is_active: existing.is_active,
      suspended_until: existing.suspended_until
        ? toISOStringSafe(existing.suspended_until)
        : null,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      deleted_at: existing.deleted_at
        ? toISOStringSafe(existing.deleted_at)
        : null,
    };
  }

  // Reactivate existing record if revoked or soft-deleted
  if (existing) {
    const now = toISOStringSafe(new Date());
    const updated = await MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: existing.id },
      data: {
        is_active: true,
        revoked_at: null,
        deleted_at: null,
        updated_at: now,
      },
    });
    return {
      id: updated.id,
      user_id: updated.user_id,
      assigned_at: toISOStringSafe(updated.assigned_at),
      revoked_at: updated.revoked_at
        ? toISOStringSafe(updated.revoked_at)
        : null,
      is_active: updated.is_active,
      suspended_until: updated.suspended_until
        ? toISOStringSafe(updated.suspended_until)
        : null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  }

  // Create new moderator record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: v4(),
      user_id: userId,
      assigned_at: now,
      revoked_at: null,
      is_active: true,
      suspended_until: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    user_id: created.user_id,
    assigned_at: toISOStringSafe(created.assigned_at),
    revoked_at: created.revoked_at ? toISOStringSafe(created.revoked_at) : null,
    is_active: created.is_active,
    suspended_until: created.suspended_until
      ? toISOStringSafe(created.suspended_until)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Revoke moderator role from a user (discussion_board_moderators).
 *
 * Revokes moderator privileges for the given userId by soft-deleting the
 * moderator record: sets revoked_at, deleted_at, is_active = false, and updates
 * the audit timestamp. Only admins may perform this operation; proper
 * authentication is enforced via the provided AdminPayload.
 *
 * The operation validates that the user is currently assigned as a moderator
 * (not already revoked/deleted). Returns the updated moderator entity with all
 * timestamps and compliant fields.
 *
 * @param props - Operation properties
 * @param props.admin - The authenticated admin performing the revocation
 * @param props.userId - The user ID whose moderator privileges are being
 *   revoked
 * @returns The updated, soft-deleted moderator record
 *   (IDiscussionBoardModerator)
 * @throws {Error} If the moderator assignment is not found or was already
 *   revoked.
 */
export async function delete__discussionBoard_admin_users_$userId_moderator(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerator> {
  const { userId } = props;
  // 1. Locate the moderator record that is not deleted (active moderator)
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        user_id: userId,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new Error("Moderator not found or already revoked");
  }
  // 2. Soft delete (revoke): set revoked_at, deleted_at, is_active=false, updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: moderator.id },
    data: {
      revoked_at: now,
      deleted_at: now,
      is_active: false,
      updated_at: now,
    },
  });
  // 3. Return standard DTO with all timestamps as ISO strings, all optional fields handled
  return {
    id: updated.id,
    user_id: updated.user_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
    revoked_at: updated.revoked_at ? toISOStringSafe(updated.revoked_at) : null,
    is_active: updated.is_active,
    suspended_until:
      updated.suspended_until !== null && updated.suspended_until !== undefined
        ? toISOStringSafe(updated.suspended_until)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

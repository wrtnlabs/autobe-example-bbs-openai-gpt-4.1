import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Restore/reinstate admin privilege for a user in discussion_board_admins.
 *
 * This operation reactivates or reinstates a previously-revoked admin record,
 * allowing prior admins (whose privileges had been suspended or revoked) to be
 * re-elevated. It is only accessible by authenticated admins, and all actions
 * are audit/compliance logged elsewhere in the system.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated Admin performing privilege reinstatement
 * @param props.userId - User ID to reinstate as admin
 * @param props.body - Update payload (not directly used except for type match)
 * @returns Updated admin assignment record per IDiscussionBoardAdmin
 * @throws {Error} If no prior admin record exists, or if admin status is
 *   already active
 */
export async function patch__discussionBoard_admin_users_$userId_admin(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const { userId } = props;
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
    },
  });
  if (!adminRecord) {
    throw new Error("Cannot reinstate: this user is not a prior admin.");
  }
  if (adminRecord.is_active === true && adminRecord.revoked_at === null) {
    throw new Error("Admin privileges already active for this user.");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: adminRecord.id },
    data: {
      is_active: true,
      revoked_at: null,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    user_id: updated.user_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
    revoked_at: updated.revoked_at ? toISOStringSafe(updated.revoked_at) : null,
    is_active: updated.is_active,
    suspended_until: updated.suspended_until
      ? toISOStringSafe(updated.suspended_until)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

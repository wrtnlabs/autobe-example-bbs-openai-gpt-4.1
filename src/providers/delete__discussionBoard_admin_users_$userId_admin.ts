import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Revoke admin privilege from a user (discussion_board_admins).
 *
 * Revokes administrator privileges for the given user by soft deleting the
 * corresponding record in discussion_board_admins. This sets the deleted_at and
 * revoked_at fields, marks is_active as false, and updates updated_at, but
 * retains audit history for compliance.
 *
 * Only users with admin role may perform this operation. Attempts to revoke
 * non-existent or already-revoked admin privileges result in a clear error.
 * This endpoint is essential for cleanly managing admin life cycle and
 * compliance logs.
 *
 * @param props - Request properties
 * @param props.admin - The admin performing the revocation
 *   (authentication/authorization is handled by the decorator)
 * @param props.userId - The UUID of the user to revoke admin privileges from
 * @returns The updated admin record with revocation and soft delete information
 * @throws {Error} When the admin assignment record does not exist, or admin
 *   privileges have already been revoked
 */
export async function delete__discussionBoard_admin_users_$userId_admin(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  // Attempt to find the active admin assignment by user ID
  const adminRec = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      user_id: props.userId,
      deleted_at: null,
      is_active: true,
      revoked_at: null,
    },
  });
  if (!adminRec) {
    throw new Error(
      "User is not an active admin or admin privileges already revoked.",
    );
  }
  // Prepare revocation/deletion timestamp
  const now = toISOStringSafe(new Date());
  // Update: set deleted_at, revoked_at, is_active false, updated_at now
  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: adminRec.id },
    data: {
      deleted_at: now,
      revoked_at: now,
      is_active: false,
      updated_at: now,
    },
  });
  // Map all fields, ensuring date-times are ISO strings (use null checks for nullable fields)
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

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete (deactivate) user by userId (mod/admin only).
 *
 * Sets the deleted_at timestamp to hide the user from APIs and authentication,
 * but preserves the record for regulatory/audit compliance. The operation is
 * idempotent – deleting a user already soft-deleted succeeds silently. Only
 * admins may invoke this endpoint.
 *
 * @param props - Must include AdminPayload (admin) and userId (target user ID)
 * @param props.admin - Admin authentication payload representing current admin
 * @param props.userId - Unique identifier (uuid) of the target user to
 *   soft-delete
 * @returns Void
 * @throws {Error} If user does not exist
 */
export async function delete__discussionBoard_admin_users_$userId(props: {
  admin: AdminPayload;
  userId: string & import("typia").tags.Format<"uuid">;
}): Promise<void> {
  const { admin, userId } = props;

  // Fetch the user by id (including soft-deleted for idempotency)
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If already soft-deleted, do nothing (idempotent)
  if (user.deleted_at !== null && user.deleted_at !== undefined) {
    return;
  }

  // Set deleted_at (soft delete) using current time as string & tags.Format<'date-time'>
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft-delete (deactivate) user by userId (mod/admin only).
 *
 * This endpoint performs a soft-delete of a user account, setting the
 * deleted_at timestamp to hide the user from public APIs and prevent future
 * authentication. It does not physically erase the row, complying with business
 * and regulatory policy. Only moderators and admins can perform this action.
 * Restoration, if supported, is managed elsewhere.
 *
 * @param props - Request properties
 * @param props.moderator - Moderator performing the operation
 * @param props.userId - Unique identifier of the user to soft-delete
 * @returns Void
 * @throws {Error} When the user does not exist
 */
export async function delete__discussionBoard_moderator_users_$userId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { userId } = props;

  // Find user by ID
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If already soft-deleted, idempotent (do nothing)
  if (user.deleted_at !== null && user.deleted_at !== undefined) {
    return;
  }

  const now = toISOStringSafe(new Date());

  // Update user's deleted_at and updated_at
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}

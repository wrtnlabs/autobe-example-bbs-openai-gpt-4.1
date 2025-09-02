import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete (deactivate) a user account by userId (sets deleted_at).
 *
 * Soft-deletes a user account in the discussion board by marking the deleted_at
 * field with the current timestamp for the user referenced by userId. This
 * operation makes the account inaccessible to regular users but retains the
 * record and key metadata for compliance, moderation, and auditing.
 *
 * Account removal respects all standard soft deletion patterns, meaning all
 * direct relations (posts, comments, etc.) are not removed but may be hidden or
 * anonymized from public view according to business logic. The operation
 * requires self-authorization unless escalated (e.g., by moderators/admins).
 * Complies with user data erasure policies, enabling administrators and users
 * to initiate their own account removal.
 *
 * A successful deletion will only affect logical removal—not physical deletion.
 * Related APIs must handle visibility of soft-deleted records and include
 * compliance with any legal erasure requirements.
 *
 * @param props - Properties for the request
 * @param props.user - The authenticated user (must match userId)
 * @param props.userId - The unique identifier of the account to be soft-deleted
 * @returns Void
 * @throws {Error} When attempting to delete an account other than self
 * @throws {Error} When user does not exist
 */
export async function delete__discussionBoard_user_users_$userId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, userId } = props;
  // Self-authorization enforced: cannot delete another user's account
  if (user.id !== userId) {
    throw new Error("Unauthorized: You can only delete your own user account.");
  }

  // Throws Error if user does not exist (will surface as error)
  await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: userId },
  });

  // Update user's deleted_at timestamp for soft-delete
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

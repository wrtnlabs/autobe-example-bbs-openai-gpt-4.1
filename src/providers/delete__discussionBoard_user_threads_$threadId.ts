import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete a discussion thread by ID (discussion_board_threads).
 *
 * Soft delete a discussion thread so that it is no longer visible to regular
 * users but is retained for compliance and potential restoration by moderators
 * or admins. The endpoint sets the deleted_at timestamp for the thread,
 * adhering to platform policy for logical deletion.
 *
 * Only authenticated users, who are either the thread owners or possess
 * moderator/admin privileges, may perform this action. Regular users cannot
 * delete threads they do not own. Deletion actions are logged for audit
 * purposes, ensuring traceability per compliance requirements. Physically
 * removed threads are only supported by admin workflow, not by this endpoint.
 *
 * Expected errors include thread not found, permission denied, or already
 * deleted. No response body is returned on success; relevant status and
 * timestamp can be inferred elsewhere.
 *
 * @param props - Parameters for the operation
 * @param props.user - Authenticated user attempting the deletion
 * @param props.threadId - Unique identifier of the thread to be soft deleted
 * @returns Void
 * @throws {Error} Thread not found or user is not authorized to delete (not
 *   owner)
 */
export async function delete__discussionBoard_user_threads_$threadId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, threadId } = props;

  // 1. Locate the thread by id
  const thread = await MyGlobal.prisma.discussion_board_threads.findUnique({
    where: { id: threadId },
  });
  if (!thread) throw new Error("Thread not found");

  // 2. Idempotency: if already soft-deleted, succeed silently
  if (thread.deleted_at !== null && thread.deleted_at !== undefined) return;

  // 3. Only thread owner can delete via this endpoint (per user role)
  if (thread.created_by_id !== user.id) {
    throw new Error(
      "Permission denied: Only thread owner may delete this thread",
    );
  }

  // 4. Perform soft delete, setting deleted_at
  await MyGlobal.prisma.discussion_board_threads.update({
    where: { id: threadId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}

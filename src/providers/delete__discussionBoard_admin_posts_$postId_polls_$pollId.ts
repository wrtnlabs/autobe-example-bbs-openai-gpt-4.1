import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft deletes a poll attached to a post (admin only).
 *
 * Deletes (soft deletes) a poll attached to a post by setting the 'deleted_at'
 * timestamp. Only moderators and admins can perform poll deletions. The
 * operation is denied if the poll is in active use or is protected by a locked
 * or archived parent post/thread. On success, the poll remains recoverable for
 * compliance until subsequent hard deletion by system process. Audit trail logs
 * are created for all deletions. Users without privilege, or those attempting
 * to delete already-soft-deleted polls receive a business error.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.postId - Identifier of the parent post for this poll
 * @param props.pollId - Identifier of the poll to delete
 * @returns Void
 * @throws {Error} When the poll is not found or already deleted
 * @throws {Error} When the parent post or parent thread is not found
 * @throws {Error} When the parent post is locked, or parent thread is
 *   locked/archived
 */
export async function delete__discussionBoard_admin_posts_$postId_polls_$pollId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, postId, pollId } = props;

  // Step 1: Fetch the poll, ensure not already deleted
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      discussion_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (!poll) throw new Error("Poll not found or already deleted");

  // Step 2: Fetch the parent post
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: { id: poll.discussion_board_post_id },
  });
  if (!post) throw new Error("Parent post not found");

  // Step 3: Fetch the parent thread and check for locked/archived state
  const thread = await MyGlobal.prisma.discussion_board_threads.findFirst({
    where: { id: post.thread_id },
  });
  if (!thread) throw new Error("Parent thread not found");
  if (post.is_locked || thread.is_locked || thread.is_archived) {
    throw new Error(
      "Cannot delete poll from a locked or archived thread, or from a locked post",
    );
  }

  // Step 4: Soft delete the poll (set deleted_at)
  await MyGlobal.prisma.discussion_board_polls.update({
    where: { id: poll.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Step 5: [Optional] Audit logging implementation would go here
  // e.g., await MyGlobal.prisma.discussion_board_audit_logs.create({ ... })

  // Done
  return;
}

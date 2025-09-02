import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete a poll attached to a post by a moderator.
 *
 * Deletes (soft deletes) a poll by setting the poll's 'deleted_at' field. This
 * operation is restricted to moderators and admins only, and will fail if the
 * poll is already deleted, does not exist, the parent thread is locked or
 * archived, or business constraints are violated (e.g., active poll, votes
 * exist - subject to further logic).
 *
 * Upon soft deletion, the poll remains audit-accessible for compliance until
 * physical deletion per retention policy. Attempts to delete a non-existent or
 * already-soft-deleted poll return an error. This provider also creates an
 * audit log entry for compliance (as a placeholder).
 *
 * @param props - Request properties
 * @param props.moderator - Moderator authentication payload
 * @param props.postId - Parent post's UUID
 * @param props.pollId - Poll's UUID
 * @returns Void
 * @throws {Error} When poll does not exist, is already deleted, parent
 *   post/thread is locked/archived, or other business constraints fail.
 */
export async function delete__discussionBoard_moderator_posts_$postId_polls_$pollId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId, pollId } = props;

  // Step 1: Find the poll (must exist, must not be soft-deleted)
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      discussion_board_post_id: postId,
      deleted_at: null,
    },
    select: { id: true, discussion_board_post_id: true },
  });
  if (!poll) {
    throw new Error("Poll does not exist or is already deleted");
  }

  // Step 2: Find parent post (needed for thread_id)
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: poll.discussion_board_post_id },
    select: { thread_id: true },
  });
  if (!post) {
    throw new Error("Parent post not found");
  }

  // Step 3: Find parent thread for archive/locked status
  const thread = await MyGlobal.prisma.discussion_board_threads.findUnique({
    where: { id: post.thread_id },
    select: { is_locked: true, is_archived: true },
  });
  if (!thread) {
    throw new Error("Thread not found");
  }
  if (thread.is_locked || thread.is_archived) {
    throw new Error("Cannot delete a poll from a locked or archived thread");
  }

  // Step 4: Soft delete the poll (set deleted_at to current ISO string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_polls.update({
    where: { id: pollId },
    data: { deleted_at: now },
  });

  // Step 5: Audit log entry (placeholder)
  // await MyGlobal.prisma.discussion_board_audit_logs.create({ ... });
  return;
}

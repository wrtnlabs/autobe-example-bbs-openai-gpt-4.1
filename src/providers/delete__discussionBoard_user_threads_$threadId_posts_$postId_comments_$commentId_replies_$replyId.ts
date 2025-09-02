import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft-delete a reply (nested comment) under a comment in the discussion board.
 *
 * Deletes (soft-deletes) an individual reply within a comment hierarchy beneath
 * a specific thread and post. Marks the target reply's deleted_at field in the
 * discussion_board_comments table, restricting visibility for regular users but
 * retaining it for moderation and compliance. Only the reply author may execute
 * this operation; moderators/admins support may be implemented separately. All
 * deletions are candidates for compliance/audit logging. If performed by the
 * owner, sets deleted_at and completes successfully.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user attempting reply deletion
 * @param props.threadId - Thread UUID (for context)
 * @param props.postId - Post UUID (for reply's parent post)
 * @param props.commentId - Parent comment UUID (direct parent comment)
 * @param props.replyId - The reply UUID (discussion_board_comments.id) to be
 *   soft-deleted
 * @returns Void
 * @throws {Error} If reply does not exist, is already deleted, or user is not
 *   the author
 */
export async function delete__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_replies_$replyId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, postId, commentId, replyId } = props;
  // Find the reply comment to be soft-deleted with ownership check and not already deleted
  const reply = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: replyId,
      post_id: postId,
      parent_id: commentId,
      deleted_at: null,
    },
  });
  if (!reply) {
    throw new Error("Reply not found or already deleted");
  }
  // Only reply author may perform this operation
  if (reply.created_by_id !== user.id) {
    throw new Error("Forbidden: Only reply author can delete their reply");
  }
  // Set deleted_at to now (soft delete)
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: replyId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return (void)
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a specific comment in a thread's post by setting its deleted_at
 * timestamp.
 *
 * Soft delete a specific comment within a post. This operation, available to
 * the comment author, moderator, or admin, sets the comment's deleted_at
 * timestamp. The comment is no longer returned in public results but remains in
 * the database for compliance, moderation, and possible restoration. Associated
 * child comments, attachments, and votes are preserved but subject to parent
 * visibility logic. The API returns 403 on insufficient permissions and 404 for
 * already deleted or non-existent resources. The operation supports business
 * rules on user-driven and privileged deletions, aligned with role-based
 * access.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 *   (authorization enforced via decorator)
 * @param props.threadId - The thread ID (for API consistency, not used in
 *   schema query)
 * @param props.postId - The post ID containing the comment
 * @param props.commentId - The comment ID to be soft deleted
 * @returns Void
 * @throws {Error} When the comment does not exist or is already soft deleted
 */
export async function delete__discussionBoard_admin_threads_$threadId_posts_$postId_comments_$commentId(props: {
  admin: AdminPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { postId, commentId } = props;
  // Check if the comment exists and is active (not deleted)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
  });
  if (comment === null) {
    throw new Error("Comment not found or already deleted");
  }

  // Soft delete by marking deleted_at to now
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Returns void
}

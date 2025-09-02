import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete a specific comment in a thread's post by setting its deleted_at
 * timestamp.
 *
 * Soft delete a specific comment within a post. This operation, available to
 * the comment author, moderator, or admin, sets the comment's deleted_at
 * timestamp. The comment is no longer returned in public results but remains in
 * the database for compliance, moderation, and possible restoration. This
 * preserves auditability and allows for regulatory response. Associated child
 * comments, attachments, and votes are preserved but subject to parent
 * visibility logic. The API returns 403 on insufficient permissions and 404 for
 * already deleted or non-existent resources. The operation supports business
 * rules on user-driven and privileged deletions, aligned with role-based
 * access.
 *
 * @param props - Request properties containing user authentication and path
 *   parameters.
 * @param props.user - Authenticated user attempting the deletion. Must be
 *   author, moderator, or admin.
 * @param props.threadId - Unique identifier for the parent thread.
 * @param props.postId - Unique identifier for the parent post.
 * @param props.commentId - Unique identifier for the comment to be
 *   soft-deleted.
 * @returns Void
 * @throws {Error} 404 if the comment does not exist or is already deleted
 * @throws {Error} 403 if the user is not authorized (not author, moderator, or
 *   admin)
 */
export async function delete__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, postId, commentId } = props;

  // 1. Fetch the comment by id, confirming correct post association and not already soft-deleted
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      created_by_id: true,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }

  // 2. Authorization check: user is author, moderator, or admin (is_active, not deleted)
  const [moderator, admin] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        user_id: user.id,
        is_active: true,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        user_id: user.id,
        is_active: true,
        deleted_at: null,
      },
    }),
  ]);

  const isAuthor = comment.created_by_id === user.id;
  if (!isAuthor && !moderator && !admin) {
    throw new Error(
      "Forbidden: Only author, moderator, or admin can delete this comment",
    );
  }

  // 3. Update (soft delete) with branded ISO string for current timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });
}

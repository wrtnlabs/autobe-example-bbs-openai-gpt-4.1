import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update the content or metadata of a specific comment within a post/thread.
 *
 * Only the comment author, moderators, or admins may update the comment. All
 * updates append an edit history snapshot for audit and compliance. Attempting
 * to update deleted or non-existent comments will result in an error. Admin
 * authentication is required.
 *
 * @param props - Object containing all required and contextual parameters
 * @param props.admin - Authenticated admin payload (permission is enforced)
 * @param props.threadId - Unique identifier of the parent thread (not used for
 *   direct lookup)
 * @param props.postId - Unique identifier of the parent post
 * @param props.commentId - Unique identifier of the comment to be updated
 * @param props.body - The fields to update; only 'body' is allowed
 * @returns {IDiscussionBoardComment} - The fully populated, updated comment
 *   object
 * @throws {Error} If the comment does not exist or has been deleted
 *   (soft-deleted)
 */
export async function put__discussionBoard_admin_threads_$threadId_posts_$postId_comments_$commentId(props: {
  admin: AdminPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // 1. Fetch the comment, ensure exists, correct post linkage, and not soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new Error("Comment not found or has been deleted");
  }

  // 2. Save previous comment snapshot to edit history (audit trail)
  await MyGlobal.prisma.discussion_board_comment_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: existing.id,
      edited_by_id: props.admin.id,
      body: existing.body,
      edited_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Update comment with new body if supplied, updated_at to now
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body ?? existing.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Return the updated comment, normalizing dates and nullables
  return {
    id: updated.id,
    post_id: updated.post_id,
    parent_id:
      typeof updated.parent_id !== "undefined" && updated.parent_id !== null
        ? updated.parent_id
        : null,
    created_by_id: updated.created_by_id,
    body: updated.body,
    nesting_level: updated.nesting_level,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}

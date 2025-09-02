import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update the content or metadata of a specific comment.
 *
 * Updates an existing comment within a thread's post. Only the original author
 * (user) may edit their own comment via this endpoint. This implementation
 * validates ownership, enforces thread/post hierarchy integrity, ensures no
 * modification to deleted comments, and records all edits by saving an audit
 * history snapshot.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user performing the update (must be the
 *   comment's author)
 * @param props.threadId - UUID of the parent thread
 * @param props.postId - UUID of the parent post
 * @param props.commentId - UUID of the comment to update
 * @param props.body - Update body, only the comment text is updatable
 * @returns The updated comment, including audit fields
 * @throws {Error} When the comment does not exist, is deleted,
 *   thread/post/comment relationship mismatch, or caller is not the author
 */
export async function put__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { user, threadId, postId, commentId, body } = props;
  // Fetch the comment and post relation for thread integrity check
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: commentId },
    include: {
      post: true,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (comment.deleted_at !== null && comment.deleted_at !== undefined) {
    throw new Error("Comment deleted");
  }
  if (comment.post_id !== postId) {
    throw new Error("Comment does not belong to specified post");
  }
  if (!comment.post || comment.post.thread_id !== threadId) {
    throw new Error("Comment does not belong to specified thread");
  }
  // Ownership check
  if (comment.created_by_id !== user.id) {
    throw new Error("Permission denied: Only the comment's author can edit");
  }
  // Save edit history snapshot (audit-compliance, pre-edit state)
  await MyGlobal.prisma.discussion_board_comment_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: comment.id,
      edited_by_id: user.id,
      body: comment.body,
      edited_at: toISOStringSafe(new Date()),
    },
  });
  // Update comment (body and timestamp)
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      body: body.body ?? comment.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Prepare return (convert dates, propagate nullable as needed)
  return {
    id: updated.id,
    post_id: updated.post_id,
    parent_id: updated.parent_id ?? null,
    created_by_id: updated.created_by_id,
    body: updated.body,
    nesting_level: updated.nesting_level,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

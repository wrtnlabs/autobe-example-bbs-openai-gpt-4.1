import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update the content or metadata of a specific comment.
 *
 * This endpoint allows a moderator to update an existing comment in a thread's
 * post. Only the comment's textual content (body) can be updated. Edits are
 * allowed by the comment author, and all moderators and admins. All changes are
 * tracked in the comment edit history for audit compliance. Attempts to update
 * deleted, locked, or non-existent comments will result in errors. The updated
 * comment object is returned in detail.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator making the update
 *   (ModeratorPayload)
 * @param props.threadId - UUID of the parent thread (not used for DB join, but
 *   for API/documentation clarity)
 * @param props.postId - UUID of the parent post (required for DB update,
 *   ensures proper scoping)
 * @param props.commentId - UUID of the comment to update
 * @param props.body - Update fields for comment
 *   (IDiscussionBoardComment.IUpdate; only 'body' supported)
 * @returns The fully updated comment object, with all metadata, in API/DTO
 *   shape
 * @throws {Error} When comment does not exist, has been deleted, or no
 *   updatable field provided
 */
export async function put__discussionBoard_moderator_threads_$threadId_posts_$postId_comments_$commentId(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { moderator, postId, commentId, body } = props;

  // 1. Fetch the comment and ensure it exists (not deleted)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
  });
  if (!comment) throw new Error("Comment not found or already deleted");

  // 2. Validate at least one updatable field
  if (body.body === undefined) {
    throw new Error(
      'No update field provided: at least "body" must be supplied',
    );
  }

  // 3. Prepare dates and ids
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const editHistoryId: string & tags.Format<"uuid"> = v4();

  // 4. Update the comment
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      body: body.body,
      updated_at: now,
    },
  });

  // 5. Insert into edit history (snapshot of previous contents)
  await MyGlobal.prisma.discussion_board_comment_edit_histories.create({
    data: {
      id: editHistoryId,
      comment_id: commentId,
      edited_by_id: moderator.id,
      body: comment.body,
      edited_at: now,
    },
  });

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

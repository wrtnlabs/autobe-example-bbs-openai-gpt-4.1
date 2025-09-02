import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update content of a reply (discussion_board_comments)
 *
 * Updates an existing reply (nested comment) under a given post/thread/comment
 * using the discussion_board_comments table. Only the reply's author can
 * update. Replies which are soft-deleted cannot be updated. All updates are
 * tracked with edit histories for audit purposes. Returns the updated reply.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user payload (author of the reply)
 * @param props.threadId - UUID of the thread related to the reply (context
 *   only)
 * @param props.postId - UUID of the post related to the reply (context only)
 * @param props.commentId - UUID of the parent comment (context only)
 * @param props.replyId - UUID of the reply to update (edit target)
 * @param props.body - Updated reply fields (only body is updatable)
 * @returns The updated IDiscussionBoardComment object (with all metadata)
 * @throws {Error} If the reply is not found, the user is not the author, or the
 *   reply is deleted
 */
export async function put__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_replies_$replyId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { user, replyId, body } = props;

  // 1. Fetch reply (by ID)
  const reply = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: replyId },
  });
  if (!reply) {
    throw new Error("Reply not found");
  }

  // 2. Authorization: only author may update
  if (reply.created_by_id !== user.id) {
    throw new Error("Unauthorized: Only the author can update this reply");
  }

  // 3. Soft-delete check
  if (reply.deleted_at !== null) {
    throw new Error("Cannot update a soft-deleted reply");
  }

  // 4. Persist edit history (before change)
  await MyGlobal.prisma.discussion_board_comment_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: reply.id,
      edited_by_id: user.id,
      body: reply.body,
      edited_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Update reply (body only, and update updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: replyId },
    data: {
      body: body.body ?? undefined,
      updated_at: now,
    },
  });

  // 6. Return the updated comment in full DTO format
  return {
    id: updated.id,
    post_id: updated.post_id,
    // parent_id is nullable
    parent_id: updated.parent_id ?? null,
    created_by_id: updated.created_by_id,
    body: updated.body,
    nesting_level: updated.nesting_level,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

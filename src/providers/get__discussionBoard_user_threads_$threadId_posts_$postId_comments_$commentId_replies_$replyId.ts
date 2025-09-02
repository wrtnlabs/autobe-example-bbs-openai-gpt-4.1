import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Fetch a single reply's detailed information by its ID
 * (discussion_board_comments)
 *
 * Retrieve the full details of a specific reply (nested comment) belonging to a
 * parent comment under a given thread and post. This function enforces that the
 * reply is a direct child of the specified parent comment, belongs to the
 * requested post, and that the post itself belongs to the requested thread.
 * Only non-deleted replies are visible to users—soft deleted (deleted_at !=
 * null) replies are not returned to normal users. Throws an error if the reply
 * is missing, has incorrect context, or is not accessible by the user.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user requesting access
 * @param props.threadId - Thread UUID to scope lookup
 * @param props.postId - Post UUID for reply context
 * @param props.commentId - Parent comment UUID for reply
 * @param props.replyId - The reply (discussion_board_comments.id) UUID to
 *   retrieve
 * @returns IDiscussionBoardComment - The full reply record with all relevant
 *   metadata
 * @throws {Error} If the reply is not found, missing, or fails context
 *   validation (wrong parent/post/thread)
 */
export async function get__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_replies_$replyId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { user, threadId, postId, commentId, replyId } = props;

  // Fetch the reply with strict context checks (must be reply of parent, for given post, and visible)
  const reply = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: replyId,
      post_id: postId,
      parent_id: commentId,
      deleted_at: null,
    },
  });

  if (!reply) {
    throw new Error("Reply not found or not accessible");
  }

  // Enforce post-to-thread association
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post || post.thread_id !== threadId) {
    throw new Error("Reply context mismatch: thread/post relationship invalid");
  }

  return {
    id: reply.id,
    post_id: reply.post_id,
    parent_id: reply.parent_id ?? null,
    created_by_id: reply.created_by_id,
    body: reply.body,
    nesting_level: reply.nesting_level,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    deleted_at: reply.deleted_at ? toISOStringSafe(reply.deleted_at) : null,
  };
}

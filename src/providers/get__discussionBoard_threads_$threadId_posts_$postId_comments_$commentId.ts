import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Get detailed information about a specific comment in a post/thread.
 *
 * Retrieve a single comment in detail given its unique identifiers within
 * thread and post. This endpoint provides the full content, author, timestamps,
 * nesting level, parent/child status, and all related comment metadata, as long
 * as the comment is not soft-deleted. Meant for public comment detail displays,
 * permalinks, and moderator tools. Returns 404 if comment does not exist, is
 * soft-deleted, or does not belong to the specified thread/post combination.
 *
 * @param props - Parameters containing threadId, postId, and commentId (all
 *   UUID format)
 * @param props.threadId - Unique identifier for the parent thread
 * @param props.postId - Unique identifier for the parent post
 * @param props.commentId - Unique identifier for the comment to retrieve
 * @returns IDiscussionBoardComment with all core fields, including nullables
 *   per API contract
 * @throws {Error} If the comment does not exist, is soft-deleted, or is not a
 *   child of given thread/post
 */
export async function get__discussionBoard_threads_$threadId_posts_$postId_comments_$commentId(props: {
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const { threadId, postId, commentId } = props;

  // 1. Fetch the comment (must match commentId and postId and is not soft deleted)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
  });
  if (!comment)
    throw new Error(
      "Comment not found, deleted, or does not belong to this post.",
    );

  // 2. Ensure the post for this comment matches the threadId
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: comment.post_id },
    select: { thread_id: true },
  });
  if (!post || post.thread_id !== threadId)
    throw new Error(
      "Comment does not belong to the provided thread/post combination.",
    );

  // 3. Return formatted comment with date-time fields as properly branded strings
  return {
    id: comment.id,
    post_id: comment.post_id,
    parent_id: comment.parent_id ?? null,
    created_by_id: comment.created_by_id,
    body: comment.body,
    nesting_level: comment.nesting_level,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}

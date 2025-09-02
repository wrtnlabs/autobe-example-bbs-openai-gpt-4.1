import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Retrieve a single post by ID within a thread (discussion_board_posts).
 *
 * Fetches a primary discussion post by its unique identifier (postId),
 * restricted to the provided thread (threadId). Soft-deleted posts (deleted_at
 * is not null) cannot be retrieved. Returns all fields specified in
 * IDiscussionBoardPost.
 *
 * This endpoint is public—no authentication is required. Throws Error if not
 * found or deleted.
 *
 * @param props - Request object containing:
 *
 *   - ThreadId: UUID representing parent thread
 *   - PostId: UUID identifying the post to retrieve
 *
 * @returns IDiscussionBoardPost with all scalar and audit fields, date-times as
 *   ISO8601 strings
 * @throws {Error} If post is not found, is soft-deleted, or IDs do not match an
 *   active post.
 */
export async function get__discussionBoard_threads_$threadId_posts_$postId(props: {
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPost> {
  const { threadId, postId } = props;

  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
      deleted_at: null,
    },
    select: {
      id: true,
      thread_id: true,
      created_by_id: true,
      title: true,
      body: true,
      is_locked: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!post) {
    throw new Error("Post not found or has been deleted");
  }

  return {
    id: post.id,
    thread_id: post.thread_id,
    created_by_id: post.created_by_id,
    title: post.title,
    body: post.body,
    is_locked: post.is_locked,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at === null || post.deleted_at === undefined
        ? null
        : toISOStringSafe(post.deleted_at),
  };
}

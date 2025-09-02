import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new comment on a post in a thread.
 *
 * Create a new comment under a post in a thread. This operation enforces
 * business rules such as maximum comment length and nesting level, validates
 * presence of mandatory fields, and updates indexing structures for future
 * retrieval. It supports both root comments and replies. The API triggers
 * business flows for notifications and subscription updates as appropriate.
 * Only active (non-suspended) authenticated users may create comments. Rejected
 * attempts for invalid input or permission results in error responses. The
 * newly created comment object, including all meta fields, is returned on
 * success.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator (JWT auth, always
 *   checked)
 * @param props.threadId - Unique identifier for the parent thread
 * @param props.postId - Unique identifier for the parent post
 * @param props.body - Information required to create a new comment
 * @returns The newly created comment object (including all metadata)
 * @throws {Error} When the post does not exist, is not in the thread, is locked
 * @throws {Error} When body is missing or too long
 * @throws {Error} When parent comment is invalid/nonexistent/deleted/level over
 *   5
 */
export async function post__discussionBoard_moderator_threads_$threadId_posts_$postId_comments(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { moderator, threadId, postId, body } = props;

  // 1. Validate parent post existence, thread match, lock status
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Parent post does not exist");
  if (post.thread_id !== threadId)
    throw new Error("Parent post does not belong to the given thread");
  if (post.is_locked)
    throw new Error("Post is locked; comments are not allowed");

  // 2. Compute nesting level, check parent_id (if given)
  let nesting_level: number & tags.Type<"int32"> = 0;
  let parent_id: (string & tags.Format<"uuid">) | null | undefined = undefined;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: body.parent_id },
    });
    if (!parent) throw new Error("Parent comment does not exist");
    if (parent.post_id !== postId)
      throw new Error("Parent comment does not belong to this post");
    if (!!parent.deleted_at)
      throw new Error("Cannot reply to a deleted comment");
    nesting_level = (parent.nesting_level + 1) as number & tags.Type<"int32">;
    parent_id = body.parent_id;
    if (nesting_level > 5) throw new Error("Maximum comment nesting is 5");
  }

  // 3. Enforce body present and length
  if (!body.body || body.body.trim().length === 0)
    throw new Error("Comment body cannot be empty");
  if (body.body.length > 3000)
    throw new Error("Comment body exceeds maximum length (3000)");

  // 4. Set fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id,
      post_id: postId,
      parent_id: parent_id ?? null,
      created_by_id: moderator.id,
      body: body.body,
      nesting_level,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    parent_id: created.parent_id ?? null,
    created_by_id: created.created_by_id,
    body: created.body,
    nesting_level: created.nesting_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

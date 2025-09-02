import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new comment on a post in a thread.
 *
 * This endpoint allows an authenticated admin to create a comment under a post
 * in a thread. It enforces validation for: post existence and unlock status,
 * thread match, optional parent comment (for nesting), maximum nesting depth,
 * non-empty and length-limited body. Returns all fields on the created comment,
 * with consistent typia/openapi types.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.threadId - UUID of the thread containing the post
 * @param props.postId - UUID of the post receiving the comment
 * @param props.body - The comment creation body
 * @returns The newly created comment (ID, links, meta fields)
 * @throws {Error} When the post or parent comment is not found, post is
 *   locked/deleted, nesting too deep, or the body is invalid
 */
export async function post__discussionBoard_admin_threads_$threadId_posts_$postId_comments(props: {
  admin: AdminPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { admin, threadId, postId, body } = props;

  // 1. Fetch the post and validate status
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");
  if (post.thread_id !== threadId)
    throw new Error("Post does not belong to this thread");
  if (post.deleted_at !== null) throw new Error("Post has been deleted");
  if (post.is_locked)
    throw new Error("Comments are not allowed on locked posts");

  // 2. Prepare nesting level and parent_id
  let nesting_level = 0;
  let parent_id: (string & tags.Format<"uuid">) | null = null;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: body.parent_id },
    });
    if (!parent) throw new Error("Parent comment not found");
    if (parent.post_id !== postId)
      throw new Error("Parent comment does not belong to this post");
    if (parent.deleted_at !== null)
      throw new Error("Parent comment is deleted");
    nesting_level = parent.nesting_level + 1;
    parent_id = parent.id;
    if (nesting_level > 5)
      throw new Error("Maximum comment nesting level (5) exceeded");
  }

  // 3. Validate body
  const bodyText = body.body?.trim() ?? "";
  if (!bodyText) throw new Error("Comment body must not be empty");
  if (bodyText.length > 2000)
    throw new Error("Comment body exceeds maximum length");

  // 4. Generate IDs and timestamps
  const now = toISOStringSafe(new Date());
  const comment_id = v4() as string & tags.Format<"uuid">;

  // 5. Insert the comment
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: comment_id,
      post_id: postId,
      parent_id: parent_id,
      created_by_id: admin.id,
      body: bodyText,
      nesting_level: nesting_level,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Return comment as DTO
  return {
    id: created.id,
    post_id: created.post_id,
    parent_id: created.parent_id ?? null,
    created_by_id: created.created_by_id,
    body: created.body,
    nesting_level: created.nesting_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}

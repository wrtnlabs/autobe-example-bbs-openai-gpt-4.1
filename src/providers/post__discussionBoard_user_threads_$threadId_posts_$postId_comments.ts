import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new comment on a post in a thread.
 *
 * This function creates a new comment on a specific post within a thread. It
 * ensures the parent post exists and is not deleted, validates (if supplied)
 * that any parent comment exists, is not deleted, and is not too deeply nested
 * (>5), and always generates proper metadata fields. Optional parent_id enables
 * both top-level and nested threading. Only authenticated users may use this
 * operation, and system business flows around notifications and subscriptions
 * are assumed to be triggered externally (not here). All date and id fields use
 * proper branded types.
 *
 * @param props -
 *
 *   - User: Authenticated user object (UserPayload)
 *   - ThreadId: Unique identifier of the thread (context)
 *   - PostId: Unique identifier of the post to which the comment is added
 *   - Body: Comment creation input, containing at minimum the post_id and body text
 *
 * @returns The newly created comment object, fully populated with all required
 *   metadata fields
 * @throws {Error} If resource is not found, is deleted, has mismatched
 *   nesting/thread/post, or violates nesting limit
 */
export async function post__discussionBoard_user_threads_$threadId_posts_$postId_comments(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const now = toISOStringSafe(new Date());

  // 1. Ensure the post exists, is not soft-deleted, and matches the request
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted.");
  }
  if (post.id !== props.body.post_id) {
    throw new Error("Post ID in body does not match URL postId.");
  }

  // 2. Determine the correct nesting level, validating parent if present
  let nesting_level = 0;
  if (props.body.parent_id) {
    const parent = await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
        post_id: props.postId,
      },
    });
    if (!parent) {
      throw new Error("Parent comment not found, mismatched post, or deleted.");
    }
    if (parent.nesting_level >= 5) {
      throw new Error("Cannot nest deeper than 5 levels.");
    }
    nesting_level = parent.nesting_level + 1;
    if (nesting_level > 5) {
      throw new Error("Nesting level too deep.");
    }
  }

  // 3. Create the comment with all enforced and generated fields
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: props.postId,
      parent_id: props.body.parent_id ?? null,
      created_by_id: props.user.id,
      body: props.body.body,
      nesting_level,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Map DB record to conforming API DTO structure
  return {
    id: created.id,
    post_id: created.post_id,
    parent_id: typeof created.parent_id === "string" ? created.parent_id : null,
    created_by_id: created.created_by_id,
    body: created.body,
    nesting_level: created.nesting_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

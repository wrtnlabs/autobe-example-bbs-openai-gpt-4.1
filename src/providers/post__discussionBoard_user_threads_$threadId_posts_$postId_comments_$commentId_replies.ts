import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Creates (posts) a new reply to an existing parent comment under a specific
 * post and thread.
 *
 * This operation inserts a new item into the discussion_board_comments table,
 * with correct parent_id and post_id associations. It enforces validation for
 * reply body, maximum nesting level (5), and author authentication. Soft
 * deletion and edit tracking are enabled for compliance/audit purposes. The
 * response returns the full reply object as created, with standard metadata.
 *
 * @param props - The request properties:
 * @returns The full IDiscussionBoardComment object as created, including
 *   correct parent linkage, author attribution, and nesting level
 * @throws {Error} If the parent comment does not exist, is not part of the
 *   requested post, is soft deleted, or if the nesting level has reached its
 *   cap (5 per system). Also throws if the reply body is empty or only
 *   whitespace.
 * @field user - Authenticated user performing the reply creation (UserPayload)
 * @field threadId - The UUID of the thread to which the post and parent comment belong
 * @field postId - The UUID of the post to which the parent comment and new reply belong
 * @field commentId - The UUID of the parent comment under which to add the reply
 * @field body - The body (text) and relational field for the new reply comment
 */
export async function post__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_replies(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { user, threadId, postId, commentId, body } = props;

  // 1. Fetch parent comment and authoritative checks (parent must exist, belong to post, and not be soft-deleted)
  const parent = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
  });
  if (!parent) {
    throw new Error(
      "Parent comment not found, not in the specified post, or has been deleted.",
    );
  }

  // 2. Check that parent comment does not exceed nesting level (max depth = 5)
  if (typeof parent.nesting_level !== "number" || parent.nesting_level >= 5) {
    throw new Error("Cannot reply: maximum nesting depth (5) reached.");
  }

  // 3. Validate reply body (must not be empty or whitespace only)
  if (
    !body.body ||
    typeof body.body !== "string" ||
    body.body.trim().length === 0
  ) {
    throw new Error("Reply body is required and cannot be empty.");
  }
  // Optionally validate min/max length here if required by business rules

  // 4. Compose new reply record fields (nesting_level = parent + 1)
  const nesting_level: number = parent.nesting_level + 1;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 5. Create reply comment in DB (prisma - always inline params)
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      parent_id: commentId,
      created_by_id: user.id,
      body: body.body,
      nesting_level,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Construct response matching the exact API contract (date fields stringified, nullable deleted_at handled)
  return {
    id: created.id,
    post_id: created.post_id,
    parent_id: created.parent_id,
    created_by_id: created.created_by_id,
    body: created.body,
    nesting_level: created.nesting_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

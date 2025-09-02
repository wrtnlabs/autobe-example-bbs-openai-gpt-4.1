import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update a post in a thread (discussion_board_posts).
 *
 * This operation allows the post owner (authenticated user) to update their
 * post's title, body, or lock status. Authorization is strictly enforced—only
 * the original post author can perform this action. Attempts to update
 * soft-deleted or non-owned posts will fail.
 *
 * Upon successful update, an audit snapshot is recorded in the edit histories
 * table before any changes take effect. All date fields are handled as ISO8601
 * strings.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user (ownership check enforced)
 * @param props.threadId - UUID of the thread containing the post
 * @param props.postId - UUID of the post to update
 * @param props.body - Fields to update: title, body, is_locked (all optional,
 *   at least one required)
 * @returns The updated post with all properties and dates correctly formatted.
 * @throws {Error} When post is not found, deleted, or user is not authorized
 * @throws {Error} When attempting to update a locked post or with no updatable
 *   fields
 * @throws {Error} When title update violates uniqueness constraint within the
 *   thread
 */
export async function put__discussionBoard_user_threads_$threadId_posts_$postId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPost.IUpdate;
}): Promise<IDiscussionBoardPost> {
  const { user, threadId, postId, body } = props;

  // 1. Find the target post (must belong to thread, not deleted).
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
    },
  });
  if (!post) throw new Error("Post not found");
  if (post.deleted_at !== null && post.deleted_at !== undefined) {
    throw new Error("Cannot update a deleted post");
  }

  // 2. Authorization: enforce ownership
  if (post.created_by_id !== user.id) {
    throw new Error("Forbidden: Only post owner can update");
  }

  // 3. Locked post: only allow update if not locked
  if (post.is_locked) {
    throw new Error("Cannot update a locked post");
  }

  // 4. Validate that at least one updatable field is present
  const wantsTitle = body.title !== undefined;
  const wantsBody = body.body !== undefined;
  const wantsIsLocked = body.is_locked !== undefined;
  if (!wantsTitle && !wantsBody && !wantsIsLocked) {
    throw new Error("No updatable fields provided");
  }

  // Prepare timestamp for audit/update
  const now = toISOStringSafe(new Date());

  // 5. Record pre-update snapshot to audit log (edit history)
  await MyGlobal.prisma.discussion_board_post_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      edited_by_id: user.id,
      title: post.title,
      body: post.body,
      edited_at: now,
    },
  });

  // 6. Attempt post update (enforce unique title within thread)
  let updated;
  try {
    updated = await MyGlobal.prisma.discussion_board_posts.update({
      where: { id: postId },
      data: {
        title: wantsTitle ? body.title : undefined,
        body: wantsBody ? body.body : undefined,
        is_locked: wantsIsLocked ? body.is_locked : undefined,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Title must be unique within the thread");
    }
    throw err;
  }

  // 7. Return the updated post with correctly formatted dates
  return {
    id: updated.id,
    thread_id: updated.thread_id,
    created_by_id: updated.created_by_id,
    title: updated.title,
    body: updated.body,
    is_locked: updated.is_locked,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}

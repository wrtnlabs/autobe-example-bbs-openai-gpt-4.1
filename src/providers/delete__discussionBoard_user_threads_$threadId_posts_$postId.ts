import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete a specific post in a discussion thread by setting its deleted_at
 * timestamp.
 *
 * This operation performs a soft deletion: it marks the specified post within a
 * given thread as deleted by setting its deleted_at field to the current
 * timestamp. This makes the post invisible to regular users while preserving
 * the record for audit, moderation, and compliance. Only the author of the post
 * is authorized to delete it (moderator/admin must use appropriate
 * privileges/routes). Associated comments or attachments are NOT deleted (but
 * may become hidden due to parent logic). Idempotency: re-deleting an
 * already-deleted or non-existent post yields a 404 error. Returns nothing on
 * success.
 *
 * @param props - Operation parameters
 * @param props.user - Authenticated user (must be post author)
 * @param props.threadId - Unique identifier of the parent thread
 * @param props.postId - Unique identifier of the post to delete
 * @returns Void (on successful soft delete)
 * @throws {Error} If the post does not exist or has already been deleted
 * @throws {Error} If the user is not the author of the post
 */
export async function delete__discussionBoard_user_threads_$threadId_posts_$postId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, threadId, postId } = props;

  // 1. Fetch the post by its ID, threadId, and undeleted state
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or already deleted");
  }

  // 2. Ensure the current user is the author of the post
  if (post.created_by_id !== user.id) {
    throw new Error("Forbidden: Only the post author may delete this post");
  }

  // 3. Mark the post as deleted (soft delete)
  await MyGlobal.prisma.discussion_board_posts.update({
    where: { id: postId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // 4. Function returns void
}

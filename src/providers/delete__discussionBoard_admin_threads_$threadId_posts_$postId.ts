import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a specific post in a thread by setting its deleted_at timestamp.
 *
 * This endpoint is used by admins to hide a post from public view while
 * retaining it for audit and compliance purposes. The operation performs a soft
 * delete by updating the deleted_at field. Only admins may invoke this
 * endpoint. Attempting to delete a non-existent or already soft-deleted post
 * will result in an error.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 * @param props.threadId - Unique identifier for the parent discussion thread
 * @param props.postId - Unique identifier for the target post within the thread
 * @returns Void
 * @throws {Error} When the post does not exist or has already been deleted
 */
export async function delete__discussionBoard_admin_threads_$threadId_posts_$postId(props: {
  admin: AdminPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, threadId, postId } = props;

  // Step 1: Confirm the post exists and is not already soft-deleted
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

  // Step 2: Perform the soft delete
  await MyGlobal.prisma.discussion_board_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Step 3: Return void (operation complete)
  return;
}

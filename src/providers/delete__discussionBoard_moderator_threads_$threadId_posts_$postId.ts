import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete a specific post in a thread by setting its deleted_at timestamp.
 *
 * This endpoint allows a moderator to soft-delete a post by updating its
 * deleted_at field to the current timestamp. The post is only found if it
 * belongs to the specified thread and has not been previously soft-deleted.
 * Deletion is performed atomically; if the post does not exist or was already
 * deleted, a 404 error is thrown.
 *
 * Authorization is enforced via the ModeratorPayload parameter (provided by the
 * ModeratorAuth decorator), so only an authenticated moderator can perform this
 * operation.
 *
 * @param props - Request properties:
 * @param props.moderator - ModeratorPayload (must be a valid moderator)
 * @param props.threadId - Unique identifier for the parent discussion thread
 * @param props.postId - Unique identifier for the post to be deleted within the
 *   thread
 * @returns Void
 * @throws {Error} When the post does not exist or has already been deleted
 */
export async function delete__discussionBoard_moderator_threads_$threadId_posts_$postId(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { threadId, postId } = props;

  // Check for existence (not already soft-deleted)
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // Soft delete by updating deleted_at to now
  await MyGlobal.prisma.discussion_board_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

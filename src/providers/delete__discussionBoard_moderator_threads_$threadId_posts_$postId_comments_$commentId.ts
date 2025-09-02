import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete a specific comment in a thread's post by setting its deleted_at
 * timestamp.
 *
 * This operation allows a moderator to mark a comment as deleted by setting its
 * deleted_at timestamp. The comment will become hidden from normal user
 * interfaces but remains in the database for compliance, moderation review, and
 * potential restoration. Deletion is permitted for moderators on any comment,
 * as authorized by the Moderator decorator.
 *
 * Business and compliance rules:
 *
 * - Preserves all child comments, attachments, votes, and reports (not deleted or
 *   cascaded).
 * - Returns 404 if the comment does not exist, is already deleted, does not
 *   belong to the specified post and thread, or if parameters are
 *   inconsistent.
 * - Returns 403 only if the moderator is unauthenticated or unauthorized (handled
 *   by decorator).
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator payload (authorization
 *   checked by decorator)
 * @param props.threadId - UUID of the parent thread
 * @param props.postId - UUID of the parent post
 * @param props.commentId - UUID of the comment to soft-delete
 * @returns Void - No content
 * @throws {Error} When the comment does not exist, is already deleted, or is
 *   mismatched with the given thread/post
 */
export async function delete__discussionBoard_moderator_threads_$threadId_posts_$postId_comments_$commentId(props: {
  moderator: ModeratorPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, threadId, postId, commentId } = props;

  // Step 1: Validate existence and linkage (with threadId via post relation)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
      post: {
        thread_id: threadId,
      },
    },
    include: {
      post: true,
    },
  });

  if (!comment) {
    throw new Error(
      "Comment not found, already deleted, or mismatched thread/post",
    );
  }

  // Step 2: Mark as soft deleted using ISO 8601 string (never use Date type)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
    },
  });
}

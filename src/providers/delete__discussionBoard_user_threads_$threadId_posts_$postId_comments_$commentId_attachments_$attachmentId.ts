import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft-delete a file/media attachment from a comment (within a post/thread).
 *
 * This operation marks the attachment's 'deleted_at' with the current
 * timestamp, making it invisible to user APIs while retaining metadata for
 * regulatory, audit, or restoration needs. Only the uploader (owner) may
 * perform this operation; moderators/admins are not supported as actors in this
 * implementation context.
 *
 * All hierarchy IDs must match and soft-deleted or locked parents (comment or
 * post) will block deletion. Throws clear errors on any invalid access attempts
 * or missing hierarchy linkage. Relational context is strictly enforced.
 *
 * @param props - Operation properties
 * @param props.user - The authenticated user attempting deletion (must be the
 *   uploader)
 * @param props.threadId - UUID of the thread containing the
 *   post/comment/attachment
 * @param props.postId - UUID of the post containing the comment/attachment
 * @param props.commentId - UUID of the parent comment containing the attachment
 * @param props.attachmentId - UUID of the attachment to soft-delete
 * @returns Promise resolving to void on success
 * @throws {Error} When attachment not found, already deleted, not belonging to
 *   the comment, or the user is not the uploader
 * @throws {Error} When comment/post/thread hierarchy is invalid, deleted, or
 *   locked
 */
export async function delete__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_attachments_$attachmentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, threadId, postId, commentId, attachmentId } = props;

  // Step 1: Lookup attachment (must not already be soft-deleted, must belong to the comment)
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        comment_id: commentId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new Error(
      "Attachment not found, does not belong to comment, or is already deleted",
    );
  }

  // Step 2: Lookup parent comment (must not be soft-deleted; must match the given post)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      post_id: postId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error(
      "Comment not found, does not belong to post, or is deleted",
    );
  }

  // Step 3: Lookup parent post (must not be soft-deleted; must be in the correct thread)
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found, does not belong to thread, or is deleted");
  }

  // Step 4: Only the uploading user may perform deletion
  if (attachment.uploaded_by_id !== user.id) {
    throw new Error(
      "Unauthorized: You are not the uploader of this attachment",
    );
  }

  // Step 5: Soft-delete: set deleted_at to now (string & tags.Format<'date-time'>)
  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}

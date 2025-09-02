import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft-delete an attachment (file/media) from a post in a thread.
 *
 * This operation allows an authorized user (uploader) to soft-delete an
 * attachment belonging to a post. The deleted attachment remains in the
 * database for audit/compliance (deleted_at is set), but is hidden from
 * user-facing APIs. Only the uploader may perform this operation. An error is
 * thrown if not found, already deleted, or the user is unauthorized. Thread,
 * post, and attachment association are all enforced.
 *
 * @param props - Request properties
 * @param props.user The authenticated user (must be the uploader of the
 *   attachment)
 * @param props.threadId The parent thread's UUID
 * @param props.postId The parent post's UUID
 * @param props.attachmentId The attachment UUID to be soft-deleted
 * @returns Void (no data is returned)
 * @throws {Error} If the attachment, post, or thread is not found or already
 *   deleted
 * @throws {Error} If the authenticated user is not the uploader of the
 *   attachment
 */
export async function delete__discussionBoard_user_threads_$threadId_posts_$postId_attachments_$attachmentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, threadId, postId, attachmentId } = props;

  // 1. Find the attachment with correct id, post, and not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        post_id: postId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new Error("Attachment not found or already deleted");
  }

  // 2. Confirm post exists, matches threadId, not deleted (relational integrity)
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

  // 3. Only uploader is allowed to delete this attachment
  if (attachment.uploaded_by_id !== user.id) {
    throw new Error("Forbidden: Only the uploader may delete this attachment");
  }

  // 4. Soft-delete (set deleted_at)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: { deleted_at: deletedAt },
  });

  // Operation returns void
}

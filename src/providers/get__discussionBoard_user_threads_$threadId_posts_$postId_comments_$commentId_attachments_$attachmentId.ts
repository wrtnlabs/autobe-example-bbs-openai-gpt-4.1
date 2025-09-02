import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Get full metadata for a specified attachment on a comment in a thread/post.
 *
 * This endpoint fetches full metadata for an attachment on a comment that is
 * associated with a post inside a thread. Requires authentication. Only the
 * uploader, comment author, or post author is allowed to access metadata of
 * non-deleted attachments.
 *
 * @param props - Request context, contains user, threadId, postId, commentId,
 *   and attachmentId.
 * @returns Attachment metadata if authorized.
 * @throws {Error} If not found or not authorized
 */
export async function get__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_attachments_$attachmentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const { user, threadId, postId, commentId, attachmentId } = props;

  // Fetch the attachment with contextual verification
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        comment_id: commentId,
        post_id: postId,
        deleted_at: null,
      },
      include: {
        uploadedBy: true,
        comment: {
          include: {
            createdBy: true,
          },
        },
        post: {
          include: {
            createdBy: true,
          },
        },
      },
    });
  if (!attachment) throw new Error("Attachment not found or has been deleted");

  // Authorization: Only uploader, comment author, post author
  const authorized =
    attachment.uploaded_by_id === user.id ||
    (attachment.comment && attachment.comment.created_by_id === user.id) ||
    (attachment.post && attachment.post.created_by_id === user.id);
  if (!authorized) {
    throw new Error("You do not have permission to view this attachment");
  }

  return {
    id: attachment.id,
    post_id: attachment.post_id ?? null,
    comment_id: attachment.comment_id ?? null,
    uploaded_by_id: attachment.uploaded_by_id,
    file_name: attachment.file_name,
    file_url: attachment.file_url,
    content_type: attachment.content_type,
    size_bytes: attachment.size_bytes,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : null,
  };
}

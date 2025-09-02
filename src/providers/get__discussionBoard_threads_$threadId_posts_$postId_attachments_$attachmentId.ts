import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

/**
 * Get metadata and download information for a single attachment on a post.
 *
 * Fetch the full metadata and access information for a specific file/media
 * attachment tied to a post in a thread. This endpoint is public, allowing any
 * client to retrieve metadata for a specific attachment as long as it belongs
 * to the given post, is not soft-deleted, and is not a comment attachment.
 * Returns full file info, audit, and download URI. Throws 404 if not found.
 *
 * @param props - Request parameter object
 * @param props.threadId - Unique identifier for the parent thread
 * @param props.postId - Unique identifier for the post containing this
 *   attachment
 * @param props.attachmentId - Unique identifier for the target attachment file
 * @returns Detailed metadata record for the requested post-level attachment
 * @throws {Error} When the attachment does not exist, is not associated with
 *   the post, or has been deleted/soft-deleted
 */
export async function get__discussionBoard_threads_$threadId_posts_$postId_attachments_$attachmentId(props: {
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const { threadId, postId, attachmentId } = props;

  // Only attachments for the given post/NOT comments, and not soft-deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        post_id: postId,
        comment_id: null,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new Error("Attachment not found");
  }

  return {
    id: attachment.id,
    post_id: attachment.post_id,
    comment_id: attachment.comment_id,
    uploaded_by_id: attachment.uploaded_by_id,
    file_name: attachment.file_name,
    file_url: attachment.file_url,
    content_type: attachment.content_type,
    size_bytes: attachment.size_bytes,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : null,
  } satisfies IDiscussionBoardAttachment;
}

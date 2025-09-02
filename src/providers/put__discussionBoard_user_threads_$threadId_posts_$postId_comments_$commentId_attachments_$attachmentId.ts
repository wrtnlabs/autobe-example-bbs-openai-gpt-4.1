import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update attachment metadata for a file attached to a comment in a post/thread.
 *
 * This endpoint allows the file uploader (user) to update the metadata (file
 * name or content type) of their own attachment for a comment. The attachment,
 * comment, post, and thread must all be correctly linked. Attempting to update
 * non-editable fields is forbidden. Only the uploader (user) has authorization
 * to perform this operation unless future moderator/admin support is
 * implemented.
 *
 * @param props - The input props for the operation
 * @param props.user - The authenticated user (uploader)
 * @param props.threadId - UUID of thread (parent context)
 * @param props.postId - UUID of post holding the comment
 * @param props.commentId - UUID of comment owning the attachment
 * @param props.attachmentId - UUID of attachment to update
 * @param props.body - The metadata update (file_name and/or content_type)
 * @returns The updated attachment, with all metadata and audit fields
 * @throws {Error} When attachment or resource linkage is invalid, deleted, or
 *   user unauthorized
 */
export async function put__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_attachments_$attachmentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const { user, threadId, postId, commentId, attachmentId, body } = props;

  // 1. Sanity fetch: Check attachment exists and is not deleted, matches comment
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        comment_id: commentId,
        deleted_at: null,
      },
    });
  if (!attachment)
    throw new Error(
      "Attachment not found, not linked to comment, or has been deleted.",
    );

  // 2. Ownership: Only uploader can update
  if (attachment.uploaded_by_id !== user.id) {
    throw new Error(
      "Unauthorized: Only uploader may update attachment metadata.",
    );
  }

  // 3. Validate resource path: comment is on correct post; post is in correct thread
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: { id: commentId, post_id: postId },
  });
  if (!comment) {
    throw new Error("Comment not found or does not belong to specified post.");
  }
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: { id: postId, thread_id: threadId },
  });
  if (!post) {
    throw new Error("Post not found or does not belong to specified thread.");
  }

  // 4. Only update allowed metadata fields
  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: {
      file_name: body.file_name ?? undefined,
      content_type: body.content_type ?? undefined,
    },
  });

  // 5. Return updated DTO; convert all dates properly (no Date type anywhere)
  return {
    id: updated.id,
    post_id: updated.post_id ?? null,
    comment_id: updated.comment_id ?? null,
    uploaded_by_id: updated.uploaded_by_id,
    file_name: updated.file_name,
    file_url: updated.file_url,
    content_type: updated.content_type,
    size_bytes: updated.size_bytes,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

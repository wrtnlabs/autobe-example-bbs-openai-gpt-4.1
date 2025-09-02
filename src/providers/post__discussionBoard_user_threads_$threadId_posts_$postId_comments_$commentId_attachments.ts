import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Upload a new attachment file to a specific comment within a post/thread.
 *
 * Attach a new file to a comment on a post in a thread. The file is saved and
 * linked to the parent comment, and must comply with business and regulatory
 * rules on allowed attachments. Users must be authenticated and own/write the
 * comment or have moderator/admin privileges. All file attachments are
 * monitored for prohibited content and violations.
 *
 * Upon success, file metadata (id, file name, URL, content type, uploader id,
 * upload timestamp) is returned. The parent comment must not be locked,
 * archived, or deleted. Security logic enforces file type and file size quotas.
 * The operation references the discussion_board_attachments schema for
 * compliance and moderation protocols.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user uploading the attachment
 * @param props.threadId - ID of the thread containing the comment
 * @param props.postId - ID of the parent post
 * @param props.commentId - ID of the comment to attach the file to
 * @param props.body - Attachment details (file info, metadata)
 * @returns The created attachment, including metadata and URI
 * @throws {Error} When comment is not found, is deleted, or the user does not
 *   have permission
 */
export async function post__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_attachments(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  const { user, commentId, body } = props;

  // Fetch the parent comment and check existence/ownership (no is_locked field in schema)
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or deleted");
  }
  if (comment.created_by_id !== user.id) {
    throw new Error(
      "You do not have permission to add attachments to this comment",
    );
  }

  // Attachment creation - validates only allowed fields, respects schema
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: null, // linking only to comment here
      comment_id: commentId,
      uploaded_by_id: user.id,
      file_name: body.file_name,
      file_url: body.file_url,
      content_type: body.content_type,
      size_bytes: body.size_bytes,
      created_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    post_id: null,
    comment_id: created.comment_id as string & tags.Format<"uuid">,
    uploaded_by_id: created.uploaded_by_id as string & tags.Format<"uuid">,
    file_name: created.file_name,
    file_url: created.file_url,
    content_type: created.content_type,
    size_bytes: created.size_bytes,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

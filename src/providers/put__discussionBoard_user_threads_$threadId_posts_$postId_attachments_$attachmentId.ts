import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update metadata for a specific attachment on a post within a thread.
 *
 * This endpoint allows an authenticated user (the uploader) to update metadata
 * (file name/content type) for a specific attachment belonging to the post,
 * provided all permissions and content state checks pass. Only supports
 * file_name/content_type updates. All changes are authorized, business
 * constraints and soft/hard deletion are enforced, and full schema alignment is
 * maintained.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user (must be uploader of the file)
 * @param props.threadId - ID of the thread containing the post
 * @param props.postId - ID of the post that owns the attachment
 * @param props.attachmentId - ID of the attachment to update
 * @param props.body - Partial metadata ({ file_name, content_type })
 * @returns Updated IDiscussionBoardAttachment record
 * @throws {Error} If attachment is not found, not owned by user, soft deleted,
 *   or locked/archived content
 */
export async function put__discussionBoard_user_threads_$threadId_posts_$postId_attachments_$attachmentId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const { user, threadId, postId, attachmentId, body } = props;

  // 1. Fetch the attachment and ensure it is not soft-deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: attachmentId },
    });
  if (!attachment || attachment.deleted_at !== null)
    throw new Error("Attachment not found or has been deleted");

  // 2. Check the attachment belongs to the provided post
  if (attachment.post_id !== postId)
    throw new Error("Attachment does not belong to this post");

  // 3. Fetch the post and check post state
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post || post.thread_id !== threadId || post.deleted_at !== null)
    throw new Error("Post not found or does not match thread or is deleted");
  if (post.is_locked)
    throw new Error("Cannot edit attachments: post is locked");

  // 4. Fetch the parent thread and check thread state
  const thread = await MyGlobal.prisma.discussion_board_threads.findUnique({
    where: { id: threadId },
  });
  if (!thread || thread.deleted_at !== null)
    throw new Error("Thread not found or is deleted");
  if (thread.is_locked || thread.is_archived)
    throw new Error("Cannot edit attachments: thread is locked or archived");

  // 5. Authorization: user must be attachment uploader
  if (attachment.uploaded_by_id !== user.id)
    throw new Error("You do not have permission to update this attachment");

  // 6. Update allowed metadata fields only
  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: {
      file_name: body.file_name ?? undefined,
      content_type: body.content_type ?? undefined,
    },
  });

  // 7. Return data mapped as IDiscussionBoardAttachment
  return {
    id: updated.id as string & tags.Format<"uuid">,
    post_id: updated.post_id as (string & tags.Format<"uuid">) | null,
    comment_id: updated.comment_id as (string & tags.Format<"uuid">) | null,
    uploaded_by_id: updated.uploaded_by_id as string & tags.Format<"uuid">,
    file_name: updated.file_name,
    file_url: updated.file_url,
    content_type: updated.content_type,
    size_bytes: updated.size_bytes,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

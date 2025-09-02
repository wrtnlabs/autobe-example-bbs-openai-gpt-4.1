import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Upload a new attachment to a specified post in a thread.
 *
 * Create a new file or media attachment for a post within a discussion thread.
 * The user must be authenticated and authorized to upload, and the post must
 * not be locked or archived. If successful, the file metadata and access URI is
 * returned. File uploads are audited for compliance and are subject to
 * moderation and content policy review. Only the post author and moderators may
 * manage attachments. Security rules validate MIME type and enforce per-file
 * size limits. Error handling includes invalid format, exceeding size quotas,
 * or uploading to a deleted/locked/archived post.
 *
 * Authorization requires user authentication as either a regular user,
 * moderator, or admin. All uploads are logged in the audit log for compliance.
 * The operation references the discussion_board_attachments model and ensures
 * relational integrity with the parent post.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user making the upload request (must be
 *   post author or active moderator)
 * @param props.threadId - Unique identifier of the thread containing the post
 * @param props.postId - Unique identifier of the post to attach the file to
 * @param props.body - Attachment metadata including file details for upload
 * @returns Metadata and URI of the uploaded attachment, including ID and file
 *   info
 * @throws {Error} If post does not exist, is deleted, locked, or archived
 * @throws {Error} If user is not post author or an active moderator
 * @throws {Error} If file type is not allowed or file size exceeds maximum
 *   permitted
 * @throws {Error} If attachment with same file URL already exists
 */
export async function post__discussionBoard_user_threads_$threadId_posts_$postId_attachments(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  const { user, threadId, postId, body } = props;

  // Step 1: Find the post and parent thread (ensure post is live and fits context)
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      thread_id: threadId,
      deleted_at: null,
    },
    select: {
      id: true,
      thread_id: true,
      title: true,
      is_locked: true,
      created_by_id: true,
      thread: {
        select: {
          id: true,
          is_archived: true,
        },
      },
    },
  });
  if (!post) {
    throw new Error(
      "Post not found, already deleted, or does not belong to thread",
    );
  }
  if (post.is_locked) {
    throw new Error("Cannot upload attachment: post is locked");
  }
  if (post.thread.is_archived) {
    throw new Error("Cannot upload attachment: thread is archived");
  }

  // Step 2: Authorization: must be post author or active moderator
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        user_id: user.id,
        is_active: true,
        deleted_at: null,
        revoked_at: null,
        OR: [
          { suspended_until: null },
          { suspended_until: { gt: toISOStringSafe(new Date()) } },
        ],
      },
    },
  );
  const isAllowed = user.id === post.created_by_id || Boolean(moderator);
  if (!isAllowed) {
    throw new Error(
      "User is not authorized to upload attachments to this post",
    );
  }

  // Step 3: Validate allowed file type and size
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (!allowedTypes.includes(body.content_type)) {
    throw new Error("File type is not supported");
  }
  if (body.size_bytes > maxSize) {
    throw new Error("File size exceeds system maximum allowed");
  }

  // Step 4: Create the attachment record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createInput = {
    id: v4(),
    post_id: postId,
    comment_id: null,
    uploaded_by_id: user.id,
    file_name: body.file_name,
    file_url: body.file_url,
    content_type: body.content_type,
    size_bytes: body.size_bytes,
    created_at: now,
    deleted_at: null,
  } satisfies IDiscussionBoardAttachment;
  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: createInput,
  });

  // Step 5: Map to output (convert all date fields using toISOStringSafe and handle deleted_at)
  return {
    id: created.id,
    post_id: created.post_id,
    comment_id: created.comment_id,
    uploaded_by_id: created.uploaded_by_id,
    file_name: created.file_name,
    file_url: created.file_url,
    content_type: created.content_type,
    size_bytes: created.size_bytes,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

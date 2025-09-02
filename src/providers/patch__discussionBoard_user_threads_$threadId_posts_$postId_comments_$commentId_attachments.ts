import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * List and search attachments linked to a specific comment on a post in a
 * thread.
 *
 * Retrieves a paginated, filterable, and sortable list of file or media
 * attachments for a specific comment on a post within a thread. This endpoint
 * supports advanced filtering by file type, uploader, or fuzzy file name, and
 * allows sorting and pagination for efficient navigation in threads with many
 * attachments. Only users with access to the comment (author, moderators,
 * admins) can view attachment metadata that isn't public.
 *
 * Relies on the discussion_board_attachments schema, especially leveraging the
 * comment_id field to filter results. Filtering criteria and pagination must be
 * provided in the request body. Useful for users wishing to see all files
 * attached to a comment, for moderation review, or for managing their own
 * uploads.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.threadId - UUID of the thread containing the comment
 * @param props.postId - UUID of the post containing the comment
 * @param props.commentId - UUID of the comment whose attachments are being
 *   queried
 * @param props.body - Filtering, sorting, and pagination options for attachment
 *   listing
 * @returns Paginated list of attachments for the target comment
 * @throws {Error} When the user is not authorized to view these attachments
 */
export async function patch__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_attachments(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment> {
  const { user, commentId, body } = props;

  // Authorization: ensure user is allowed to list/comment attachments
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: commentId },
    });
  const isAuthor = comment.created_by_id === user.id;

  // Must check moderator privilege (assigned, active, not soft-deleted)
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: { user_id: user.id, is_active: true, deleted_at: null },
    },
  );
  const isModerator = !!moderator;

  // Must check admin privilege (assigned, active, not soft-deleted)
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { user_id: user.id, is_active: true, deleted_at: null },
  });
  const isAdmin = !!admin;

  if (!isAuthor && !isModerator && !isAdmin) {
    throw new Error(
      "Unauthorized: Only the author, moderators, or admins may view attachments on this comment",
    );
  }

  // Pagination and sorting
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const sortParts = body.sort ? body.sort.trim().split(/\s+/) : [];
  const sortField = sortParts[0] ?? "created_at";
  const sortOrder = sortParts[1] === "asc" ? "asc" : "desc";

  // Where clause with advanced filtering
  const where = {
    comment_id: commentId,
    deleted_at: null,
    ...(body.file_name !== undefined &&
      body.file_name !== null &&
      body.file_name.length > 0 && {
        file_name: { contains: body.file_name, mode: "insensitive" as const },
      }),
    ...(body.content_type !== undefined &&
      body.content_type !== null &&
      body.content_type.length > 0 && {
        content_type: body.content_type,
      }),
    ...(body.uploaded_by_id !== undefined &&
      body.uploaded_by_id !== null && {
        uploaded_by_id: body.uploaded_by_id,
      }),
  };

  // Fetch attachments and total count concurrently
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({ where }),
  ]);

  const data = attachments.map((a) => ({
    id: a.id,
    post_id: a.post_id ?? null,
    comment_id: a.comment_id ?? null,
    uploaded_by_id: a.uploaded_by_id,
    file_name: a.file_name,
    file_url: a.file_url,
    content_type: a.content_type,
    size_bytes: a.size_bytes,
    created_at: toISOStringSafe(a.created_at),
    deleted_at: a.deleted_at ? toISOStringSafe(a.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

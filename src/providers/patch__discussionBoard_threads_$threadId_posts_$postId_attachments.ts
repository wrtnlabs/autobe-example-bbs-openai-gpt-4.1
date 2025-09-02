import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Retrieve a paginated, filtered list of file/media attachments for a post.
 *
 * Obtain a filtered, paginated list of attachments for a specific post in a
 * thread (not for comment-attached files). The API supports filtering by file
 * name, uploader, content type, and range. Sort and pagination allow efficient
 * handling for posts with multiple media or file uploads. Only non-deleted
 * (deleted_at is null) attachments are shown to normal users. Moderators/admins
 * may view soft-deleted files for audit purposes. Use cases include user file
 * management, moderator content review, and compliance evidence download.
 * Errors may arise if the post does not exist or user lacks permission to view
 * certain attachment types.
 *
 * @param props - Request properties including:
 *
 *   - ThreadId: UUID of the parent thread
 *   - PostId: UUID of the parent post
 *   - Body: IDiscussionBoardAttachment.IRequest filters, pagination, sort
 *
 * @returns Paginated summary of non-deleted attachments for the provided post
 * @throws {Error} When the post does not exist or user lacks permission
 */
export async function patch__discussionBoard_threads_$threadId_posts_$postId_attachments(props: {
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const { threadId, postId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Acceptable sort columns (must match schema fields)
  const SORTABLE_COLUMNS = [
    "created_at",
    "file_name",
    "content_type",
    "size_bytes",
  ] as const;
  let sortField: (typeof SORTABLE_COLUMNS)[number] = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const parts = body.sort.trim().split(/\s+/);
    const [requestedField, requestedOrder] =
      parts.length === 2 ? [parts[0], parts[1]] : [parts[0], "desc"];
    if (
      SORTABLE_COLUMNS.includes(
        requestedField as (typeof SORTABLE_COLUMNS)[number],
      ) &&
      (requestedOrder === "asc" || requestedOrder === "desc")
    ) {
      sortField = requestedField as (typeof SORTABLE_COLUMNS)[number];
      sortOrder = requestedOrder as "asc" | "desc";
    }
  }

  // Filtering: Only attachments on this post, not on comments
  // Soft delete excluded by default
  const where = {
    post_id: postId,
    comment_id: null,
    deleted_at: null,
    ...(body.file_name && {
      file_name: { contains: body.file_name, mode: "insensitive" as const },
    }),
    ...(body.uploaded_by_id && { uploaded_by_id: body.uploaded_by_id }),
    ...(body.content_type && { content_type: body.content_type }),
  };

  // Pagination (brand conversion via Number())
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Use Promise.all for concurrent DB queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      orderBy: { [sortField]: sortOrder as "asc" | "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(limit) > 0 ? Math.ceil(total / Number(limit)) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      file_name: row.file_name,
      file_url: row.file_url,
      content_type: row.content_type,
      size_bytes: row.size_bytes,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}

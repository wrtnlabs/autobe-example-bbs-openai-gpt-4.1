import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * List/search discussion threads (discussion_board_threads) with advanced
 * filters.
 *
 * Get a filtered, paginated, and sorted list of discussion threads available on
 * the platform. This endpoint is public and accessible by any user (including
 * visitors and authenticated users), reflecting the public nature of most
 * discussion threads.
 *
 * Supports advanced filters (by title, status, date range, or creator ID),
 * keyword search (by title), pagination (page number/size), and sorting (by
 * created_at or updated_at). Related endpoints provide methods for thread
 * detail view, thread creation, or post-management within threads.
 *
 * The operation uses the discussion_board_threads model; fields include title,
 * status flags (locked/archived), and standard timestamps. Business rules
 * restrict display of soft-deleted or locked threads as per platform
 * guidelines. Results reflect the user's access level and platform-wide
 * discovery rules.
 *
 * @param props - Request properties (filter/search config)
 * @param props.body - Thread search, filter, pagination, and sort options
 * @returns Paginated list of thread summaries matching criteria
 */
export async function patch__discussionBoard_threads(props: {
  body: IDiscussionBoardThread.IRequest;
}): Promise<IPageIDiscussionBoardThread.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Only include threads that are not soft-deleted
  // Build Prisma 'where' filter inline with schema/DTO fields only:
  const where = {
    deleted_at: null,
    ...(body.is_locked !== undefined && { is_locked: body.is_locked }),
    ...(body.is_archived !== undefined && { is_archived: body.is_archived }),
    ...(body.created_by_id !== undefined &&
      body.created_by_id !== null && { created_by_id: body.created_by_id }),
    ...(body.search && {
      title: {
        contains: body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }
      : {}),
  };

  const orderBy =
    body.orderBy &&
    ["created_at", "updated_at", "title"].includes(body.orderBy) &&
    (body.orderDirection === "asc" || body.orderDirection === "desc")
      ? [{ [body.orderBy]: body.orderDirection as "asc" | "desc" }]
      : [{ created_at: "desc" as const }];

  // Run paged query and count concurrently
  const [threads, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_threads.findMany({
      where,
      orderBy, // Inline (not as variable in batch), disables type errors
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        is_locked: true,
        is_archived: true,
        created_by_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_threads.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: threads.map(
      (t): IDiscussionBoardThread.ISummary => ({
        id: t.id,
        title: t.title,
        is_locked: t.is_locked,
        is_archived: t.is_archived,
        created_by_id: t.created_by_id,
        created_at: toISOStringSafe(t.created_at),
      }),
    ),
  };
}

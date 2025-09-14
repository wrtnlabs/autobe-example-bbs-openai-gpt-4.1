import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";
import { IPageIDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPostTag";

/**
 * List tags assigned to a specific discussBoard post, with search and
 * pagination.
 *
 * This endpoint fetches a paginated, filterable list of tag assignments for a
 * single post, driven by the discuss_board_post_tags table. Supports filtering
 * by tag UUID, assignment date range, and provides ordering and pagination.
 * This operation is available to all users and provides flexible search and
 * management in tag UIs. Returns standardized DTOs in a paginated format.
 *
 * @param props - Object containing path param and request for pagination &
 *   filtering
 * @param props.postId - Target post's UUID
 * @param props.body - Request body with filter, sort, and page options
 *   (IDiscussBoardPostTag.IRequest)
 * @returns Paginated, filtered tag assignment summary list
 *   (IPageIDiscussBoardPostTag.ISummary)
 */
export async function patch__discussBoard_posts_$postId_tags(props: {
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostTag.IRequest;
}): Promise<IPageIDiscussBoardPostTag.ISummary> {
  const { postId, body } = props;

  // Safe numeric values for page/limit with brands removed as needed
  const page = body.page && Number(body.page) > 0 ? Number(body.page) : 1;
  const limit =
    body.limit && Number(body.limit) > 0
      ? Math.min(50, Number(body.limit))
      : 20;

  // Inline where filter: always by post_id, optionally tag_id and assigned_from/to
  const where = {
    post_id: postId,
    ...(body.tag_id !== undefined &&
      body.tag_id !== null && { tag_id: body.tag_id }),
    ...((body.assigned_from !== undefined && body.assigned_from !== null) ||
    (body.assigned_to !== undefined && body.assigned_to !== null)
      ? {
          created_at: {
            ...(body.assigned_from !== undefined &&
              body.assigned_from !== null && {
                gte: body.assigned_from,
              }),
            ...(body.assigned_to !== undefined &&
              body.assigned_to !== null && {
                lte: body.assigned_to,
              }),
          },
        }
      : {}),
  };

  // Only support created_at as sort field
  const sortField = body.sort_by === "created_at" ? "created_at" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Run count and data queries in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discuss_board_post_tags.count({ where }),
    MyGlobal.prisma.discuss_board_post_tags.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      tag_id: row.tag_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated, filterable list of discussion board tags.
 *
 * Fetch a paginated, searchable, and filterable list of tags for use in
 * category and post management. Tags power faceted search, user suggestions,
 * and advanced moderation workflows. The API enables filtering on tag label and
 * is_active status, with ordering for user-facing or moderation needs.
 *
 * Used both by admin users for backend tag management and by end-users for tag
 * browsing or selection. Soft-deleted tags are excluded unless explicitly
 * included by business logic. Supports growth and evolution of tag taxonomy.
 *
 * @param props - Request properties
 * @param props.admin - Payload for the authenticated admin session
 * @param props.body - Filtering, search, and pagination options
 * @returns Paginated list of tag summaries matching the query
 * @throws {Error} If not authorized as admin, or if a database error occurs
 */
export async function patch__discussionBoard_admin_tags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const { admin, body } = props;

  // MANDATORY: Authorization check
  if (!admin || admin.type !== "admin") throw new Error("Unauthorized");

  // Pagination defaults (page min 1, limit min 1, default 20)
  const page = body.page !== undefined && body.page > 0 ? body.page : 1;
  const limit = body.limit !== undefined && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where = {
    deleted_at: null as null,
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { label: { contains: body.search, mode: "insensitive" as const } },
            {
              description: {
                contains: body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  // Build orderBy (MUST be inline)
  const orderBy =
    body.sort_by && (body.sort_by === "label" || body.sort_by === "created_at")
      ? [
          {
            [body.sort_by]:
              body.sort_dir === "desc" ? ("desc" as const) : ("asc" as const),
          },
        ]
      : [{ label: "asc" as const }];

  // Fetch tags & count in parallel (no intermediate variables for params)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_tags.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        label: true,
        is_active: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_tags.count({ where }),
  ]);

  // Map/convert DB records to ISummary objects (convert to ISO string)
  const data = rows.map((row) => ({
    id: row.id,
    label: row.label,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Build the pagination object
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}

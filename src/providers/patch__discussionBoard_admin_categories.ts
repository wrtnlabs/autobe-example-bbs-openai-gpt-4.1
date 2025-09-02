import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated and filterable list of discussion board categories.
 *
 * This operation retrieves a paginated list of discussion board categories with
 * advanced filtering, searching, and sorting options for administrative
 * moderation or management interfaces. Supports filtering on `is_active`, text
 * search (name/description), arbitrary sort order, and strict soft-delete
 * enforcement.
 *
 * @param props - Request object
 * @param props.admin - Authenticated admin user invoking this endpoint
 * @param props.body - Filtering, search, sort, and pagination criteria
 * @returns Paginated result set of category summaries matching the request
 *   criteria, suitable for index/list display
 * @throws {Error} If the authenticated admin is not authorized
 */
export async function patch__discussionBoard_admin_categories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardCategory.IRequest;
}): Promise<IPageIDiscussionBoardCategory.ISummary> {
  const { admin, body } = props;
  // Authorization is enforced via admin payload presence and prior middleware

  // Safe calculation of pagination parameters (defaults: page=1, limit=20)
  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Construct where clause: enforce soft delete, search (name/description), is_active filter
  const where = {
    deleted_at: null,
    ...(body.search
      ? {
          OR: [
            { name: { contains: body.search, mode: "insensitive" as const } },
            {
              description: {
                contains: body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
  };

  // Sorting: sort_by ("name", "sort_order", "created_at"), direction; fallback: sort_order desc
  const orderBy = body.sort_by
    ? { [body.sort_by]: body.sort_dir === "asc" ? "asc" : "desc" }
    : { sort_order: "desc" as const };

  // Query paged rows and total count in parallel for best efficiency
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_categories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        is_active: true,
        sort_order: true,
      },
    }),
    MyGlobal.prisma.discussion_board_categories.count({ where }),
  ]);

  // Map to API summary (id, name, is_active, sort_order)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      is_active: row.is_active,
      sort_order: row.sort_order,
    })),
  };
}

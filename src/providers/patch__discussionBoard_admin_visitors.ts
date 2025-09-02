import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import { IPageIDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVisitor";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardVisitorISummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitorISummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated and searchable list of visitor accounts registered in
 * the system.
 *
 * This endpoint provides viewing, searching, and filter capabilities for
 * auditing, anti-abuse, or operational analytics purposes. Accessible only to
 * admin users as visitor info is considered sensitive even without PII.
 *
 * The result is a summary of visitor records, filtered and paginated according
 * to the query parameters defined in the request body. This endpoint references
 * the discussion_board_visitors table and leverages its metadata columns for
 * filtering and audit.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin session (AdminPayload)
 * @param props.body - Visitor search, filter, pagination, and sort options
 *   (IDiscussionBoardVisitor.IRequest)
 * @returns Paginated IPageIDiscussionBoardVisitor.ISummary object (array of
 *   summary visitor records with pagination metadata)
 * @throws {Error} When admin authentication is missing or unauthorized (by
 *   decorator/provider)
 */
export async function patch__discussionBoard_admin_visitors(props: {
  admin: AdminPayload;
  body: IDiscussionBoardVisitor.IRequest;
}): Promise<IPageIDiscussionBoardVisitor.ISummary> {
  const { admin, body } = props;

  // Allowed sort fields matching schema columns
  const allowedSortFields = [
    "id",
    "visitor_token",
    "ip_address",
    "user_agent",
    "created_at",
    "updated_at",
  ];

  // Allow only listed fields as sort_by
  const sort_by =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";

  // Only "asc" or "desc" allowed for sort_dir
  const sort_dir =
    body.sort_dir === "asc" || body.sort_dir === "desc"
      ? body.sort_dir
      : "desc";

  const page = Number(body.page) || 1;
  const limit = Number(body.limit) || 20;

  // Build dynamic where clause
  const where = {
    deleted_at: null,
    ...(body.ip_address !== undefined &&
      body.ip_address !== null && {
        ip_address: body.ip_address,
      }),
    ...(body.user_agent !== undefined &&
      body.user_agent !== null && {
        user_agent: body.user_agent,
      }),
    ...(body.from !== undefined &&
    body.from !== null &&
    body.to !== undefined &&
    body.to !== null
      ? {
          created_at: { gte: body.from, lte: body.to },
        }
      : body.from !== undefined && body.from !== null
        ? { created_at: { gte: body.from } }
        : body.to !== undefined && body.to !== null
          ? { created_at: { lte: body.to } }
          : {}),
  };

  // Always define orderBy inline to avoid TS2464 errors; enforce value types as const
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_visitors.findMany({
      where,
      orderBy: { [sort_by]: sort_dir as "asc" | "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_visitors.count({
      where,
    }),
  ]);

  // Map to API DTO - created_at as string & tags.Format<'date-time'>
  const data: IDiscussionBoardVisitorISummary[] = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    visitor_token: row.visitor_token,
    created_at: toISOStringSafe(row.created_at),
    user_agent: row.user_agent ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}

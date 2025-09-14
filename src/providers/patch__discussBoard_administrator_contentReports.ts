import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { IPageIDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardContentReport";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve a list of content reports (discuss_board_content_reports
 * table).
 *
 * Retrieves a paginated collection of content reports submitted by members for
 * moderation purposes. This endpoint supports filtering by content type
 * (post/comment), reporter, status, date range, and full-text reason search,
 * with pagination and sorting. Only administrators or moderators can access all
 * reports. Returns summaries suitable for moderation dashboard display.
 *
 * @param props - Object containing the authenticated administrator and
 *   search/filter parameters
 * @param props.administrator - AdministratorPayload (JWT payload, validated by
 *   decorator)
 * @param props.body - IDiscussBoardContentReport.IRequest (search/filter,
 *   pagination, and sorting)
 * @returns IPageIDiscussBoardContentReport.ISummary - Paginated result of
 *   content report summaries
 * @throws {Error} If a database or type error occurs
 */
export async function patch__discussBoard_administrator_contentReports(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardContentReport.IRequest;
}): Promise<IPageIDiscussBoardContentReport.ISummary> {
  const { body } = props;

  // Pagination defaults, ensure bounded
  const current = body.page && body.page > 0 ? Number(body.page) : 1;
  let limit = 20;
  if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 100) {
    limit = Number(body.limit);
  }
  const skip = (current - 1) * limit;

  // Build where clause (null/undefined defense, never include undefined fields)
  const where = {
    deleted_at: null,
    ...(body.reporter_member_id !== undefined &&
      body.reporter_member_id !== null && {
        reporter_member_id: body.reporter_member_id,
      }),
    ...(body.content_type !== undefined &&
      body.content_type !== null && {
        content_type: body.content_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null && {
        reason: {
          contains: body.reason,
        },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // Sorting handling: only allow certain keys, fallback to created_at desc
  let orderBy: { [column: string]: "asc" | "desc" } = { created_at: "desc" };
  if (typeof body.sort === "string") {
    const parts = body.sort.split(":");
    if (parts.length === 2) {
      const col = parts[0].trim();
      const dir = parts[1].toLowerCase() === "asc" ? "asc" : "desc";
      if (["created_at", "updated_at", "status", "reason"].includes(col)) {
        orderBy = { [col]: dir };
      }
    }
  }

  // Query database in parallel for data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_content_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_content_reports.count({ where }),
  ]);

  // Map DB rows to ISummary, handle all nullable and date/datetime conversion
  const data = rows.map((row) => ({
    id: row.id,
    content_type: row.content_type,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    reporter_member_id: row.reporter_member_id,
    content_post_id: row.content_post_id ?? null,
    content_comment_id: row.content_comment_id ?? null,
    reason: row.reason,
    moderation_action_id: row.moderation_action_id ?? null,
  }));

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
